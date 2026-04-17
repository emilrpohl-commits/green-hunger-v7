#!/usr/bin/env node
/**
 * Upsert SRD reference rows from docs/5e-database-main into Supabase.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   npm run reference:import -- --category=equipment --ruleset=2014
 *   npm run reference:import -- --dry-run --category=all
 *
 * See docs/reference-import-contract.md
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  spellJsonToReferenceRow,
  monsterJsonToReferenceRow,
  conditionJsonToReferenceRow,
} from '../../shared/lib/reference/srdReferenceRows.js'
import {
  classJsonToReferenceRow,
  classFeatureJsonToReferenceRow,
  subclass2024FeaturesToReferenceRows,
  subclassJsonToReferenceRow,
  raceJsonToReferenceRow,
  speciesJsonToReferenceRow,
  traitJsonToReferenceRow,
  equipmentJsonToReferenceRow,
  magicItemJsonToReferenceRow,
  backgroundJsonToReferenceRow,
  proficiencyJsonToReferenceRow,
  languageJsonToReferenceRow,
  skillJsonToReferenceRow,
  damageTypeJsonToReferenceRow,
} from '../../shared/lib/reference/srdReferenceMoreRows.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')

function parseArgs(argv) {
  const o = {
    category: 'all',
    ruleset: '2014',
    dryRun: false,
    noLog: false,
  }
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') o.dryRun = true
    else if (a === '--no-log') o.noLog = true
    else if (a.startsWith('--category=')) o.category = a.slice('--category='.length)
    else if (a.startsWith('--ruleset=')) o.ruleset = a.slice('--ruleset='.length)
  }
  return o
}

function loadJson(rel) {
  const path = join(ROOT, rel)
  return JSON.parse(readFileSync(path, 'utf8'))
}

function mapFile(rel) {
  return existsSync(join(ROOT, rel)) ? rel : null
}

async function upsertBatch(sb, table, rows, onConflict) {
  const BATCH = 150
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await sb.from(table).upsert(chunk, { onConflict })
    if (error) throw new Error(`${table} batch ${i}: ${error.message}`)
    process.stdout.write(`  ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`)
  }
  process.stdout.write(`\n  ${table}: ${rows.length} rows OK\n`)
}

async function importTableBatched(sb, table, rows, dryRun) {
  if (dryRun) return { total: rows.length, success: rows.length, errors: [] }
  if (!sb) throw new Error('Missing Supabase client')
  await upsertBatch(sb, table, rows, 'ruleset,source_index')
  return { total: rows.length, success: rows.length, errors: [] }
}

async function writeLog(sb, payload, dryRun, noLog) {
  if (dryRun || noLog || !sb) return
  const { error } = await sb.from('srd_import_log').insert(payload)
  if (error) console.warn('srd_import_log insert:', error.message)
}

function resolveUrlKey(dryRun) {
  const url = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_KEY
    || ''
  if (!dryRun && !key) {
    throw new Error('Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) for non–dry-run imports.')
  }
  return { url, key }
}

async function runCategory(sb, category, ruleset, dryRun) {
  try {
    if (category === 'spells') {
      if (ruleset !== '2014') {
        return { total: 0, success: 0, errors: [{ index: '_', error: 'spells: only 2014 JSON bundled' }] }
      }
      const data = loadJson('docs/5e-database-main/src/2014/5e-SRD-Spells.json')
      const rows = data.map((s) => spellJsonToReferenceRow(s, '2014'))
      return await importTableBatched(sb, 'reference_spells', rows, dryRun)
    }
    if (category === 'monsters') {
      if (ruleset !== '2014') {
        return { total: 0, success: 0, errors: [{ index: '_', error: 'monsters: only 2014 JSON bundled' }] }
      }
      const data = loadJson('docs/5e-database-main/src/2014/5e-SRD-Monsters.json')
      const rows = data.map((m) => monsterJsonToReferenceRow(m, '2014'))
      return await importTableBatched(sb, 'reference_monsters', rows, dryRun)
    }
    if (category === 'conditions') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Conditions.json`)
      if (!rel) return { total: 0, success: 0, errors: [{ index: '_', error: `missing conditions JSON for ${ruleset}` }] }
      const data = loadJson(rel)
      const rows = data.map((c) => conditionJsonToReferenceRow(c, ruleset))
      return await importTableBatched(sb, 'reference_conditions', rows, dryRun)
    }
    if (category === 'classes') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Classes.json`)
      if (!rel) return { total: 0, success: 0, errors: [{ index: '_', error: 'no Classes.json for ruleset' }] }
      const data = loadJson(rel)
      const rows = data.map((x) => classJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_classes', rows, dryRun)
    }
    if (category === 'class-features') {
      const rows = []
      const fRel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Features.json`)
      if (fRel) {
        const feats = loadJson(fRel)
        rows.push(...feats.map((f) => classFeatureJsonToReferenceRow(f, ruleset)))
      }
      if (ruleset === '2024') {
        const scRel = mapFile('docs/5e-database-main/src/2024/5e-SRD-Subclasses.json')
        if (scRel) {
          const subs = loadJson(scRel)
          for (const sc of subs) rows.push(...subclass2024FeaturesToReferenceRows(sc, ruleset))
        }
      }
      if (!rows.length) return { total: 0, success: 0, errors: [{ index: '_', error: 'no feature rows for ruleset' }] }
      return await importTableBatched(sb, 'reference_class_features', rows, dryRun)
    }
    if (category === 'subclasses') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Subclasses.json`)
      if (!rel) return { total: 0, success: 0, errors: [{ index: '_', error: 'no Subclasses.json' }] }
      const data = loadJson(rel)
      const rows = data.map((x) => subclassJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_subclasses', rows, dryRun)
    }
    if (category === 'races') {
      if (ruleset === '2024') {
        const rel = mapFile('docs/5e-database-main/src/2024/5e-SRD-Species.json')
        if (!rel) return { total: 0, success: 0, errors: [] }
        const data = loadJson(rel)
        const rows = data.map((x) => speciesJsonToReferenceRow(x, ruleset))
        return await importTableBatched(sb, 'reference_races', rows, dryRun)
      }
      const rel = mapFile('docs/5e-database-main/src/2014/5e-SRD-Races.json')
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => raceJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_races', rows, dryRun)
    }
    if (category === 'traits') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Traits.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => traitJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_traits', rows, dryRun)
    }
    if (category === 'equipment') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Equipment.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => equipmentJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_equipment', rows, dryRun)
    }
    if (category === 'magic-items') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Magic-Items.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => magicItemJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_magic_items', rows, dryRun)
    }
    if (category === 'backgrounds') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Backgrounds.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => backgroundJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_backgrounds', rows, dryRun)
    }
    if (category === 'proficiencies') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Proficiencies.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => proficiencyJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_proficiencies', rows, dryRun)
    }
    if (category === 'languages') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Languages.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => languageJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_languages', rows, dryRun)
    }
    if (category === 'skills') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Skills.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => skillJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_skills', rows, dryRun)
    }
    if (category === 'damage-types') {
      const rel = mapFile(`docs/5e-database-main/src/${ruleset}/5e-SRD-Damage-Types.json`)
      if (!rel) return { total: 0, success: 0, errors: [] }
      const data = loadJson(rel)
      const rows = data.map((x) => damageTypeJsonToReferenceRow(x, ruleset))
      return await importTableBatched(sb, 'reference_damage_types', rows, dryRun)
    }
    return { total: 0, success: 0, errors: [{ index: '_', error: `unknown category: ${category}` }] }
  } catch (e) {
    return { total: 0, success: 0, errors: [{ index: '_', error: String(e?.message || e) }] }
  }
}

const ALL_CATEGORIES = [
  'spells', 'monsters', 'conditions',
  'classes', 'class-features', 'subclasses', 'races', 'traits',
  'equipment', 'magic-items', 'backgrounds', 'proficiencies',
  'languages', 'skills', 'damage-types',
]

async function main() {
  const { category, ruleset, dryRun, noLog } = parseArgs(process.argv)
  const { url, key } = resolveUrlKey(dryRun)
  const sb = key ? createClient(url, key) : null

  const cats = category === 'all'
    ? ALL_CATEGORIES.filter((c) => {
        if (ruleset === '2024' && (c === 'spells' || c === 'monsters')) return false
        return true
      })
    : [category]

  for (const cat of cats) {
    console.log(`\n── ${cat} (${ruleset}) dryRun=${dryRun} ──`)
    const started = new Date().toISOString()
    const result = await runCategory(sb, cat, ruleset, dryRun)
    const errCount = result.errors?.length || 0
    console.log(`  total=${result.total} success=${result.success} errors=${errCount}`)
    if (errCount && result.errors) {
      result.errors.slice(0, 15).forEach((e) => console.log(`    - ${e.index}: ${e.error}`))
      if (errCount > 15) console.log(`    … ${errCount - 15} more`)
    }
    if (sb && !noLog && !dryRun) {
      await writeLog(sb, {
        category: cat,
        ruleset,
        started_at: started,
        completed_at: new Date().toISOString(),
        total_rows: result.total,
        success_rows: result.success,
        error_rows: errCount,
        errors: (result.errors || []).slice(0, 200),
        dry_run: dryRun,
      }, dryRun, noLog)
    }
  }

  if (category === 'all' && ruleset === '2014') {
    console.log('\n── conditions (2024) ──')
    const r2 = await runCategory(sb, 'conditions', '2024', dryRun)
    console.log(`  total=${r2.total} success=${r2.success}`)
    if (sb && !noLog && !dryRun) {
      await writeLog(sb, {
        category: 'conditions',
        ruleset: '2024',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_rows: r2.total,
        success_rows: r2.success,
        error_rows: r2.errors?.length || 0,
        errors: (r2.errors || []).slice(0, 200),
        dry_run: dryRun,
      }, dryRun, noLog)
    }
  }

  console.log('\nReference import finished.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
