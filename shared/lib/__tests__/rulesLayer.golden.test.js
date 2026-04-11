import { describe, it, expect } from 'vitest'
import { resolveSpellPath, makeSavePromptPayload } from '../domain/spellResolution.js'
import { normalizeStatBlockAction, validateStatBlock } from '../statBlockActions.js'

describe('rules layer golden', () => {
  it('resolveSpellPath maps mechanics', () => {
    expect(resolveSpellPath({ mechanic: 'save' })).toBe('save')
    expect(resolveSpellPath({ mechanic: 'attack' })).toBe('attack')
    expect(resolveSpellPath({ mechanic: 'heal' })).toBe('heal')
  })

  it('makeSavePromptPayload includes classification fields', () => {
    const p = makeSavePromptPayload({
      promptId: 'test-prompt-1',
      spell: { name: 'Bane', saveType: 'CHA', saveDC: 14, mechanic: 'save' },
      casterId: 'dorothea',
      casterName: 'Dorothea',
      targets: [{ id: 'goblin-1', name: 'Goblin' }],
    })
    expect(p.resolution_path).toBe('save')
    expect(p.saveAbility).toBe('CHA')
    expect(p.saveDc).toBe(14)
    expect(p.effect).toBeTruthy()
    expect(Array.isArray(p.effect_kinds)).toBe(true)
  })

  it('normalizeStatBlockAction infers save kind', () => {
    const n = normalizeStatBlockAction({ name: 'Breath', saveType: 'DEX', dc: 15 })
    expect(n.resolution.kind).toBe('save')
    expect(n.resolution.dc).toBe(15)
    expect(n.actionKind).toBe('save')
  })

  it('validateStatBlock warns on unnamed action', () => {
    const v = validateStatBlock({ actions: [{}], bonus_actions: [], reactions: [] })
    expect(v.warnings.some(w => w.includes('missing name'))).toBe(true)
  })
})
