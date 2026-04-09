import { buildSpellEffectMetadata } from '@shared/lib/combatRules.js'

export function resolveSpellPath(spell = {}) {
  const mechanic = spell.mechanic || 'utility'
  if (mechanic === 'attack') return 'attack'
  if (mechanic === 'save') return 'save'
  if (mechanic === 'auto') return 'auto'
  if (mechanic === 'heal') return 'heal'
  return 'utility'
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
  return {
    promptId,
    status: 'pending',
    spellName: spell.name,
    casterId,
    casterName,
    saveAbility: spell.saveType,
    saveDc: spell.saveDC,
    targets,
    damage,
    effect: buildSpellEffectMetadata(spell),
    raw,
  }
}

