#!/usr/bin/env node
/**
 * Import full spell compendium from DnD_5e_Spells_with_Targeting.xlsx (or similar) into public.spell_compendium.
 *
 * Idempotent: upserts on spell_id (stable: name + level + source).
 *
 * Setup:
 *   cd tools && npm install
 *
 * Usage:
 *   node importSpellCompendium.mjs --xlsx ../data/DnD_5e_Spells_with_Targeting.xlsx --dry-run
 *   node importSpellCompendium.mjs --xlsx ../data/DnD_5e_Spells_with_Targeting.xlsx --write-db
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_KEY (service role or anon with insert policy)
 *
 * Optional:
 *   --batch my-import-v1   (stored in import_batch)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import {
  buildCompendiumSpellId,
  buildSearchText,
  inferResolutionType,
  mapTargetingToTargetMode,
  parseAttackType,
  parseBooleanCell,
  parseDamageType,
  parseLevelCell,
  parseSaveAbility,
  parseDiceSeries,
} from '../shared/lib/spellCompendium/mappers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_XLSX = path.join(ROOT, 'data', 'DnD_5e_Spells_with_Targeting.xlsx')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function parseArgs(argv) {
  const out = { dryRun: false, writeDb: false, xlsx: null, batch: null }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--write-db') out.writeDb = true
    else if (a === '--xlsx' && argv[i + 1]) {
      out.xlsx = argv[++i]
    } else if (a.startsWith('--xlsx=')) {
      out.xlsx = a.split('=')[1]
    } else if (a === '--batch' && argv[i + 1]) {
      out.batch = argv[++i]
    } else if (a.startsWith('--batch=')) {
      out.batch = a.split('=')[1]
    }
  }
  return out
}

function normalizeHeaderKey(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
}

/** Map arbitrary sheet headers → normalized row object. */
function sheetRowToFields(raw) {
  const map = {}
  for (const [k, v] of Object.entries(raw)) {
    let nk = normalizeHeaderKey(k)
    if (nk === 'material*' || nk === 'material *' || nk === 'material star') nk = 'material_detail'
    map[nk] = v
  }

  const pick = (...keys) => {
    for (const key of keys) {
      const v = map[key]
      if (v !== undefined && v !== null && String(v).trim() !== '') return v
    }
    return ''
  }

  return {
    name: pick('name'),
    level: pick('level'),
    school: pick('school'),
    casting_time: pick('casting time', 'castingtime'),
    duration: pick('duration'),
    range: pick('range'),
    area: pick('area'),
    attack: pick('attack'),
    save: pick('save'),
    damage_effect: pick('damage effect', 'damage/effect', 'damageeffect'),
    ritual: pick('ritual'),
    concentration: pick('concentration'),
    verbal: pick('verbal', 'v'),
    somatic: pick('somatic', 's'),
    material: pick('material', 'm'),
    material_detail: pick('material_detail', 'material text', 'material_text', 'material components'),
    source: pick('source'),
    details: pick('details', 'description', 'text'),
    link: pick('link', 'url', 'source link'),
    summon_stat_block: pick('summon stat block', 'summonstatblock', 'summon'),
    targeting: pick('targeting'),
    max_targets: pick('max targets', 'maxtargets', 'targets'),
  }
}

function parseScaling(details) {
  const text = String(details || '')
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

function inferMechanicFromResolution(resolutionType) {
  if (resolutionType === 'attack') return 'attack'
  if (resolutionType === 'save') return 'save'
  if (resolutionType === 'heal') return 'heal'
  if (resolutionType === 'auto') return 'auto'
  return 'utility'
}

function buildDbRow(fields, { importBatch, now }) {
  const name = String(fields.name || '').trim()
  if (!name) return { error: 'missing_name' }

  const level = parseLevelCell(fields.level)
  const source = String(fields.source || '').trim() || null
  const spellId = buildCompendiumSpellId(name, level, source || '')
  const slug = spellId

  const verbal = parseBooleanCell(fields.verbal)
  const somatic = parseBooleanCell(fields.somatic)
  const materialFlag = parseBooleanCell(fields.material)
  const materialText = String(fields.material_detail || '').trim() || null
  const components = {
    V: verbal,
    S: somatic,
    M: materialText || (materialFlag ? true : null),
  }

  const saveAbility = parseSaveAbility(String(fields.save || ''))
  const attackType = parseAttackType(fields.attack)
  const targetMode = mapTargetingToTargetMode(fields.targeting)
  const resolutionType = inferResolutionType({
    attack: fields.attack,
    save: fields.save,
    damageEffect: fields.damage_effect,
    details: fields.details,
  })
  const scaling = parseScaling(fields.details)
  const diceMentions = scaling.dice_mentions

  const damageType = parseDamageType(fields.damage_effect)
  const rulesJson = {
    attack_label: String(fields.attack || '').trim() || null,
    save_label: String(fields.save || '').trim() || null,
    damage_effect: String(fields.damage_effect || '').trim() || null,
    targeting_label: String(fields.targeting || '').trim() || null,
    max_targets_raw: String(fields.max_targets || '').trim() || null,
    summon_stat_block: String(fields.summon_stat_block || '').trim() || null,
    source_link: String(fields.link || '').trim() || null,
    inferred_mechanic: inferMechanicFromResolution(resolutionType),
    inferred_target:
      targetMode === 'self' ? 'self' : targetMode === 'single' ? 'enemy' : targetMode.startsWith('area') ? 'enemy' : null,
    needs_manual_resolution: resolutionType === 'special' || targetMode === 'special',
    parse_confidence: scaling.confidence,
    scaling,
    primary_damage_dice: diceMentions[0] ? `${diceMentions[0].count}d${diceMentions[0].sides}` : null,
    primary_damage_type: damageType,
  }

  const searchText = buildSearchText({
    name,
    school: fields.school,
    casting_time: fields.casting_time,
    duration: fields.duration,
    range: fields.range,
    area: fields.area,
    damage_effect: fields.damage_effect,
    details: fields.details,
    source,
    targeting: fields.targeting,
    max_targets: fields.max_targets,
    summon_stat_block: fields.summon_stat_block,
  })

  return {
    row: {
      slug,
      spell_id: spellId,
      name,
      level,
      school: String(fields.school || '').trim() || null,
      casting_time: String(fields.casting_time || '').trim() || null,
      duration: String(fields.duration || '').trim() || null,
      range: String(fields.range || '').trim() || null,
      area: String(fields.area || '').trim() || null,
      attack: String(fields.attack || '').trim() || null,
      save: String(fields.save || '').trim() || null,
      damage_effect: String(fields.damage_effect || '').trim() || null,
      ritual: parseBooleanCell(fields.ritual),
      concentration: parseBooleanCell(fields.concentration),
      verbal,
      somatic,
      material: materialFlag || !!materialText,
      material_text: materialText,
      source,
      details: String(fields.details || '').trim() || null,
      source_link: String(fields.link || '').trim() || null,
      summon_stat_block: String(fields.summon_stat_block || '').trim() || null,
      targeting: String(fields.targeting || '').trim() || null,
      max_targets: String(fields.max_targets ?? '').trim() || null,
      tags: [],
      search_text: searchText,
      sound_effect_url: null,
      source_type: 'compendium',
      resolution_type: resolutionType,
      target_mode: targetMode,
      save_ability: saveAbility,
      attack_type: attackType,
      components,
      rules_json: rulesJson,
      import_batch: importBatch,
      imported_at: now,
      updated_at: now,
    },
  }
}

async function postgrestUpsert(rows) {
  if (!rows.length) return { status: 'skipped', count: 0 }
  const url = `${SUPABASE_URL}/rest/v1/spell_compendium?on_conflict=spell_id`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`spell_compendium upsert failed (${res.status}): ${text}`)
  }
  return { status: 'ok', count: rows.length }
}

async function run() {
  const args = parseArgs(process.argv)
  const xlsxPath = path.resolve(args.xlsx || DEFAULT_XLSX)
  const now = new Date().toISOString()
  const importBatch = args.batch || `xlsx_${now.slice(0, 10)}`

  let stat
  try {
    stat = await fs.stat(xlsxPath)
  } catch {
    console.error(`Missing spreadsheet: ${xlsxPath}`)
    console.error('Place DnD_5e_Spells_with_Targeting.xlsx in ./data/ or pass --xlsx /path/to/file.xlsx')
    process.exitCode = 1
    return
  }
  if (!stat.isFile()) {
    console.error('Not a file:', xlsxPath)
    process.exitCode = 1
    return
  }

  const workbook = XLSX.readFile(xlsxPath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })

  const report = {
    sheet: sheetName,
    path: xlsxPath,
    raw_row_count: rawRows.length,
    inserted_build: 0,
    skipped: [],
    skipped_counts: {},
    db_batches: [],
  }

  const seenIds = new Set()
  const batch = []
  const BATCH = 120

  const flush = async () => {
    if (args.dryRun || !args.writeDb || !batch.length) return
    if (!SUPABASE_KEY) {
      throw new Error('Set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY for --write-db')
    }
    while (batch.length) {
      const chunk = batch.splice(0, BATCH)
      const r = await postgrestUpsert(chunk)
      report.db_batches.push(r)
    }
  }

  for (let i = 0; i < rawRows.length; i++) {
    const fields = sheetRowToFields(rawRows[i])
    const built = buildDbRow(fields, { importBatch, now })
    if (built.error) {
      const reason = built.error
      report.skipped.push({ row: i + 2, reason })
      report.skipped_counts[reason] = (report.skipped_counts[reason] || 0) + 1
      continue
    }
    const { row } = built
    if (seenIds.has(row.spell_id)) {
      report.skipped.push({ row: i + 2, reason: 'duplicate_in_file', spell_id: row.spell_id })
      report.skipped_counts.duplicate_in_file = (report.skipped_counts.duplicate_in_file || 0) + 1
      continue
    }
    seenIds.add(row.spell_id)
    report.inserted_build += 1
    batch.push(row)
    if (batch.length >= BATCH) await flush()
  }
  await flush()

  console.log(JSON.stringify(report, null, 2))
  if (args.dryRun) {
    console.error('\nDry run: no database writes. Re-run with --write-db to upsert.')
  }
}

run().catch((err) => {
  console.error(err.message || err)
  process.exitCode = 1
})
