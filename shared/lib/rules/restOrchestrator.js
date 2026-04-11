/**
 * Pure rest helpers — rules reference from catalog/restRules.json.
 */
import restDoc from './catalog/restRules.json'

export { restDoc as restRulesCatalog }

/**
 * @typedef {{ maxHp: number, curHp: number, spellSlots?: Record<string, number>, hitDiceCurrent?: number, hitDiceMax?: number, exhaustionLevel?: number }} RestCharacterSnapshot
 */

/**
 * Apply long-rest HP restore only (safe default).
 * @param {RestCharacterSnapshot} char
 * @returns {RestCharacterSnapshot}
 */
export function applyLongRestHpOnly(char) {
  const maxHp = Math.max(0, Number(char.maxHp) || 0)
  return {
    ...char,
    curHp: maxHp,
  }
}

/**
 * Reduce exhaustion by 1 (floored at 0).
 * @param {RestCharacterSnapshot} char
 * @returns {RestCharacterSnapshot}
 */
export function applyLongRestExhaustion(char) {
  const lv = Math.max(0, Math.floor(Number(char.exhaustionLevel) || 0))
  return {
    ...char,
    exhaustionLevel: Math.max(0, lv - 1),
  }
}

/**
 * Restore hit dice per SRD long rest: regain half of spent dice (minimum 1).
 * @param {{ current: number, max: number }} dice
 * @returns {number} new current count
 */
export function longRestHitDiceRestore(dice) {
  const max = Math.max(0, Math.floor(Number(dice.max) || 0))
  let cur = Math.min(max, Math.max(0, Math.floor(Number(dice.current) || 0)))
  const spent = max - cur
  if (spent <= 0) return cur
  const regain = Math.max(1, Math.floor(spent * (restDoc.longRest.restore.hitDiceFraction ?? 0.5)))
  return Math.min(max, cur + regain)
}
