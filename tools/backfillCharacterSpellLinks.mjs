#!/usr/bin/env node
/**
 * Backfill character_spells with canonical spell_id links for party + Ilya.
 *
 * Usage:
 *   node tools/backfillCharacterSpellLinks.mjs --dry-run
 *   node tools/backfillCharacterSpellLinks.mjs --write-db
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLAYER_CHARACTERS } from '../shared/content/playerCharacters.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'
const COMPENDIUM_PATH = path.join(ROOT, 'docs', 'Green_Hunger_Spells_Normalized.json')

const args = new Set(process.argv.slice(2))
const writeDb = args.has('--write-db')

function normalizeSpellId(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toSlotLevelKey(levelKey) {
  return levelKey === 'cantrips' ? 'cantrip' : String(levelKey)
}

async function postgrestUpsert(rows) {
  const url = `${SUPABASE_URL}/rest/v1/character_spells?on_conflict=${encodeURIComponent('character_id,slot_level,order_index')}`
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
    throw new Error(`character_spells upsert failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function run() {
  const compendium = JSON.parse(await fs.readFile(COMPENDIUM_PATH, 'utf8'))
  const compendiumMap = {}
  for (const spell of compendium) {
    compendiumMap[normalizeSpellId(spell.spell_id || spell.name)] = spell
  }

  const ids = ['dorothea', 'kanan', 'danil', 'ilya']
  const rows = []
  const missing = []

  for (const cid of ids) {
    const char = PLAYER_CHARACTERS[cid]
    if (!char?.spells) continue
    for (const [levelKey, list] of Object.entries(char.spells)) {
      let orderIndex = 0
      for (const spell of list || []) {
        orderIndex += 1
        const spellId = normalizeSpellId(spell.spellId || spell.name)
        const base = compendiumMap[spellId]
        if (!base) missing.push({ character: cid, spell: spell.name, spellId })
        rows.push({
          character_id: cid,
          slot_level: toSlotLevelKey(levelKey),
          order_index: orderIndex,
          spell_id: spellId,
          spell_data: base || spell,
          overrides_json: {},
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  if (writeDb) {
    const result = await postgrestUpsert(rows)
    console.log(`Upserted ${result.length} character_spells rows`)
  }

  const report = {
    characters: ids,
    rows: rows.length,
    missing_in_compendium: missing.length,
    missing,
  }
  console.log(JSON.stringify(report, null, 2))
}

run().catch((err) => {
  console.error(err.message)
  process.exitCode = 1
})
