/**
 * Normalize combatant condition strings and sync Exhaustion with exhaustionLevel.
 */
import { normalizeConditionName } from './conditionCatalog.js'

/**
 * @param {unknown} arr
 * @returns {string[]}
 */
export function normalizeConditionsArray(arr) {
  if (!Array.isArray(arr)) return []
  const out = []
  const seen = new Set()
  for (const x of arr) {
    const n = normalizeConditionName(String(x || '').trim())
    if (!n) continue
    const key = n.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(n)
  }
  return out
}

/**
 * @param {Record<string, unknown>} combatant
 * @returns {Record<string, unknown>}
 */
export function normalizeCombatantConditions(combatant) {
  if (!combatant || typeof combatant !== 'object') return combatant
  let conditions = normalizeConditionsArray(combatant.conditions)
  const rawLv = combatant.exhaustionLevel
  let exhaustionLevel
  if (rawLv === undefined || rawLv === null) {
    exhaustionLevel = conditions.includes('Exhaustion') ? 1 : 0
  } else {
    exhaustionLevel = Math.max(0, Math.min(6, Math.floor(Number(rawLv) || 0)))
  }

  if (exhaustionLevel > 0) {
    if (!conditions.includes('Exhaustion')) conditions = [...conditions, 'Exhaustion']
  } else {
    conditions = conditions.filter((x) => x !== 'Exhaustion')
  }

  return {
    ...combatant,
    conditions,
    exhaustionLevel,
  }
}

/**
 * @param {unknown[]} combatants
 * @returns {unknown[]}
 */
export function normalizeCombatantsList(combatants) {
  if (!Array.isArray(combatants)) return []
  return combatants.map((c) => normalizeCombatantConditions(c))
}
