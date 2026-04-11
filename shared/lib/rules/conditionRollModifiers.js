/**
 * Condition → advantage / disadvantage and exhaustion D20 penalties (SRD-style).
 */

function setLower(conditions) {
  return new Set((conditions || []).map((c) => String(c).toLowerCase()))
}

/**
 * Cancel if both advantage and disadvantage apply.
 * @param {boolean} advantage
 * @param {boolean} disadvantage
 * @returns {{ advantage: boolean, disadvantage: boolean }}
 */
export function cancelAdvDis(advantage, disadvantage) {
  if (advantage && disadvantage) return { advantage: false, disadvantage: false }
  return { advantage: !!advantage, disadvantage: !!disadvantage }
}

/**
 * SRD: D20 Test roll reduced by 2 × exhaustion level.
 * @param {number} level 0–6
 * @returns {number}
 */
export function exhaustionPenaltyOnD20(level) {
  const lv = Math.max(0, Math.min(6, Math.floor(Number(level) || 0)))
  return 2 * lv
}

/**
 * @param {string[]} attackerConditions
 * @param {string[]} [targetConditions]
 * @param {{ attackRange?: 'melee' | 'ranged' }} [options]
 * @returns {{ advantage: boolean, disadvantage: boolean }}
 */
export function attackRollModifiersFromConditions(attackerConditions, targetConditions = [], options = {}) {
  const range = options.attackRange === 'ranged' ? 'ranged' : 'melee'
  const a = setLower(attackerConditions)
  const t = setLower(targetConditions)
  let advantage = false
  let disadvantage = false

  if (a.has('poisoned') || a.has('blinded')) disadvantage = true
  if (a.has('frightened')) disadvantage = true
  if (a.has('prone')) disadvantage = true
  if (a.has('invisible')) advantage = true
  if (
    a.has('stunned') || a.has('paralyzed') || a.has('paralysed')
    || a.has('incapacitated') || a.has('unconscious') || a.has('petrified')
  ) {
    disadvantage = true
  }

  if (t.has('prone')) {
    if (range === 'melee') advantage = true
    else disadvantage = true
  }

  return cancelAdvDis(advantage, disadvantage)
}

/**
 * @param {string[]} actorConditions
 * @returns {{ advantage: boolean, disadvantage: boolean }}
 */
export function abilityCheckModifiersFromConditions(actorConditions) {
  const c = setLower(actorConditions)
  let disadvantage = c.has('poisoned')
  if (c.has('frightened')) disadvantage = true
  return cancelAdvDis(false, disadvantage)
}

/**
 * @param {string[]} actorConditions
 * @param {string} [saveAbility] e.g. DEX, STR
 * @returns {{ advantage: boolean, disadvantage: boolean }}
 */
export function savingThrowModifiersFromConditions(actorConditions, saveAbility = '') {
  const c = setLower(actorConditions)
  const ab = String(saveAbility || '').toLowerCase().slice(0, 3)
  let disadvantage = false
  if (ab === 'dex' && c.has('restrained')) disadvantage = true
  return cancelAdvDis(false, disadvantage)
}

/**
 * @param {object} ctx
 * @param {'attack'|'check'|'save'} ctx.rollKind
 * @param {string[]} ctx.actorConditions
 * @param {number} [ctx.exhaustionLevel]
 * @param {string[]} [ctx.targetConditions]
 * @param {{ attackRange?: 'melee'|'ranged' }} [ctx.options]
 * @param {string} [ctx.saveAbility]
 * @returns {{ advantage: boolean, disadvantage: boolean, exhaustionPenalty: number }}
 */
export function resolvePlayerD20Modifiers(ctx = {}) {
  const {
    rollKind = 'check',
    actorConditions = [],
    exhaustionLevel = 0,
    targetConditions = [],
    options = {},
    saveAbility = '',
  } = ctx

  let advDis = { advantage: false, disadvantage: false }
  if (rollKind === 'attack') {
    advDis = attackRollModifiersFromConditions(actorConditions, targetConditions, options)
  } else if (rollKind === 'save') {
    advDis = savingThrowModifiersFromConditions(actorConditions, saveAbility)
  } else {
    advDis = abilityCheckModifiersFromConditions(actorConditions)
  }

  return {
    ...advDis,
    exhaustionPenalty: exhaustionPenaltyOnD20(exhaustionLevel),
  }
}
