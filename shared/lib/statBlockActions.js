/**
 * Normalize and validate stat block action JSON (stat_blocks.actions / bonus_actions / reactions).
 * See docs/STAT_BLOCK_ACTION_SCHEMA.md
 */

const ACTION_LIST_KEYS = ['actions', 'bonus_actions', 'reactions', 'legendary_actions', 'lair_actions']

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeStatBlockAction(raw = {}) {
  const existingRes = raw.resolution && typeof raw.resolution === 'object' ? raw.resolution : {}
  const saveHint = raw.saveType || raw.save_ability || existingRes.save_ability
  const inferredKind = existingRes.kind
    || (saveHint
      ? 'save'
      : (raw.toHit != null || raw.to_hit != null || raw.attackBonus != null || raw.attack_bonus != null
        ? 'attack'
        : 'other'))

  const resolution = {
    kind: inferredKind,
    save_ability: existingRes.save_ability || (typeof saveHint === 'string' ? saveHint.toUpperCase().slice(0, 3) : null),
    dc: existingRes.dc ?? raw.dc ?? raw.DC ?? null,
    on_save: existingRes.on_save || null,
    tags: Array.isArray(existingRes.tags) ? existingRes.tags : [],
  }

  let damage = raw.damage
  if (!Array.isArray(damage)) {
    const dice = raw.damageDice || raw.damage_dice
    const type = raw.damage_type || raw.damageType
    if (dice || type) damage = [{ dice: dice || null, type: type || null }]
    else damage = []
  }

  const recharge = raw.recharge && typeof raw.recharge === 'object' ? raw.recharge : null

  return {
    ...raw,
    resolution,
    damage,
    recharge,
    /** Mirrors resolution.kind for UI (`save` | `attack` | `other`). */
    actionKind: inferredKind,
  }
}

/**
 * @param {Record<string, unknown>} sb - stat block row (snake or camel)
 */
export function normalizeStatBlockActions(sb = {}) {
  const next = { ...sb }
  for (const key of ACTION_LIST_KEYS) {
    if (!Array.isArray(next[key])) continue
    next[key] = next[key].map((a) => normalizeStatBlockAction(a))
  }
  return next
}

/**
 * @param {Record<string, unknown>} sb
 * @returns {{ ok: boolean, warnings: string[] }}
 */
export function validateStatBlock(sb = {}) {
  const warnings = []
  for (const key of ['actions', 'bonus_actions', 'reactions']) {
    const arr = sb[key] || []
    arr.forEach((a, i) => {
      if (!a?.name) warnings.push(`${key}[${i}]: missing name`)
      const res = a.resolution || {}
      if (res.kind === 'save' && !res.save_ability && !a.saveType) {
        warnings.push(`${key}[${i}] "${a.name || '?'}": save kind but no save_ability`)
      }
    })
  }
  return { ok: warnings.length === 0, warnings }
}
