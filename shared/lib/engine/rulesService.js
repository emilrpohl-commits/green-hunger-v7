import { engineConfig } from './config.js'
import { listResource, getResource, healthCheck5eApi } from './dnd5eClient.js'
import { mapApiSpellToCharacterSpell, mapApiMonsterToCombatant, mapApiCondition } from './mappers.js'
import { warnFallback } from '../fallbackTelemetry.js'

function shouldTryFallback(err) {
  const msg = String(err?.message || '').toLowerCase()
  return msg.includes('404') || msg.includes('not found')
}

async function tryRuleset(primaryFn, fallbackFn, fallbackAllowed = true, telemetry = {}) {
  const primaryRuleset = telemetry.primaryRuleset
  const fallbackRuleset = telemetry.fallbackRuleset
  const resource = telemetry.resource
  try {
    return await primaryFn()
  } catch (err) {
    if (!fallbackAllowed || !shouldTryFallback(err)) throw err
    warnFallback('Engine API fell back to alternate ruleset', {
      system: 'rulesService',
      resource: resource || 'unknown',
      primaryRuleset,
      fallbackRuleset,
      reason: String(err?.message || err),
    })
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
    { resource: 'conditions', primaryRuleset, fallbackRuleset },
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
    { resource: 'spells', primaryRuleset, fallbackRuleset, id: index },
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
    { resource: 'spells-search', primaryRuleset, fallbackRuleset, name },
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
    { resource: 'monsters', primaryRuleset, fallbackRuleset, id: index },
  )
  return mapApiMonsterToCombatant(monster, ordinal, { ruleset: primaryRuleset })
}
