/**
 * Green Mark progression — canonical effect table for The Green Hunger campaign.
 * @typedef {'longRest' | 'combat' | 'passive' | 'dmTriggered'} GreenMarkTriggerKind
 */

/** @type {GreenMarkTriggerKind} */
export const TRIGGER_KIND = {
  LONG_REST: 'longRest',
  COMBAT: 'combat',
  PASSIVE: 'passive',
  DM_TRIGGERED: 'dmTriggered',
}

/**
 * @typedef {Object} GreenMarkEffect
 * @property {number} level
 * @property {string} title
 * @property {string} description
 * @property {boolean} [mechanical]
 * @property {boolean} [narrative]
 * @property {GreenMarkTriggerKind} [trigger]
 * @property {string} [triggerHint] Human-readable when to resolve
 */

/** Canonical registry: mark level → effect (active when current >= level) */
export const GREEN_MARK_EFFECTS = /** @type {GreenMarkEffect[]} */ ([
  {
    level: 1,
    title: 'Nightmares',
    description:
      'Character wakes unrested unless they succeed on a DC 10 Wisdom save during a long rest.',
    mechanical: true,
    narrative: true,
    trigger: TRIGGER_KIND.LONG_REST,
    triggerHint: 'During long rest — DC 10 Wisdom save or unrested',
  },
  {
    level: 2,
    title: 'Visible Corruption',
    description:
      'Minor plant growth visible on skin. Noticeable in social situations; NPCs may react.',
    narrative: true,
    mechanical: false,
    trigger: TRIGGER_KIND.PASSIVE,
    triggerHint: 'Always — social / NPC awareness',
  },
  {
    level: 3,
    title: 'Necrotic Vulnerability',
    description: 'Character takes +50% damage from necrotic sources.',
    mechanical: true,
    narrative: false,
    trigger: TRIGGER_KIND.PASSIVE,
    triggerHint: 'Applies when taking necrotic damage',
  },
  {
    level: 4,
    title: 'Poison Bursts',
    description:
      'Constitution save DC 13 at the start of each long rest or take 1d6 poison damage.',
    mechanical: true,
    narrative: false,
    trigger: TRIGGER_KIND.LONG_REST,
    triggerHint: 'Start of long rest — CON save DC 13 or 1d6 poison',
  },
  {
    level: 5,
    title: 'Root Spirit Possession',
    description:
      'Temporary possession by a root spirit: the DM controls the character for 1d4 rounds, once per long rest.',
    mechanical: true,
    narrative: true,
    trigger: TRIGGER_KIND.DM_TRIGGERED,
    triggerHint: 'Once per long rest — roll 1d4 for rounds',
  },
])

export const GREEN_MARK_MAX_DEFAULT = 10

/**
 * @typedef {Object} GreenMarksState
 * @property {number} current
 * @property {number} [max]
 * @property {string} [lastTriggeredAt] ISO timestamp
 */

/**
 * @param {unknown} raw
 * @returns {{ max?: number, lastTriggeredAt?: string }}
 */
export function parseGreenMarksMeta(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const o = /** @type {Record<string, unknown>} */ (raw)
  const max = Number(o.max)
  const lastTriggeredAt = typeof o.lastTriggeredAt === 'string' ? o.lastTriggeredAt : undefined
  return {
    ...(Number.isFinite(max) && max > 0 ? { max: Math.floor(max) } : {}),
    ...(lastTriggeredAt ? { lastTriggeredAt } : {}),
  }
}

/**
 * @param {number | null | undefined} columnValue
 * @param {unknown} tacticalJson
 * @param {number} [fallback]
 */
export function resolveGreenMarksCurrent(columnValue, tacticalJson, fallback = 0) {
  const tj = tacticalJson && typeof tacticalJson === 'object' ? tacticalJson : {}
  const fromTj = Number(/** @type {Record<string, unknown>} */ (tj).greenMarks)
  const fromCol = Number(columnValue)
  let n = Number.isFinite(fromCol) ? fromCol : (Number.isFinite(fromTj) ? fromTj : fallback)
  if (!Number.isFinite(n) || n < 0) n = 0
  const meta = parseGreenMarksMeta(/** @type {Record<string, unknown>} */ (tj).greenMarksState)
  const cap = meta.max != null ? meta.max : GREEN_MARK_MAX_DEFAULT
  return Math.min(cap, Math.floor(n))
}

/**
 * @param {number} current
 * @returns {GreenMarkEffect[]}
 */
export function getActiveGreenMarkEffects(current) {
  const c = Math.max(0, Math.floor(Number(current) || 0))
  return GREEN_MARK_EFFECTS.filter((e) => e.level <= c).sort((a, b) => a.level - b.level)
}

/**
 * Visual tier for escalation styling (1–2 subtle, 3–4 aggressive, 5 dangerous)
 * @param {number} current
 */
export function greenMarkVisualTier(current) {
  const c = Math.max(0, Math.floor(Number(current) || 0))
  if (c <= 0) return 0
  if (c <= 2) return 1
  if (c <= 4) return 2
  return 3
}

/**
 * @param {GreenMarkEffect} effect
 */
export function greenMarkTriggerLabel(effect) {
  if (!effect.trigger) return null
  switch (effect.trigger) {
    case TRIGGER_KIND.LONG_REST:
      return effect.triggerHint || 'Long rest'
    case TRIGGER_KIND.PASSIVE:
      return 'Passive'
    case TRIGGER_KIND.DM_TRIGGERED:
      return effect.triggerHint || 'DM-triggered'
    case TRIGGER_KIND.COMBAT:
      return effect.triggerHint || 'Combat'
    default:
      return null
  }
}

/**
 * Tag line for compact combat / DM strips
 * @param {number} current
 */
export function greenMarkCombatTags(current) {
  const tags = []
  if (current >= 3) tags.push({ key: 'necrotic', label: 'Vulnerable: Necrotic', level: 3 })
  if (current >= 2) tags.push({ key: 'visible', label: 'Visible Corruption', level: 2 })
  return tags
}

/**
 * @param {unknown} tacticalJson
 */
export function effectiveGreenMarkCap(tacticalJson) {
  const tj = tacticalJson && typeof tacticalJson === 'object' ? tacticalJson : {}
  const meta = parseGreenMarksMeta(/** @type {Record<string, unknown>} */ (tj).greenMarksState)
  return meta.max != null ? meta.max : GREEN_MARK_MAX_DEFAULT
}
