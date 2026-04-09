export function parseCastingTimeMeta(castingTime) {
  const raw = String(castingTime || '').trim().toLowerCase()
  if (!raw) {
    return {
      actionType: 'special',
      isBonusAction: false,
      isReaction: false,
      castingTimeLabel: 'Special',
    }
  }

  if (raw.includes('bonus action')) {
    return {
      actionType: 'bonus_action',
      isBonusAction: true,
      isReaction: false,
      castingTimeLabel: 'Bonus Action',
    }
  }
  if (raw.includes('reaction')) {
    return {
      actionType: 'reaction',
      isBonusAction: false,
      isReaction: true,
      castingTimeLabel: 'Reaction',
    }
  }
  if (raw.includes('action')) {
    return {
      actionType: 'action',
      isBonusAction: false,
      isReaction: false,
      castingTimeLabel: 'Action',
    }
  }

  return {
    actionType: 'special',
    isBonusAction: false,
    isReaction: false,
    castingTimeLabel: raw,
  }
}

export function getCombatantDexMod(combatant) {
  const dex = combatant?.abilityScores?.DEX ?? combatant?.stats?.DEX ?? 10
  return Math.floor((dex - 10) / 2)
}

export function sortCombatantsByInitiative(combatants = []) {
  return [...combatants].sort((a, b) => {
    const init = (b.initiative || 0) - (a.initiative || 0)
    if (init !== 0) return init
    const dex = getCombatantDexMod(b) - getCombatantDexMod(a)
    if (dex !== 0) return dex
    const name = String(a.name || '').localeCompare(String(b.name || ''))
    if (name !== 0) return name
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}

export function makeActionEconomy() {
  return {
    actionAvailable: true,
    bonusActionAvailable: true,
    reactionAvailable: true,
    movementAvailable: true,
  }
}

export function ensureActionEconomy(combatant) {
  return {
    ...makeActionEconomy(),
    ...(combatant?.actionEconomy || {}),
  }
}

export function consumeActionEconomy(combatant, actionType) {
  const actionEconomy = ensureActionEconomy(combatant)
  if (actionType === 'action') {
    if (!actionEconomy.actionAvailable) return { ok: false, actionEconomy }
    return { ok: true, actionEconomy: { ...actionEconomy, actionAvailable: false } }
  }
  if (actionType === 'bonus_action') {
    if (!actionEconomy.bonusActionAvailable) return { ok: false, actionEconomy }
    return { ok: true, actionEconomy: { ...actionEconomy, bonusActionAvailable: false } }
  }
  if (actionType === 'reaction') {
    if (!actionEconomy.reactionAvailable) return { ok: false, actionEconomy }
    return { ok: true, actionEconomy: { ...actionEconomy, reactionAvailable: false } }
  }
  return { ok: true, actionEconomy }
}

export function buildSpellEffectMetadata(spell) {
  const spellId = String(spell?.spellId || spell?.spell_id || spell?.name || '').toLowerCase()
  const mapping = {
    bane: { name: 'Bane', mechanic: '-1d4 attacks & saves', deterministic: true },
    bless: { name: 'Bless', mechanic: '+1d4 attacks & saves', deterministic: true },
    faerie_fire: { name: 'Faerie Fire', mechanic: 'Attacks vs target have advantage', deterministic: true },
    hex: { name: 'Hex', mechanic: 'Marked by Hex', deterministic: true },
    hunters_mark: { name: "Hunter's Mark", mechanic: 'Marked by Hunter', deterministic: true },
    guiding_bolt: { name: 'Guiding Bolt', mechanic: 'Next attack has advantage', deterministic: true },
    shield_of_faith: { name: 'Shield of Faith', mechanic: '+2 AC', deterministic: true },
    sanctuary: { name: 'Sanctuary', mechanic: 'Protection ward', deterministic: true },
  }
  return mapping[spellId] || null
}
