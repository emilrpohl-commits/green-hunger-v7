/**
 * Unify stat block / engine monster actions for combat UI (save vs attack, hit bonus, DC).
 */

import { normalizeDamageTypeId } from '@shared/lib/rules/damagePipeline.js'

/**
 * @param {Record<string, unknown>} raw
 * @returns {import('./combatDomain.js').MonsterActionKind}
 */
export function inferMonsterActionKind(raw = {}) {
  const t = String(raw.type || '').toLowerCase()
  if (t === 'trait' || t === 'special') return t === 'trait' ? 'trait' : 'special'

  const res = raw.resolution && typeof raw.resolution === 'object' ? raw.resolution : {}
  const kind = String(res.kind || '').toLowerCase()
  if (kind === 'save') return 'save'
  if (kind === 'attack') return 'attack'

  if (raw.saveType || res.save_ability) return 'save'

  const hasHit =
    raw.toHit != null
    || raw.to_hit != null
    || raw.attackBonus != null
    || raw.attack_bonus != null

  if (hasHit) return 'attack'

  if (kind === 'other' || !kind) {
    if (Array.isArray(raw.damage) && raw.damage.length > 0) return 'attack'
    if (typeof raw.damage === 'string' && /\d+d\d+/i.test(raw.damage)) return 'attack'
  }

  return 'other'
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {number|null}
 */
export function monsterActionToHit(raw = {}) {
  const n = (v) => {
    const x = Number(v)
    return Number.isFinite(x) ? x : null
  }
  return n(raw.toHit) ?? n(raw.to_hit) ?? n(raw.attackBonus) ?? n(raw.attack_bonus)
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ saveType: string, saveDC: number } | null}
 */
export function monsterActionSave(raw = {}) {
  const res = raw.resolution && typeof raw.resolution === 'object' ? raw.resolution : {}
  const st =
    (typeof raw.saveType === 'string' && raw.saveType)
    || (typeof res.save_ability === 'string' && res.save_ability)
  if (!st) return null
  const upper = String(st).toUpperCase().slice(0, 3)
  const dcRaw = raw.saveDC ?? raw.dc ?? raw.DC ?? res.dc
  const saveDC = Number(dcRaw)
  return {
    saveType: upper,
    saveDC: Number.isFinite(saveDC) ? saveDC : 12,
  }
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {import('./combatDomain.js').CombatAction}
 */
export function adaptMonsterAction(raw = {}) {
  const actionKind = inferMonsterActionKind(raw)
  const save = actionKind === 'save' ? monsterActionSave(raw) : null
  const toHit = actionKind === 'attack' ? monsterActionToHit(raw) : null

  let damage = raw.damage
  if (!Array.isArray(damage) && damage != null) {
    damage = [{ dice: String(damage), type: null }]
  }
  if (!Array.isArray(damage)) damage = []

  return {
    actionKind,
    name: String(raw.name || 'Action'),
    desc: typeof raw.desc === 'string' ? raw.desc : (typeof raw.description === 'string' ? raw.description : ''),
    actionType: raw.actionType || 'action',
    toHit: toHit ?? null,
    saveType: save?.saveType ?? null,
    saveDC: save?.saveDC ?? null,
    damage,
    raw,
  }
}

/**
 * For prompts / legacy code that expects `type === 'save'`.
 * @param {Record<string, unknown>} raw
 */
export function isMonsterSaveAction(raw = {}) {
  return inferMonsterActionKind(raw) === 'save'
}

/**
 * Build a shallow copy of the raw action with legacy fields set so older helpers work.
 * @param {Record<string, unknown>} raw
 */
export function withLegacyMonsterActionFields(raw = {}) {
  const adapted = adaptMonsterAction(raw)
  const out = { ...raw }
  if (adapted.actionKind === 'save') {
    out.type = 'save'
    if (adapted.saveType) out.saveType = adapted.saveType
    if (adapted.saveDC != null) out.saveDC = adapted.saveDC
  } else if (adapted.actionKind === 'attack') {
    if (out.type !== 'special' && out.type !== 'trait') out.type = out.type || 'attack'
    if (adapted.toHit != null && out.toHit == null && out.to_hit == null) out.toHit = adapted.toHit
  }
  return out
}

/**
 * Primary damage type from adapted damage[] or string fallback.
 * @param {import('./combatDomain.js').CombatAction} adapted
 */
export function primaryTypeFromAdaptedDamage(adapted) {
  const arr = adapted?.damage
  if (!Array.isArray(arr) || arr.length === 0) return null
  const first = arr[0]
  if (first && typeof first === 'object' && first.type != null) {
    return normalizeDamageTypeId(first.type)
  }
  return null
}
