function toLowerSet(conditions = []) {
  return new Set((conditions || []).map((c) => String(c || '').toLowerCase()))
}

export function isMeleeProxyRange(attackRange = 'melee') {
  return String(attackRange || 'melee').toLowerCase() !== 'ranged'
}

export function targetHasCritCondition(targetConditions = []) {
  const set = toLowerSet(targetConditions)
  return (
    set.has('paralyzed')
    || set.has('paralysed')
    || set.has('stunned')
    || set.has('unconscious')
  )
}

export function shouldForceCriticalOnHit({ attackRange = 'melee', targetConditions = [] } = {}) {
  return isMeleeProxyRange(attackRange) && targetHasCritCondition(targetConditions)
}

export function autoFailSaveFromConditions(actorConditions = [], saveAbility = '') {
  const set = toLowerSet(actorConditions)
  const ab = String(saveAbility || '').toLowerCase().slice(0, 3)
  if (ab !== 'str' && ab !== 'dex') return false
  return (
    set.has('paralyzed')
    || set.has('paralysed')
    || set.has('stunned')
    || set.has('unconscious')
  )
}
