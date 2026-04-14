import { buildSpellEffectMetadata } from '@shared/lib/combatRules.js'

export function resolveSpellPath(spell = {}) {
  const mechanic = spell.mechanic || 'utility'
  if (mechanic === 'attack') return 'attack'
  if (mechanic === 'save') return 'save'
  if (mechanic === 'auto') return 'auto'
  if (mechanic === 'heal') return 'heal'
  return 'utility'
}

export function inferHalfOnSuccess(spell = {}) {
  const rules = spell?.combatProfile?.rules || spell?.rules_json || {}
  const onSave = String(rules?.resolution?.on_save || rules?.on_save || '').toLowerCase()
  if (onSave === 'none' || onSave === 'no_damage') return false
  if (onSave === 'half' || onSave === 'half_damage') return true
  if (typeof spell?.halfOnSuccess === 'boolean') return spell.halfOnSuccess
  if (typeof spell?.damageOnSave === 'string' && spell.damageOnSave.toLowerCase().includes('none')) return false
  return false
}

export function makeSavePromptPayload({
  promptId,
  spell,
  casterId,
  casterName,
  targets = [],
  damage = null,
  raw = {},
}) {
  const rules = spell?.combatProfile?.rules || spell?.rules_json || {}
  const effect = buildSpellEffectMetadata(spell)
  const effectKinds = (effect && effect.effect_kinds) || rules.effect_kinds || []
  const saveDc = Number.isFinite(Number(spell.saveDC)) ? Number(spell.saveDC) : 10
  const dcFallback = !Number.isFinite(Number(spell.saveDC))
  return {
    promptId,
    status: 'pending',
    spellName: spell.name,
    casterId,
    casterName,
    saveAbility: spell.saveType,
    saveDc,
    targets,
    damage,
    effect,
    effect_kinds: Array.isArray(effectKinds) ? effectKinds : [],
    resolution_path: resolveSpellPath(spell),
    dcFallback,
    raw,
  }
}

