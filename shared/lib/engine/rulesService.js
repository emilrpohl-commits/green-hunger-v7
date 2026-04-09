import { engineConfig } from './config.js'
import { listResource, getResource, healthCheck5eApi } from './dnd5eClient.js'
import { mapApiSpellToCharacterSpell, mapApiMonsterToCombatant, mapApiCondition } from './mappers.js'

async function tryRuleset(primaryFn, fallbackFn) {
  try {
    return await primaryFn()
  } catch (err) {
    try {
      return await fallbackFn()
    } catch {
      throw err
    }
  }
}

export async function getEngineHealth() {
  return healthCheck5eApi()
}

export async function listConditions() {
  const payload = await tryRuleset(
    () => listResource('conditions', { ruleset: engineConfig.primaryRuleset }),
    () => listResource('conditions', { ruleset: engineConfig.fallbackRuleset }),
  )
  const list = Array.isArray(payload?.results) ? payload.results : []
  return list.map(mapApiCondition)
}

export async function hydrateSpellByIndex(index, charStats = {}) {
  const spell = await tryRuleset(
    () => getResource('spells', index, { ruleset: engineConfig.primaryRuleset }),
    () => getResource('spells', index, { ruleset: engineConfig.fallbackRuleset }),
  )
  return mapApiSpellToCharacterSpell(spell, charStats)
}

export async function searchSpellsByName(name, charStats = {}) {
  const payload = await tryRuleset(
    () => listResource('spells', { ruleset: engineConfig.primaryRuleset, query: { name } }),
    () => listResource('spells', { ruleset: engineConfig.fallbackRuleset, query: { name } }),
  )
  const rows = Array.isArray(payload?.results) ? payload.results : []
  return rows.map((row) => mapApiSpellToCharacterSpell(row, charStats))
}

export async function getMonsterCombatant(index, ordinal = 1) {
  const monster = await tryRuleset(
    () => getResource('monsters', index, { ruleset: engineConfig.primaryRuleset }),
    () => getResource('monsters', index, { ruleset: engineConfig.fallbackRuleset }),
  )
  return mapApiMonsterToCombatant(monster, ordinal)
}
