#!/usr/bin/env node
/**
 * Import 5e-bits SRD 2014 spells + monsters into current Supabase schema.
 *
 * Examples:
 *   node tools/importSrd2014.mjs --dry-run
 *   node tools/importSrd2014.mjs --write-files
 *   node tools/importSrd2014.mjs --write-db
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SRD_ROOT = path.join(ROOT, 'docs', '5e-database-main', 'src', '2014')
const SPELLS_JSON = path.join(SRD_ROOT, '5e-SRD-Spells.json')
const MONSTERS_JSON = path.join(SRD_ROOT, '5e-SRD-Monsters.json')
const OUT_DIR = path.join(ROOT, 'docs', 'srd-import')
const OUT_SPELLS = path.join(OUT_DIR, 'spells.normalized.json')
const OUT_MONSTERS = path.join(OUT_DIR, 'monsters.normalized.json')
const OUT_REPORT = path.join(OUT_DIR, 'report.json')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const writeFiles = args.has('--write-files') || dryRun
const writeDb = args.has('--write-db') && !dryRun
const sourceTag = '5e-srd-2014'
const onlyArg = process.argv.find(a => a.startsWith('--only=')) || null
const limitArg = process.argv.find(a => a.startsWith('--limit=')) || null
const only = onlyArg ? String(onlyArg.split('=')[1] || '').trim().toLowerCase() : 'all'
const limit = limitArg ? Math.max(0, parseInt(limitArg.split('=')[1], 10) || 0) : null

function toArray(v) {
  return Array.isArray(v) ? v : []
}

function clean(v) {
  return typeof v === 'string' ? v.trim() : v
}

function toSpellId(index, name) {
  if (index) return String(index).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseDiceFromFormula(text) {
  if (!text || typeof text !== 'string') return null
  const m = text.replace(/\s+/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!m) return null
  return {
    count: Number(m[1]),
    sides: Number(m[2]),
    mod: m[3] ? Number(m[3]) : 0,
    formula: `${m[1]}d${m[2]}${m[3] || ''}`,
  }
}

function pickFirstDice(obj) {
  if (!obj || typeof obj !== 'object') return null
  const values = Object.values(obj)
  for (const v of values) {
    const parsed = parseDiceFromFormula(String(v))
    if (parsed) return parsed
  }
  return null
}

function inferResolutionType(spell) {
  if (spell?.heal_at_slot_level) return 'heal'
  if (spell?.attack_type) return 'attack'
  if (spell?.dc?.dc_type?.name) return 'save'
  if (spell?.damage) return 'auto'
  return 'utility'
}

function inferTargetMode(spell, resolutionType) {
  const desc = toArray(spell.desc).join(' ').toLowerCase()
  if (desc.includes('choose up to') || desc.includes('up to three creatures')) return 'multi_select'
  if (spell.area_of_effect?.size) return 'area'
  if (desc.includes('each creature') || desc.includes('all creatures')) return 'area_all'
  if (resolutionType === 'heal' && desc.includes('you')) return 'self'
  return 'single'
}

function normalizeSpell(spell) {
  const spellId = toSpellId(spell.index, spell.name)
  const resolutionType = inferResolutionType(spell)
  const targetMode = inferTargetMode(spell, resolutionType)
  const slotScaling = spell?.damage?.damage_at_slot_level || null
  const charScaling = spell?.damage?.damage_at_character_level || null
  const firstDamage = pickFirstDice(slotScaling) || pickFirstDice(charScaling)
  const firstHeal = pickFirstDice(spell?.heal_at_slot_level)
  const row = {
    spell_id: spellId,
    campaign_id: null,
    name: clean(spell.name),
    level: Number(spell.level) || 0,
    school: clean(spell?.school?.name) || null,
    casting_time: clean(spell.casting_time) || null,
    range: clean(spell.range) || null,
    components: {
      V: toArray(spell.components).includes('V'),
      S: toArray(spell.components).includes('S'),
      M: clean(spell.material) || null,
    },
    duration: clean(spell.duration) || null,
    ritual: !!spell.ritual,
    concentration: !!spell.concentration,
    description: toArray(spell.desc).join('\n\n'),
    higher_level_effect: toArray(spell.higher_level).join('\n\n'),
    damage_dice: firstDamage?.formula || null,
    damage_type: clean(spell?.damage?.damage_type?.name) || null,
    healing_dice: firstHeal?.formula || null,
    save_type: clean(spell?.dc?.dc_type?.name) || null,
    attack_type: clean(spell.attack_type) || null,
    resolution_type: resolutionType,
    target_mode: targetMode,
    save_ability: clean(spell?.dc?.dc_type?.name) || null,
    area: spell?.area_of_effect || {},
    scaling: {
      damage_at_slot_level: slotScaling || {},
      damage_at_character_level: charScaling || {},
      heal_at_slot_level: spell?.heal_at_slot_level || {},
    },
    rules_json: {
      source: sourceTag,
      index: spell.index,
      dc_success: spell?.dc?.dc_success || null,
      classes: toArray(spell.classes).map(c => c.name),
      subclasses: toArray(spell.subclasses).map(s => s.name),
      inferred_mechanic: resolutionType,
      inferred_target: targetMode,
      needs_manual_resolution: resolutionType === 'utility' || targetMode === 'special',
      raw_url: spell.url || null,
    },
    tags: [],
    source: sourceTag,
    classes: toArray(spell.classes).map(c => c.name).filter(Boolean),
    notes: null,
    updated_at: new Date().toISOString(),
  }
  return {
    row,
    rawRow: {
      spell_id: spellId,
      source_file: 'docs/5e-database-main/src/2014/5e-SRD-Spells.json',
      raw_json: spell,
      normalized_hash: crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex'),
      updated_at: new Date().toISOString(),
    }
  }
}

function armorClassToPair(armorClass) {
  if (typeof armorClass === 'number') return { ac: armorClass, note: '' }
  const arr = toArray(armorClass)
  if (arr.length === 0) return { ac: 10, note: '' }
  const first = arr[0]
  if (typeof first === 'number') return { ac: first, note: '' }
  return { ac: Number(first.value) || 10, note: clean(first.type) || '' }
}

function mapSavingThrowsFromProficiencies(proficiencies) {
  return toArray(proficiencies)
    .filter(p => String(p?.proficiency?.index || '').startsWith('saving-throw-'))
    .map(p => {
      const key = String(p.proficiency.name || '').replace('Saving Throw:', '').trim().toUpperCase()
      return { name: key, mod: Number(p.value) || 0 }
    })
}

function mapSkillsFromProficiencies(proficiencies) {
  return toArray(proficiencies)
    .filter(p => String(p?.proficiency?.index || '').startsWith('skill-'))
    .map(p => {
      const name = String(p.proficiency.name || '').replace('Skill:', '').trim()
      return { name, mod: Number(p.value) || 0 }
    })
}

function convertMonsterAction(a) {
  if (!a) return null
  const base = {
    name: clean(a.name) || 'Action',
    desc: clean(a.desc) || '',
  }
  if (a.multiattack_type || a.action_options || a.actions) {
    return { ...base, type: 'special', desc: base.desc || 'Multiattack / action option' }
  }
  if (a.attack_bonus != null) {
    const dmg = toArray(a.damage).map(d => clean(d?.damage_dice)).filter(Boolean)
    return {
      ...base,
      type: 'attack',
      toHit: Number(a.attack_bonus) || 0,
      damage: dmg[0] || null,
      effect: base.desc,
    }
  }
  if (a.dc?.dc_value || a.dc?.dc_type?.name) {
    const dmg = toArray(a.damage).map(d => clean(d?.damage_dice)).filter(Boolean)
    return {
      ...base,
      type: 'save',
      saveDC: Number(a.dc?.dc_value) || null,
      saveType: clean(a.dc?.dc_type?.name) || null,
      damage: dmg[0] || null,
      desc: base.desc,
    }
  }
  return { ...base, type: 'special' }
}

function normalizeMonster(monster) {
  const acPair = armorClassToPair(monster.armor_class)
  const row = {
    campaign_id: null,
    slug: clean(monster.index),
    name: clean(monster.name),
    source: sourceTag,
    creature_type: [clean(monster.type), clean(monster.subtype)].filter(Boolean).join(' ') || clean(monster.type) || null,
    size: clean(monster.size) || null,
    alignment: clean(monster.alignment) || null,
    cr: String(monster.challenge_rating ?? ''),
    proficiency_bonus: Number(monster.proficiency_bonus) || null,
    ac: acPair.ac,
    ac_note: acPair.note || null,
    max_hp: Number(monster.hit_points) || 1,
    hit_dice: clean(monster.hit_points_roll || monster.hit_dice) || null,
    speed: Object.entries(monster.speed || {}).map(([k, v]) => `${k} ${v}`).join(', '),
    ability_scores: {
      STR: Number(monster.strength) || 10,
      DEX: Number(monster.dexterity) || 10,
      CON: Number(monster.constitution) || 10,
      INT: Number(monster.intelligence) || 10,
      WIS: Number(monster.wisdom) || 10,
      CHA: Number(monster.charisma) || 10,
    },
    saving_throws: mapSavingThrowsFromProficiencies(monster.proficiencies),
    skills: mapSkillsFromProficiencies(monster.proficiencies),
    resistances: toArray(monster.damage_resistances),
    immunities: {
      damage: toArray(monster.damage_immunities),
      condition: toArray(monster.condition_immunities).map(c => c?.name || c).filter(Boolean),
    },
    vulnerabilities: toArray(monster.damage_vulnerabilities),
    senses: Object.entries(monster.senses || {}).map(([k, v]) => `${k} ${v}`).join(', '),
    languages: clean(monster.languages) || null,
    traits: toArray(monster.special_abilities).map(t => ({ name: clean(t.name), desc: clean(t.desc) })),
    actions: toArray(monster.actions).map(convertMonsterAction).filter(Boolean),
    bonus_actions: [],
    reactions: toArray(monster.reactions).map(r => ({ name: clean(r.name), desc: clean(r.desc), type: 'reaction' })),
    legendary_actions: toArray(monster.legendary_actions).map(r => ({ name: clean(r.name), desc: clean(r.desc), type: 'legendary' })),
    combat_prompts: [],
    dm_notes: [],
    portrait_url: clean(monster.image) || null,
    tags: [],
    updated_at: new Date().toISOString(),
  }
  return row
}

function omitColumn(rows, columnName) {
  return rows.map((row) => {
    const next = { ...row }
    delete next[columnName]
    return next
  })
}

async function postgrestUpsert(table, rows, conflictColumns, dropped = []) {
  if (rows.length === 0) return { status: 'skipped', count: 0 }
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumns)}`
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
    const body = await res.text()
    if (table === 'spells_raw' && res.status === 404) {
      return { status: 'skipped_missing_table', count: 0 }
    }
    if (res.status === 400) {
      const missingColMatch = body.match(/Could not find the '([^']+)' column/)
      const missingCol = missingColMatch?.[1]
      if (missingCol && !dropped.includes(missingCol)) {
        const reducedRows = omitColumn(rows, missingCol)
        return postgrestUpsert(table, reducedRows, conflictColumns, [...dropped, missingCol])
      }
    }
    throw new Error(`${table} upsert failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return { status: 'ok', count: data.length, dropped_columns: dropped }
}

async function fetchTableSampleColumns(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null
  return Object.keys(data[0])
}

async function postgrestInsert(table, rows, dropped = []) {
  if (rows.length === 0) return { status: 'skipped', count: 0 }
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 400) {
      const missingColMatch = body.match(/Could not find the '([^']+)' column/)
      const missingCol = missingColMatch?.[1]
      if (missingCol && !dropped.includes(missingCol)) {
        const reducedRows = omitColumn(rows, missingCol)
        return postgrestInsert(table, reducedRows, [...dropped, missingCol])
      }
    }
    throw new Error(`${table} insert failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return { status: 'ok', count: data.length, dropped_columns: dropped }
}

async function fetchExistingSpellNames() {
  const url = `${SUPABASE_URL}/rest/v1/spells?select=name`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: '0-9999',
      Prefer: 'count=exact',
    }
  })
  if (!res.ok) return new Set()
  const data = await res.json()
  return new Set((Array.isArray(data) ? data : []).map(r => String(r.name || '').trim().toLowerCase()).filter(Boolean))
}

async function run() {
  const [spellsRaw, monstersRaw] = await Promise.all([
    fs.readFile(SPELLS_JSON, 'utf8'),
    fs.readFile(MONSTERS_JSON, 'utf8'),
  ])
  const spells = JSON.parse(spellsRaw)
  const monsters = JSON.parse(monstersRaw)

  const importSpells = only === 'all' || only === 'spells'
  const importMonsters = only === 'all' || only === 'monsters'
  if (!importSpells && !importMonsters) {
    throw new Error(`Invalid --only value "${only}". Expected spells|monsters|all`)
  }

  const scopedSpells = importSpells
    ? (limit != null ? spells.slice(0, limit) : spells)
    : []
  const scopedMonsters = importMonsters
    ? (limit != null ? monsters.slice(0, limit) : monsters)
    : []

  const normalizedSpells = scopedSpells.map(normalizeSpell)
  const spellRows = normalizedSpells.map(s => s.row)
  const spellRawRows = normalizedSpells.map(s => s.rawRow)
  const monsterRows = scopedMonsters.map(normalizeMonster)

  const report = {
    source: sourceTag,
    counts: {
      source_spells: spells.length,
      source_monsters: monsters.length,
      normalized_spells: spellRows.length,
      normalized_monsters: monsterRows.length,
    },
    options: { dryRun, writeFiles, writeDb, only, limit },
    paths: { SPELLS_JSON, MONSTERS_JSON, OUT_DIR },
  }

  if (writeFiles) {
    await fs.mkdir(OUT_DIR, { recursive: true })
    await Promise.all([
      fs.writeFile(OUT_SPELLS, JSON.stringify(spellRows, null, 2)),
      fs.writeFile(OUT_MONSTERS, JSON.stringify(monsterRows, null, 2)),
      fs.writeFile(OUT_REPORT, JSON.stringify(report, null, 2)),
    ])
  }

  if (writeDb) {
    const spellsColumns = await fetchTableSampleColumns('spells')
    const hasSpellIdColumn = Array.isArray(spellsColumns) && spellsColumns.includes('spell_id')
    const spellRowsForDb = hasSpellIdColumn
      ? spellRows
      : spellRows.map((row) => {
        const next = { ...row }
        delete next.spell_id
        return next
      })

    let spellWriteTask
    if (!importSpells) {
      spellWriteTask = Promise.resolve({ status: 'skipped', count: 0 })
    } else if (hasSpellIdColumn) {
      spellWriteTask = postgrestUpsert('spells', spellRowsForDb, 'spell_id')
    } else {
      spellWriteTask = (async () => {
        const existingNames = await fetchExistingSpellNames()
        const toInsert = spellRowsForDb.filter(r => !existingNames.has(String(r.name || '').trim().toLowerCase()))
        const result = await postgrestInsert('spells', toInsert)
        return { ...result, skipped_existing_name: spellRowsForDb.length - toInsert.length }
      })()
    }

    const [rawResult, spellResult, monsterResult] = await Promise.all([
      importSpells ? postgrestUpsert('spells_raw', spellRawRows, 'spell_id') : Promise.resolve({ status: 'skipped', count: 0 }),
      spellWriteTask,
      importMonsters ? postgrestUpsert('stat_blocks', monsterRows, 'slug') : Promise.resolve({ status: 'skipped', count: 0 }),
    ])
    report.db = {
      spells_raw: rawResult,
      spells: spellResult,
      stat_blocks: monsterResult,
    }
  }

  console.log(JSON.stringify(report, null, 2))
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exitCode = 1
})
