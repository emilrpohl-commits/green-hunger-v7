import { isMonsterSaveAction } from './combat/monsterActionAdapter.js'

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
  const rules = spell?.combatProfile?.rules || spell?.rules_json || {}
  const card = rules.card || {}
  if (card.short_effect || card.mechanic) {
    return {
      name: card.name || spell?.name || 'Spell',
      mechanic: card.mechanic || card.short_effect,
      deterministic: !!card.deterministic,
      effect_kinds: Array.isArray(rules.effect_kinds) ? rules.effect_kinds : [],
      control: card.control || null,
    }
  }
  const spellId = String(spell?.spellId || spell?.spell_id || spell?.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
  const mapping = {
    bane: { name: 'Bane', mechanic: '-1d4 attacks & saves', deterministic: true, effect_kinds: ['debuff'] },
    bless: { name: 'Bless', mechanic: '+1d4 attacks & saves', deterministic: true, effect_kinds: ['buff'] },
    faerie_fire: { name: 'Faerie Fire', mechanic: 'Attacks vs target have advantage', deterministic: true, effect_kinds: ['debuff'] },
    hex: { name: 'Hex', mechanic: 'Marked by Hex', deterministic: true, effect_kinds: ['debuff'] },
    hunters_mark: { name: "Hunter's Mark", mechanic: 'Marked by Hunter', deterministic: true, effect_kinds: ['debuff'] },
    guiding_bolt: { name: 'Guiding Bolt', mechanic: 'Next attack has advantage', deterministic: true, effect_kinds: ['damage', 'buff'] },
    shield_of_faith: { name: 'Shield of Faith', mechanic: '+2 AC', deterministic: true, effect_kinds: ['buff'] },
    sanctuary: { name: 'Sanctuary', mechanic: 'Protection ward', deterministic: true, effect_kinds: ['buff'] },
  }
  return mapping[spellId] || null
}

function normalizeEffectName(effect) {
  return String(effect?.name || effect || '').trim().toLowerCase()
}

export function normalizeEffectRecord(effect, defaults = {}) {
  if (typeof effect === 'string') {
    return {
      name: effect,
      source: defaults.source || null,
      deterministic: ['bane', 'bless', 'shield of faith', 'guidance'].includes(normalizeEffectName(effect)),
      duration_rounds: defaults.duration_rounds ?? null,
      applied_at: defaults.applied_at || new Date().toISOString(),
    }
  }
  const name = effect?.name || 'Effect'
  return {
    ...effect,
    name,
    source: effect?.source ?? defaults.source ?? null,
    deterministic: effect?.deterministic ?? ['bane', 'bless', 'shield of faith', 'guidance'].includes(normalizeEffectName(name)),
    duration_rounds: effect?.duration_rounds ?? defaults.duration_rounds ?? null,
    applied_at: effect?.applied_at || new Date().toISOString(),
  }
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
const PLAYER_SAVE_PROMPT_PREFIX = '__PLAYER_SAVE_PROMPT__'

export function encodeSavePrompt(payload) {
  return `${SAVE_PROMPT_PREFIX}${JSON.stringify(payload)}`
}

export function makeSavePromptEnvelope(payload = {}) {
  return {
    status: payload.status || 'pending',
    visibility: payload.visibility || 'targeted',
    promptId: payload.promptId,
    ...payload,
  }
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

export function encodePlayerSavePrompt(payload) {
  return `${PLAYER_SAVE_PROMPT_PREFIX}${JSON.stringify(payload)}`
}

export function decodePlayerSavePrompt(text) {
  const raw = String(text || '')
  if (!raw.startsWith(PLAYER_SAVE_PROMPT_PREFIX)) return null
  try {
    return JSON.parse(raw.slice(PLAYER_SAVE_PROMPT_PREFIX.length))
  } catch {
    return null
  }
}

/**
 * Build damage metadata for player-side resolution of monster save-based abilities.
 * Parses parenthetical XdY from stat-block strings (e.g. Toll the Dead: 2d12 hurt / 2d8 full HP).
 */
export function buildSavePromptDamageMeta(selected) {
  if (!selected || !isMonsterSaveAction(selected)) return null

  if (Array.isArray(selected.damage) && selected.damage.length > 0) {
    const parseNdM = (s) => {
      const m = String(s ?? '').match(/(\d+)\s*d\s*(\d+)/i)
      return m ? { count: Number(m[1]), sides: Number(m[2]) } : null
    }
    const rowDice = (row) => {
      if (row && typeof row === 'object' && row.dice != null) return row.dice
      if (typeof row === 'string') return row
      return null
    }
    const rowType = (row) => {
      if (row && typeof row === 'object' && row.type) return String(row.type).toLowerCase()
      return null
    }
    const half =
      selected.resolution?.on_save == null
      || selected.resolution?.on_save === 'half_damage'
      || selected.resolution?.on_save === 'half'

    const rows = selected.damage
    if (rows.length >= 2) {
      const d1 = parseNdM(rowDice(rows[0]))
      const d2 = parseNdM(rowDice(rows[1]))
      if (d1 && d2) {
        return {
          variant: 'toll-the-dead',
          diceWhenHurt: d1,
          diceWhenFullHp: d2,
          halfOnSuccess: half,
          damageType: rowType(rows[0]) || rowType(rows[1]),
        }
      }
    }
    const d0 = parseNdM(rowDice(rows[0]))
    if (d0) {
      return {
        variant: 'single',
        diceOnFail: d0,
        halfOnSuccess: half,
        damageType: rowType(rows[0]),
      }
    }
  }

  const raw = selected.damage
  if (raw == null) return null
  const str = String(raw)
  const matches = [...str.matchAll(/\((\d+)d(\d+)\)/g)]
  const damageTypeMatch = str.match(/\b(acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder|bludgeoning|piercing|slashing)\b/i)
  const damageType = damageTypeMatch ? damageTypeMatch[1].toLowerCase() : null
  if (matches.length >= 2) {
    return {
      variant: 'toll-the-dead',
      diceWhenHurt: { count: Number(matches[0][1]), sides: Number(matches[0][2]) },
      diceWhenFullHp: { count: Number(matches[1][1]), sides: Number(matches[1][2]) },
      halfOnSuccess: true,
      damageType,
    }
  }
  if (matches.length === 1) {
    return {
      variant: 'single',
      diceOnFail: { count: Number(matches[0][1]), sides: Number(matches[0][2]) },
      halfOnSuccess: true,
      damageType,
    }
  }
  return null
}
