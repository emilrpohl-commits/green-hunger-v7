import { describe, it, expect } from 'vitest'
import { parseCombatantsArray, filterValidCharacterRows } from './storeBoundaries.js'

describe('parseCombatantsArray', () => {
  it('accepts valid combatants with string ids', () => {
    const raw = [{ id: 'a', curHp: 10 }, { id: 'b', name: 'Goblin' }]
    expect(parseCombatantsArray(raw)).toHaveLength(2)
  })

  it('drops entries missing id', () => {
    const raw = [{ id: 'ok' }, { curHp: 5 }]
    expect(parseCombatantsArray(raw)).toEqual([{ id: 'ok' }])
  })

  it('parses JSON string', () => {
    const raw = JSON.stringify([{ id: 'x' }])
    expect(parseCombatantsArray(raw)).toEqual([{ id: 'x' }])
  })
})

describe('filterValidCharacterRows', () => {
  it('requires id string', () => {
    expect(filterValidCharacterRows([{ id: 'pc1', name: 'A' }, { name: 'bad' }])).toHaveLength(1)
  })
})
