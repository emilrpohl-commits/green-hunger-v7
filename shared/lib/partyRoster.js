/**
 * Single source for party roster shapes used by DM combat + player runtime HP rows.
 * Prefers Supabase `characters` rows; falls back to bundled session1.CHARACTERS.
 */

import { CHARACTERS } from '@shared/content/session1.js'
import { warnFallback } from './fallbackTelemetry.js'

/** @param {Record<string, unknown>} c session1.CHARACTERS entry */
export function runtimeRowFromSessionCharacter(c) {
  return {
    id: c.id,
    contentSource: 'static',
    name: c.name,
    player: c.player ?? null,
    class: c.class,
    level: c.level,
    species: c.species,
    maxHp: c.maxHp,
    curHp: c.curHp,
    tempHp: c.tempHp ?? 0,
    ac: c.ac,
    initiative: typeof c.initiative === 'number' ? c.initiative : 0,
    spellSlots: c.spellSlots,
    deathSaves: c.deathSaves,
    concentration: c.concentration ?? false,
    conditions: c.conditions ?? [],
    image: c.image || null,
    isNPC: !!c.isNPC,
  }
}

/**
 * @param {Record<string, unknown>} row - characters table row (snake_case from PostgREST)
 * @param {Record<string, unknown>} [fallback] - matching session1 entry by id
 */
export function runtimeRowFromDbCharacter(row, fallback = {}) {
  const stats = row.stats || {}
  const mergedFields = []
  if (fallback.maxHp != null && stats.maxHp == null) mergedFields.push('maxHp')
  if (fallback.ac != null && stats.ac == null) mergedFields.push('ac')
  if (Object.keys(fallback).length && mergedFields.length) {
    warnFallback('Merged static session bundle into DB character row', {
      system: 'partyRoster',
      id: row.id,
      name: row.name,
      source: 'merged',
      fields: mergedFields,
    })
  }
  const maxHp = stats.maxHp ?? fallback.maxHp ?? 10
  const ac = stats.ac ?? fallback.ac ?? 10
  const initRaw = stats.initiative ?? fallback.initiative ?? 0
  const initiative = typeof initRaw === 'number'
    ? initRaw
    : parseInt(String(initRaw).replace(/[^0-9-]/g, ''), 10) || 0

  return {
    id: row.id,
    name: row.name,
    contentSource: mergedFields.length ? 'merged' : 'db',
    player: row.player ?? null,
    class: row.class,
    level: row.level,
    species: row.species,
    maxHp,
    curHp: fallback.curHp ?? maxHp,
    tempHp: fallback.tempHp ?? 0,
    ac,
    initiative,
    spellSlots: row.spell_slots ?? fallback.spellSlots ?? {},
    deathSaves: fallback.deathSaves ?? { successes: 0, failures: 0 },
    concentration: fallback.concentration ?? false,
    conditions: fallback.conditions ?? [],
    image: row.image || fallback.image || null,
    isNPC: !!row.is_npc,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ fallbackCharacters?: typeof CHARACTERS }} [opts]
 */
export async function fetchPartyRosterForCombat(supabase, opts = {}) {
  const fallbackCharacters = opts.fallbackCharacters ?? CHARACTERS
  const fallbackList = fallbackCharacters.map(runtimeRowFromSessionCharacter)
  try {
    const { data, error } = await supabase.from('characters').select('*').order('id')
    if (error || !data?.length) {
      warnFallback('Using static bundled character roster (DB empty or error)', {
        system: 'partyRoster',
        reason: error?.message || 'no_rows',
        source: 'static',
      })
      return { roster: fallbackList, source: 'fallback' }
    }
    const fbMap = Object.fromEntries(fallbackCharacters.map(c => [c.id, c]))
    const roster = data.map(row => runtimeRowFromDbCharacter(row, fbMap[row.id] || {}))
    return { roster, source: 'database' }
  } catch (e) {
    warnFallback('Using static bundled character roster (fetch threw)', {
      system: 'partyRoster',
      reason: String(e?.message || e),
      source: 'static',
    })
    return { roster: fallbackList, source: 'fallback' }
  }
}

/**
 * Player app: runtime `characters` slice (no NPCs) for HP sync — matches session1 shape.
 * @param {Record<string, unknown>[]} charRows
 * @param {Record<string, unknown>[]} [charStateRows]
 * @param {typeof CHARACTERS} [fallbackCharacters]
 */
export function buildPlayerRuntimeCharacters(charRows, charStateRows = [], fallbackCharacters = CHARACTERS) {
  const fallbackPcs = fallbackCharacters.filter(c => !c.isNPC)
  const stateMap = Object.fromEntries((charStateRows || []).map(s => [s.id, s]))
  const fallbackMap = Object.fromEntries(fallbackPcs.map(c => [c.id, c]))

  const pcs = (charRows || []).filter(r => !r.is_npc)
  if (!pcs.length) {
    warnFallback('No PC rows in DB; using bundled session player characters', {
      system: 'partyRoster',
      source: 'static',
    })
    return fallbackPcs.map((c) => ({ ...c, contentSource: 'static' }))
  }

  return pcs.map((row) => {
    const stats = row.stats || {}
    const fb = fallbackMap[row.id] || {}
    const saved = stateMap[row.id]
    const maxHp = stats.maxHp ?? fb.maxHp
    const merged = (stats.maxHp == null && fb.maxHp != null) || (stats.ac == null && fb.ac != null)
    if (merged && Object.keys(fb).length) {
      warnFallback('Player runtime character merged DB row with static bundle', {
        system: 'partyRoster',
        id: row.id,
        source: 'merged',
      })
    }
    return {
      id: row.id,
      name: row.name,
      player: row.player,
      class: row.class,
      level: row.level,
      species: row.species,
      maxHp,
      curHp: saved?.cur_hp ?? fb.curHp ?? maxHp,
      tempHp: saved?.temp_hp ?? fb.tempHp ?? 0,
      ac: stats.ac ?? fb.ac,
      initiative: typeof fb.initiative === 'number' ? fb.initiative : 0,
      spellSlots: saved?.spell_slots ?? row.spell_slots ?? fb.spellSlots,
      deathSaves: saved?.death_saves ?? fb.deathSaves,
      concentration: saved?.concentration ?? fb.concentration,
      conditions: saved?.conditions ?? fb.conditions,
      image: row.image || fb.image,
      contentSource: merged ? 'merged' : 'db',
    }
  })
}

/**
 * DM UI: player targets (excludes NPC companions).
 * @param {ReturnType<typeof runtimeRowFromSessionCharacter>[]} roster
 */
export function rosterToDmTargetOptions(roster) {
  return roster.filter(c => !c.isNPC).map(c => ({ id: c.id, name: c.name }))
}
