/**
 * Spellcasting rules slice (not spell content).
 */
import spellDoc from './catalog/spellcastingRules.json'

export { spellDoc as spellcastingRulesCatalog }

/**
 * DC to maintain concentration after taking damage.
 * @param {number} damageAmount
 * @returns {number}
 */
export function concentrationSaveDc(damageAmount) {
  const base = spellDoc.concentration.conSaveDcBase ?? 10
  const half = Math.floor(Number(damageAmount) / 2)
  return Math.max(base, half)
}
