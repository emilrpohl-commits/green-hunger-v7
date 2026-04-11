import { describe, it, expect } from 'vitest'
import { classifySpellCombat } from './spellCombatClassifier.js'

describe('spellCombatClassifier', () => {
  it('tags concentration and attack path', () => {
    const c = classifySpellCombat({
      name: 'Fire Bolt',
      mechanic: 'attack',
      concentration: false,
      castingTime: '1 action',
      toHit: 5,
      damage: { count: 1, sides: 10, type: 'fire' },
    })
    expect(c.path).toBe('attack')
    expect(c.badges).toContain('Attack roll')
    expect(c.confidence).toBe('high')
  })

  it('marks medium confidence for save without damage', () => {
    const c = classifySpellCombat({
      name: 'Hold Person',
      mechanic: 'save',
      saveType: 'WIS',
      saveDC: 15,
      castingTime: '1 action',
    })
    expect(c.confidence).toBe('medium')
    expect(c.badges).toContain('Saving throw')
  })
})
