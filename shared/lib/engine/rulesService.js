import { engineConfig } from './config.js'
import { listResource, getResource, healthCheck5eApi } from './dnd5eClient.js'
import { mapApiSpellToCharacterSpell, mapApiMonsterToCombatant, mapApiCondition } from './mappers.js'

function shouldTryFallback(err) {
  const msg = String(err?.message || '').toLowerCase()
  return msg.includes('404') || msg.includes('not found')
}

async function tryRuleset(primaryFn, fallbackFn, fallbackAllowed = true) {
  try {
    return await primaryFn()
  } catch (err) {
    if (!fallbackAllowed || !shouldTryFallback(err)) throw err
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

export async function listConditions(options = {}) {
  const primaryRuleset = options.activeRuleset || engineConfig.primaryRuleset
  const fallbackRuleset = options.fallbackRuleset || engineConfig.fallbackRuleset
  const payload = await tryRuleset(
    () => listResource('conditions', { ruleset: primaryRuleset }),
    () => listResource('conditions', { ruleset: fallbackRuleset }),
    options.fallbackAllowed ?? true,
  )
  const list = Array.isArray(payload?.results) ? payload.results : []
  return list.map(mapApiCondition)
}

export async function hydrateSpellByIndex(index, charStats = {}, options = {}) {
  const primaryRuleset = options.activeRuleset || engineConfig.primaryRuleset
  const fallbackRuleset = options.fallbackRuleset || engineConfig.fallbackRuleset
  const spell = await tryRuleset(
    () => getResource('spells', index, { ruleset: primaryRuleset }),
    () => getResource('spells', index, { ruleset: fallbackRuleset }),
    options.fallbackAllowed ?? true,
  )
  return mapApiSpellToCharacterSpell(spell, charStats)
}

export async function searchSpellsByName(name, charStats = {}, options = {}) {
  const primaryRuleset = options.activeRuleset || engineConfig.primaryRuleset
  const fallbackRuleset = options.fallbackRuleset || engineConfig.fallbackRuleset
  const payload = await tryRuleset(
    () => listResource('spells', { ruleset: primaryRuleset, query: { name } }),
    () => listResource('spells', { ruleset: fallbackRuleset, query: { name } }),
    options.fallbackAllowed ?? true,
  )
  const rows = Array.isArray(payload?.results) ? payload.results : []
  return rows.map((row) => mapApiSpellToCharacterSpell(row, charStats))
}

export async function getMonsterCombatant(index, ordinal = 1, options = {}) {
  const primaryRuleset = options.activeRuleset || engineConfig.primaryRuleset
  const fallbackRuleset = options.fallbackRuleset || engineConfig.fallbackRuleset
  const monster = await tryRuleset(
    () => getResource('monsters', index, { ruleset: primaryRuleset }),
    () => getResource('monsters', index, { ruleset: fallbackRuleset }),
    options.fallbackAllowed ?? true,
  )
  return mapApiMonsterToCombatant(monster, ordinal, { ruleset: primaryRuleset })
}
