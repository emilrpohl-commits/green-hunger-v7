import { describe, it, expect } from 'vitest'
import { adaptMonsterAction, inferMonsterActionKind, monsterActionToHit } from './monsterActionAdapter.js'

describe('monsterActionAdapter', () => {
  it('treats resolution.kind save as save', () => {
    const a = adaptMonsterAction({
      name: 'Breath',
      resolution: { kind: 'save', save_ability: 'DEX', dc: 14 },
      damage: [{ dice: '4d6', type: 'fire' }],
    })
    expect(a.actionKind).toBe('save')
    expect(a.saveDC).toBe(14)
  })

  it('reads toHit from attack_bonus', () => {
    expect(monsterActionToHit({ attack_bonus: 7 })).toBe(7)
    expect(inferMonsterActionKind({ attack_bonus: 7 })).toBe('attack')
  })
})
