import { resolveSpellPath } from '@shared/lib/domain/spellResolution.js'
import { parseCastingTimeMeta } from '@shared/lib/combatRules.js'

/**
 * @typedef {'high'|'medium'|'low'} SpellCombatConfidence
 */

/**
 * Labels for spell combat UX (badges, tooltips).
 * @param {Record<string, unknown>} spell
 */
export function classifySpellCombat(spell = {}) {
  const path = resolveSpellPath(spell)
  /** @type {string[]} */
  const badges = []

  const ct = parseCastingTimeMeta(spell.castingTime)
  if (ct.isBonusAction) badges.push('Bonus action')
  else if (ct.isReaction) badges.push('Reaction')
  else if (ct.actionType === 'action') badges.push('Action')

  if (spell.concentration) badges.push('Concentration')
  const area = spell.combatProfile?.area
  if (area && typeof area === 'object' && Object.keys(area).length > 0) badges.push('Area')

  if (path === 'attack') badges.push('Attack roll')
  if (path === 'save') badges.push('Saving throw')
  if (path === 'heal') badges.push('Healing')
  if (path === 'auto') badges.push('Auto-hit')
  if (path === 'utility') badges.push('Utility')

  /** @type {SpellCombatConfidence} */
  let confidence = 'high'
  if (path === 'utility') confidence = 'low'
  else if (path === 'save' && !spell.damage) confidence = 'medium'
  else if (path === 'save' && (spell.saveDC == null || spell.saveType == null)) confidence = 'medium'
  else if (path === 'attack' && (spell.toHit == null || !spell.damage)) confidence = 'medium'

  return { path, badges, confidence, castingMeta: ct }
}
