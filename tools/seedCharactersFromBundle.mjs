#!/usr/bin/env node
/**
 * Upsert static `characters` rows from shared/content/playerCharacters.js
 *
 * Usage:
 *   node tools/seedCharactersFromBundle.mjs --dry-run
 *   node tools/seedCharactersFromBundle.mjs --write-db
 */

import { PLAYER_CHARACTERS } from '../shared/content/playerCharacters.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const writeDb = args.has('--write-db') && !dryRun

/** DB row already matches player-safe Ilya copy in bundle; skip legacy client sanitize. */
const ILYA_HOMEBREW = { player_sheet_sanitized: true }

function toDbRow(char) {
  return {
    id: char.id,
    campaign_id: null,
    name: char.name,
    password: char.password ?? null,
    class: char.class,
    subclass: char.subclass ?? null,
    level: char.level,
    species: char.species ?? null,
    background: char.background ?? null,
    player: char.player ?? null,
    image: char.image ?? null,
    colour: char.colour ?? null,
    is_npc: !!char.isNPC,
    is_active: char.isActive !== false,
    notes: char.notes ?? null,
    stats: char.stats ?? {},
    ability_scores: char.abilityScores ?? {},
    saving_throws: char.savingThrows ?? [],
    skills: char.skills ?? [],
    spell_slots: char.spellSlots ?? {},
    sorcery_points: char.sorceryPoints ?? null,
    features: char.features ?? [],
    weapons: char.weapons ?? [],
    healing_actions: char.healingActions ?? [],
    buff_actions: char.buffActions ?? [],
    equipment: char.equipment ?? [],
    magic_items: char.magicItems ?? [],
    passive_scores: char.passiveScores ?? {},
    senses: char.senses ?? null,
    languages: char.languages ?? null,
    backstory: char.backstory ?? null,
    srd_refs: {},
    homebrew_json: char.id === 'ilya' ? ILYA_HOMEBREW : {},
    updated_at: new Date().toISOString(),
  }
}

async function postgrestUpsert(rows) {
  const url = `${SUPABASE_URL}/rest/v1/characters?on_conflict=id`
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
    throw new Error(`characters upsert failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function run() {
  const rows = Object.values(PLAYER_CHARACTERS).map(toDbRow)
  console.log(`Prepared ${rows.length} character rows: ${rows.map(r => r.id).join(', ')}`)
  if (dryRun) {
    console.log(JSON.stringify(rows[0], null, 2))
    return
  }
  if (writeDb) {
    const result = await postgrestUpsert(rows)
    console.log(`Upserted ${result.length} characters`)
  } else {
    console.log('Pass --write-db to push to Supabase (or --dry-run to preview).')
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
