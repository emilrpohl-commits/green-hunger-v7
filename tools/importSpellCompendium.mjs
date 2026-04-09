#!/usr/bin/env node
/**
 * Spell compendium importer/normalizer.
 *
 * Usage examples:
 *   node tools/importSpellCompendium.mjs --dry-run
 *   node tools/importSpellCompendium.mjs --scope used-by-party --write-files
 *   node tools/importSpellCompendium.mjs --scope all --write-db
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { PLAYER_CHARACTERS } from '../shared/content/playerCharacters.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SOURCE_JSON = path.join(ROOT, 'docs', 'Green_Hunger_Spells_App_Ready.json')
const OUT_NORMALIZED = path.join(ROOT, 'docs', 'Green_Hunger_Spells_Normalized.json')
const OUT_REPORT = path.join(ROOT, 'docs', 'spells_import_report.json')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const args = new Set(process.argv.slice(2))
const isDryRun = args.has('--dry-run')
const writeDb = args.has('--write-db')
const writeFiles = args.has('--write-files') || isDryRun
const scope = args.has('--scope-all') || args.has('--scope=all') ? 'all' : 'used-by-party'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function toSpellId(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseSaveAbility(save) {
  if (!save || typeof save !== 'string') return null
  const match = save.toUpperCase().match(/\b(STR|DEX|CON|INT|WIS|CHA)\b/)
  return match ? match[1] : null
}

function parseAttackType(attack) {
  const value = trimString(attack)
  if (!value) return null
  if (/melee/i.test(value)) return 'melee'
  if (/ranged/i.test(value)) return 'ranged'
  return null
}

function parseDamageType(damageEffect) {
  const value = trimString(damageEffect)
  if (!value) return null
  const upper = value.toUpperCase()
  const known = ['ACID', 'BLUDGEONING', 'COLD', 'FIRE', 'FORCE', 'LIGHTNING', 'NECROTIC', 'PIERCING', 'POISON', 'PSYCHIC', 'RADIANT', 'SLASHING', 'THUNDER']
  const found = known.find((k) => upper.includes(k))
  return found ? `${found[0]}${found.slice(1).toLowerCase()}` : null
}

function parseDiceSeries(details) {
  const text = typeof details === 'string' ? details : ''
  const matches = [...text.matchAll(/(\d+)d(\d+)/gi)]
  return matches.map((m) => ({ count: Number(m[1]), sides: Number(m[2]) }))
}

function parseScaling(details) {
  const text = typeof details === 'string' ? details : ''
  const spellLevelPattern = /(\+?\d+d\d+|\+?\d+)\s+per slot level above/i
  const cantripPattern = /increases by (\d+d\d+) when you reach 5th level/i
  const dice = parseDiceSeries(text)
  return {
    has_spell_level_scaling: spellLevelPattern.test(text),
    has_cantrip_scaling: cantripPattern.test(text),
    dice_mentions: dice,
    confidence: dice.length > 0 ? 'medium' : 'low',
  }
}

function inferResolutionType(entry) {
  const attack = trimString(entry.attack)
  const save = trimString(entry.save)
  const damage = parseDamageType(entry.damageEffect)
  const details = typeof entry.details === 'string' ? entry.details.toLowerCase() : ''
  const effect = trimString(entry.damageEffect)?.toLowerCase() || ''

  if (/heal|regain hit points|restore hit points/.test(details) || effect.includes('healing')) return 'heal'
  if (attack && damage) return 'attack'
  if (save && damage) return 'save'
  if (!attack && !save && /auto-hit|automatically hits|magic missile/.test(details)) return 'auto'
  if (/summon|teleport|create|control|charmed|buff|detection|communication/.test(effect)) return 'utility'
  if (!attack && !save && !damage) return 'utility'
  return 'special'
}

function inferMechanicFromResolution(resolutionType) {
  switch (resolutionType) {
    case 'attack':
      return 'attack'
    case 'save':
      return 'save'
    case 'heal':
      return 'heal'
    case 'auto':
      return 'auto'
    case 'utility':
      return 'utility'
    default:
      return 'utility'
  }
}

function inferTargetFromMode(targetMode) {
  if (targetMode === 'self') return 'self'
  if (targetMode === 'single') return 'enemy'
  if (targetMode === 'multi_select' || targetMode === 'area' || targetMode === 'area_all' || targetMode === 'area_selective') return 'enemy'
  return null
}

function buildNormalized(entry) {
  const spellId = trimString(entry.spellId) || toSpellId(entry.name)
  const name = trimString(entry.name)
  const details = trimString(entry.details) || ''
  const saveAbility = parseSaveAbility(entry.save)
  const attackType = parseAttackType(entry.attack)
  const damageType = parseDamageType(entry.damageEffect)
  const targetMode = trimString(entry?.targeting?.targetMode) || 'special'
  const resolutionType = inferResolutionType(entry)
  const scaling = parseScaling(details)
  const diceMentions = scaling.dice_mentions

  const row = {
    spell_id: spellId,
    campaign_id: null,
    name,
    level: Number(entry.level) || 0,
    school: trimString(entry.school) || null,
    casting_time: trimString(entry.castingTime) || null,
    range: trimString(entry.range) || null,
    components: { V: false, S: false, M: null },
    duration: trimString(entry.duration) || null,
    ritual: !!entry.ritual,
    concentration: !!entry.concentration,
    description: details,
    higher_level_effect: details.includes('At Higher Levels') ? details.split(/At Higher Levels[.:]?/i)[1]?.trim() || '' : '',
    damage_dice: diceMentions[0] ? `${diceMentions[0].count}d${diceMentions[0].sides}` : null,
    damage_type: damageType,
    healing_dice: inferResolutionType(entry) === 'heal' && diceMentions[0] ? `${diceMentions[0].count}d${diceMentions[0].sides}` : null,
    save_type: saveAbility,
    attack_type: attackType,
    resolution_type: resolutionType,
    target_mode: targetMode,
    save_ability: saveAbility,
    area: {
      shape: trimString(entry?.targeting?.areaShape) || null,
      size: trimString(entry?.targeting?.areaSize) || trimString(entry?.area) || null,
      origin: trimString(entry?.targeting?.origin) || null,
    },
    scaling,
    rules_json: {
      source_spell_id: trimString(entry.spellId) || null,
      attack_label: trimString(entry.attack) || null,
      save_label: trimString(entry.save) || null,
      damage_effect: trimString(entry.damageEffect) || null,
      targeting: entry.targeting || {},
      source_link: trimString(entry.link) || null,
      source_name: trimString(entry.source) || null,
      inferred_mechanic: inferMechanicFromResolution(resolutionType),
      inferred_target: inferTargetFromMode(targetMode),
      needs_manual_resolution: resolutionType === 'special' || targetMode === 'special',
      parse_confidence: scaling.confidence,
    },
    tags: [],
    source: trimString(entry.source) || null,
    source_index: spellId,
    ruleset: '2024',
    classes: [],
    notes: null,
    updated_at: new Date().toISOString(),
  }

  return {
    spellId,
    rawRow: {
      spell_id: spellId,
      source_file: 'docs/Green_Hunger_Spells_App_Ready.json',
      raw_json: entry,
      normalized_hash: crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex'),
      updated_at: new Date().toISOString(),
    },
    spellRow: row,
  }
}

function buildPartySpellIdSet() {
  const ids = ['dorothea', 'kanan', 'danil', 'ilya']
  const set = new Set()
  for (const cid of ids) {
    const char = PLAYER_CHARACTERS[cid]
    if (!char?.spells) continue
    for (const spells of Object.values(char.spells)) {
      for (const spell of toArray(spells)) {
        set.add(toSpellId(spell.name))
      }
    }
  }
  return set
}

async function postgrestUpsert(table, rows, conflictColumn) {
  if (!rows.length) return { status: 'skipped', count: 0 }
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table} upsert failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  return { status: 'ok', count: data.length }
}

async function run() {
  const source = JSON.parse(await fs.readFile(SOURCE_JSON, 'utf8'))
  const partySpellIds = buildPartySpellIdSet()

  const normalized = source.map(buildNormalized)
  const scoped = scope === 'all'
    ? normalized
    : normalized.filter((n) => partySpellIds.has(n.spellId))

  const report = {
    source_count: source.length,
    scoped_count: scoped.length,
    scope,
    counts: {
      resolution_type: {},
      target_mode: {},
      manual_resolution: 0,
    },
  }

  for (const row of scoped.map((s) => s.spellRow)) {
    report.counts.resolution_type[row.resolution_type] = (report.counts.resolution_type[row.resolution_type] || 0) + 1
    report.counts.target_mode[row.target_mode] = (report.counts.target_mode[row.target_mode] || 0) + 1
    if (row.rules_json?.needs_manual_resolution) report.counts.manual_resolution += 1
  }

  if (writeFiles) {
    await fs.writeFile(OUT_NORMALIZED, JSON.stringify(scoped.map((s) => s.spellRow), null, 2))
    await fs.writeFile(OUT_REPORT, JSON.stringify(report, null, 2))
  }

  if (writeDb && !isDryRun) {
    const rawRows = scoped.map((s) => s.rawRow)
    const spellRows = scoped.map((s) => s.spellRow)
    const rawResult = await postgrestUpsert('spells_raw', rawRows, 'spell_id')
    const spellResult = await postgrestUpsert('spells', spellRows, 'spell_id')
    report.db = { spells_raw: rawResult, spells: spellResult }
  }

  console.log(JSON.stringify(report, null, 2))
}

run().catch((err) => {
  console.error(err.message)
  process.exitCode = 1
})
