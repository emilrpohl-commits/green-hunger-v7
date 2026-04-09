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

function normalizeEffectName(effect) {
  return String(effect?.name || effect || '').trim().toLowerCase()
}

export function getAcWithEffects(combatant) {
  const effects = combatant?.effects || []
  let bonus = 0
  for (const e of effects) {
    const name = normalizeEffectName(e)
    if (name === 'shield of faith') bonus += 2
  }
  return (combatant?.ac || 0) + bonus
}

export function applyDeterministicRollModifiers({
  combatant,
  baseRoll,
  rollType, // attack | save | check
  includeGuidance = false,
}) {
  const effects = combatant?.effects || []
  let total = baseRoll
  const applied = []
  for (const e of effects) {
    const name = normalizeEffectName(e)
    if ((rollType === 'attack' || rollType === 'save') && name === 'bane') {
      const r = Math.floor(Math.random() * 4) + 1
      total -= r
      applied.push({ source: 'Bane', op: '-', die: 'd4', roll: r })
    }
    if ((rollType === 'attack' || rollType === 'save') && name === 'bless') {
      const r = Math.floor(Math.random() * 4) + 1
      total += r
      applied.push({ source: 'Bless', op: '+', die: 'd4', roll: r })
    }
    if (includeGuidance && rollType === 'check' && name === 'guidance') {
      const r = Math.floor(Math.random() * 4) + 1
      total += r
      applied.push({ source: 'Guidance', op: '+', die: 'd4', roll: r })
    }
  }
  return { total, applied }
}

const SAVE_PROMPT_PREFIX = '__SAVE_PROMPT__'

export function encodeSavePrompt(payload) {
  return `${SAVE_PROMPT_PREFIX}${JSON.stringify(payload)}`
}

export function decodeSavePrompt(text) {
  const raw = String(text || '')
  if (!raw.startsWith(SAVE_PROMPT_PREFIX)) return null
  try {
    return JSON.parse(raw.slice(SAVE_PROMPT_PREFIX.length))
  } catch {
    return null
  }
}
