#!/usr/bin/env node
/**
 * Upsert SRD reference rows from docs/5e-database-main into Supabase.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   npm run reference:import
 *
 * Requires migration 20260411120000_reference_library_srd.sql applied.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  spellJsonToReferenceRow,
  monsterJsonToReferenceRow,
  conditionJsonToReferenceRow,
} from '../../shared/lib/reference/srdReferenceRows.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
/** Repository root (parent of dm/) */
const ROOT = join(__dirname, '../..')

const url = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_KEY
  || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const sb = createClient(url, key)

function loadJson(rel) {
  const path = join(ROOT, rel)
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function upsertBatch(table, rows, onConflict) {
  const BATCH = 150
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await sb.from(table).upsert(chunk, { onConflict })
    if (error) throw new Error(`${table} batch ${i}: ${error.message}`)
    process.stdout.write(`  ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`)
  }
  process.stdout.write(`\n  ${table}: ${rows.length} rows OK\n`)
}

async function main() {
  console.log('Loading JSON…')
  const spells = loadJson('docs/5e-database-main/src/2014/5e-SRD-Spells.json')
  const spellRows = spells.map((s) => spellJsonToReferenceRow(s, '2014'))
  console.log(`Upserting reference_spells (${spellRows.length})…`)
  await upsertBatch('reference_spells', spellRows, 'ruleset,source_index')

  const monsters = loadJson('docs/5e-database-main/src/2014/5e-SRD-Monsters.json')
  const monsterRows = monsters.map((m) => monsterJsonToReferenceRow(m, '2014'))
  console.log(`Upserting reference_monsters (${monsterRows.length})…`)
  await upsertBatch('reference_monsters', monsterRows, 'ruleset,source_index')

  const conditionSets = [
    ['docs/5e-database-main/src/2014/5e-SRD-Conditions.json', '2014'],
    ['docs/5e-database-main/src/2024/5e-SRD-Conditions.json', '2024'],
  ]
  for (const [rel, ruleset] of conditionSets) {
    const cond = loadJson(rel)
    const rows = cond.map((c) => conditionJsonToReferenceRow(c, ruleset))
    console.log(`Upserting reference_conditions ${ruleset} (${rows.length})…`)
    await upsertBatch('reference_conditions', rows, 'ruleset,source_index')
  }

  console.log('Reference import finished.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
