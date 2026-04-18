import { describe, it, expect } from 'vitest'
import {
  cancelAdvDis,
  exhaustionPenaltyOnD20,
  attackRollModifiersFromConditions,
  abilityCheckModifiersFromConditions,
  savingThrowModifiersFromConditions,
  resolvePlayerD20Modifiers,
} from './conditionRollModifiers.js'

describe('cancelAdvDis', () => {
  it('cancels when both advantage and disadvantage are true', () => {
    expect(cancelAdvDis(true, true)).toEqual({ advantage: false, disadvantage: false })
  })

  it('keeps advantage when only advantage', () => {
    expect(cancelAdvDis(true, false)).toEqual({ advantage: true, disadvantage: false })
  })

  it('keeps disadvantage when only disadvantage', () => {
    expect(cancelAdvDis(false, true)).toEqual({ advantage: false, disadvantage: true })
  })

  it('returns neither when both false', () => {
    expect(cancelAdvDis(false, false)).toEqual({ advantage: false, disadvantage: false })
  })
})

describe('exhaustionPenaltyOnD20', () => {
  it('level 0 gives no penalty', () => {
    expect(exhaustionPenaltyOnD20(0)).toBe(0)
  })

  it('level 1 gives penalty of 2', () => {
    expect(exhaustionPenaltyOnD20(1)).toBe(2)
  })

  it('level 5 gives penalty of 10', () => {
    expect(exhaustionPenaltyOnD20(5)).toBe(10)
  })

  it('clamps at level 6 (max 12)', () => {
    expect(exhaustionPenaltyOnD20(6)).toBe(12)
    expect(exhaustionPenaltyOnD20(99)).toBe(12)
  })

  it('clamps at level 0 (min 0)', () => {
    expect(exhaustionPenaltyOnD20(-3)).toBe(0)
  })
})

describe('attackRollModifiersFromConditions', () => {
  it('poisoned attacker has disadvantage', () => {
    const r = attackRollModifiersFromConditions(['poisoned'])
    expect(r.disadvantage).toBe(true)
  })

  it('blinded attacker has disadvantage', () => {
    const r = attackRollModifiersFromConditions(['blinded'])
    expect(r.disadvantage).toBe(true)
  })

  it('invisible attacker has advantage', () => {
    const r = attackRollModifiersFromConditions(['invisible'])
    expect(r.advantage).toBe(true)
  })

  it('prone target gives melee attacker advantage', () => {
    const r = attackRollModifiersFromConditions([], ['prone'], { attackRange: 'melee' })
    expect(r.advantage).toBe(true)
  })

  it('prone target gives ranged attacker disadvantage', () => {
    const r = attackRollModifiersFromConditions([], ['prone'], { attackRange: 'ranged' })
    expect(r.disadvantage).toBe(true)
  })

  it('paralyzed target gives advantage', () => {
    const r = attackRollModifiersFromConditions([], ['paralyzed'])
    expect(r.advantage).toBe(true)
  })

  it('stunned attacker also cancels out with advantage source', () => {
    // stunned gives attacker disadvantage; invisible gives advantage → cancel
    const r = attackRollModifiersFromConditions(['stunned', 'invisible'])
    expect(r.advantage).toBe(false)
    expect(r.disadvantage).toBe(false)
  })

  it('no conditions → neither advantage nor disadvantage', () => {
    const r = attackRollModifiersFromConditions([])
    expect(r.advantage).toBe(false)
    expect(r.disadvantage).toBe(false)
  })

  it('case-insensitive condition matching', () => {
    const r = attackRollModifiersFromConditions(['Poisoned'])
    expect(r.disadvantage).toBe(true)
  })
})

describe('abilityCheckModifiersFromConditions', () => {
  it('poisoned gives disadvantage on ability checks', () => {
    expect(abilityCheckModifiersFromConditions(['poisoned']).disadvantage).toBe(true)
  })

  it('frightened gives disadvantage', () => {
    expect(abilityCheckModifiersFromConditions(['frightened']).disadvantage).toBe(true)
  })

  it('no conditions gives neither', () => {
    const r = abilityCheckModifiersFromConditions([])
    expect(r.advantage).toBe(false)
    expect(r.disadvantage).toBe(false)
  })
})

describe('savingThrowModifiersFromConditions', () => {
  it('restrained gives disadvantage on DEX saves', () => {
    const r = savingThrowModifiersFromConditions(['restrained'], 'DEX')
    expect(r.disadvantage).toBe(true)
  })

  it('restrained does not affect STR saves', () => {
    const r = savingThrowModifiersFromConditions(['restrained'], 'STR')
    expect(r.disadvantage).toBe(false)
  })

  it('paralyzed auto-fails STR saves', () => {
    const r = savingThrowModifiersFromConditions(['paralyzed'], 'STR')
    expect(r.autoFail).toBe(true)
  })

  it('paralyzed auto-fails DEX saves', () => {
    const r = savingThrowModifiersFromConditions(['paralyzed'], 'DEX')
    expect(r.autoFail).toBe(true)
  })

  it('paralyzed does not auto-fail CON saves', () => {
    const r = savingThrowModifiersFromConditions(['paralyzed'], 'CON')
    expect(r.autoFail).toBe(false)
  })
})

describe('resolvePlayerD20Modifiers', () => {
  it('combines exhaustion penalty with condition modifiers', () => {
    const r = resolvePlayerD20Modifiers({
      rollKind: 'check',
      actorConditions: ['poisoned'],
      exhaustionLevel: 2,
    })
    expect(r.disadvantage).toBe(true)
    expect(r.exhaustionPenalty).toBe(4)
  })

  it('handles attack roll kind', () => {
    const r = resolvePlayerD20Modifiers({
      rollKind: 'attack',
      actorConditions: ['invisible'],
      targetConditions: [],
    })
    expect(r.advantage).toBe(true)
  })

  it('handles save roll kind', () => {
    const r = resolvePlayerD20Modifiers({
      rollKind: 'save',
      actorConditions: ['restrained'],
      saveAbility: 'DEX',
    })
    expect(r.disadvantage).toBe(true)
  })

  it('defaults to check with no conditions → no modifier', () => {
    const r = resolvePlayerD20Modifiers({})
    expect(r.advantage).toBe(false)
    expect(r.disadvantage).toBe(false)
    expect(r.exhaustionPenalty).toBe(0)
  })
})
