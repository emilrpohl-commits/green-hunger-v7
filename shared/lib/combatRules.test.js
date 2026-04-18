import { describe, it, expect } from 'vitest'
import {
  makeLegendaryActionState,
  useLegendaryAction,
  resetLegendaryActions,
  makeActionEconomy,
  consumeActionEconomy,
  ensureActionEconomy,
  sortCombatantsByInitiative,
} from './combatRules.js'

describe('makeLegendaryActionState', () => {
  it('defaults to total of 3 with 0 used', () => {
    expect(makeLegendaryActionState()).toEqual({ total: 3, used: 0 })
  })

  it('accepts a custom total', () => {
    expect(makeLegendaryActionState(5)).toEqual({ total: 5, used: 0 })
  })

  it('always starts with 0 used', () => {
    expect(makeLegendaryActionState(1).used).toBe(0)
  })
})

describe('useLegendaryAction', () => {
  it('returns ok: true and increments used when actions remain', () => {
    const combatant = { legendaryActionState: makeLegendaryActionState(3) }
    const result = useLegendaryAction(combatant, 1)
    expect(result.ok).toBe(true)
    expect(result.legendaryActionState.used).toBe(1)
    expect(result.legendaryActionState.total).toBe(3)
  })

  it('supports cost > 1', () => {
    const combatant = { legendaryActionState: makeLegendaryActionState(3) }
    const result = useLegendaryAction(combatant, 2)
    expect(result.ok).toBe(true)
    expect(result.legendaryActionState.used).toBe(2)
  })

  it('returns ok: false when used would exceed total', () => {
    const combatant = { legendaryActionState: { total: 3, used: 3 } }
    const result = useLegendaryAction(combatant, 1)
    expect(result.ok).toBe(false)
    expect(result.legendaryActionState.used).toBe(3)
  })

  it('returns ok: false when cost would exceed remaining', () => {
    const combatant = { legendaryActionState: { total: 3, used: 2 } }
    const result = useLegendaryAction(combatant, 2)
    expect(result.ok).toBe(false)
  })

  it('returns ok: false when combatant has no legendaryActionState', () => {
    const result = useLegendaryAction({ legendaryActionState: null })
    expect(result.ok).toBe(false)
    expect(result.legendaryActionState).toBeNull()
  })

  it('returns ok: false for combatant with no legendary field at all', () => {
    const result = useLegendaryAction({})
    expect(result.ok).toBe(false)
  })

  it('does not mutate the original state', () => {
    const state = makeLegendaryActionState(3)
    const combatant = { legendaryActionState: state }
    useLegendaryAction(combatant, 1)
    expect(state.used).toBe(0)
  })
})

describe('resetLegendaryActions', () => {
  it('resets used to 0', () => {
    const combatant = { legendaryActionState: { total: 3, used: 3 }, name: 'Dragon' }
    const result = resetLegendaryActions(combatant)
    expect(result.legendaryActionState.used).toBe(0)
    expect(result.legendaryActionState.total).toBe(3)
  })

  it('preserves all other combatant fields', () => {
    const combatant = { id: 'dragon-1', name: 'Dragon', curHp: 100, legendaryActionState: { total: 3, used: 2 } }
    const result = resetLegendaryActions(combatant)
    expect(result.id).toBe('dragon-1')
    expect(result.name).toBe('Dragon')
    expect(result.curHp).toBe(100)
  })

  it('returns the combatant unchanged when no legendaryActionState', () => {
    const combatant = { id: 'goblin-1', name: 'Goblin' }
    const result = resetLegendaryActions(combatant)
    expect(result).toBe(combatant)
  })

  it('does not mutate the original combatant', () => {
    const combatant = { legendaryActionState: { total: 3, used: 2 } }
    resetLegendaryActions(combatant)
    expect(combatant.legendaryActionState.used).toBe(2)
  })
})

describe('makeActionEconomy', () => {
  it('returns all actions available', () => {
    expect(makeActionEconomy()).toEqual({
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      movementAvailable: true,
    })
  })
})

describe('consumeActionEconomy', () => {
  it('consumes action', () => {
    const combatant = { actionEconomy: makeActionEconomy() }
    const { ok, actionEconomy } = consumeActionEconomy(combatant, 'action')
    expect(ok).toBe(true)
    expect(actionEconomy.actionAvailable).toBe(false)
    expect(actionEconomy.bonusActionAvailable).toBe(true)
  })

  it('consumes bonus_action', () => {
    const combatant = { actionEconomy: makeActionEconomy() }
    const { ok, actionEconomy } = consumeActionEconomy(combatant, 'bonus_action')
    expect(ok).toBe(true)
    expect(actionEconomy.bonusActionAvailable).toBe(false)
  })

  it('consumes reaction', () => {
    const combatant = { actionEconomy: makeActionEconomy() }
    const { ok, actionEconomy } = consumeActionEconomy(combatant, 'reaction')
    expect(ok).toBe(true)
    expect(actionEconomy.reactionAvailable).toBe(false)
  })

  it('returns ok: false when action already spent', () => {
    const combatant = { actionEconomy: { ...makeActionEconomy(), actionAvailable: false } }
    const { ok } = consumeActionEconomy(combatant, 'action')
    expect(ok).toBe(false)
  })

  it('returns ok: true for unknown action type (special)', () => {
    const combatant = { actionEconomy: makeActionEconomy() }
    const { ok } = consumeActionEconomy(combatant, 'special')
    expect(ok).toBe(true)
  })
})

describe('ensureActionEconomy', () => {
  it('fills missing fields with defaults', () => {
    const result = ensureActionEconomy({ actionEconomy: { actionAvailable: false } })
    expect(result.actionAvailable).toBe(false)
    expect(result.bonusActionAvailable).toBe(true)
    expect(result.reactionAvailable).toBe(true)
  })

  it('works with no actionEconomy field', () => {
    const result = ensureActionEconomy({})
    expect(result).toEqual(makeActionEconomy())
  })
})

describe('sortCombatantsByInitiative', () => {
  it('sorts by initiative descending', () => {
    const combatants = [
      { id: 'a', initiative: 10, name: 'Alice' },
      { id: 'b', initiative: 20, name: 'Bob' },
      { id: 'c', initiative: 15, name: 'Charlie' },
    ]
    const sorted = sortCombatantsByInitiative(combatants)
    expect(sorted.map(c => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('breaks ties by DEX mod descending', () => {
    const combatants = [
      { id: 'a', initiative: 15, name: 'Alice', abilityScores: { DEX: 10 } },
      { id: 'b', initiative: 15, name: 'Bob', abilityScores: { DEX: 16 } },
    ]
    const sorted = sortCombatantsByInitiative(combatants)
    expect(sorted[0].id).toBe('b')
  })

  it('does not mutate the original array', () => {
    const combatants = [{ id: 'a', initiative: 5 }, { id: 'b', initiative: 10 }]
    sortCombatantsByInitiative(combatants)
    expect(combatants[0].id).toBe('a')
  })
})
