import { describe, it, expect } from 'vitest'
import { findDiceExpressionsInText, rollDiceExpression } from './diceExpressions.js'

describe('diceExpressions', () => {
  it('finds multiple dice in prose', () => {
    const m = findDiceExpressionsInText('Take 2d6 fire and 1d4 thunder damage.')
    expect(m.length).toBe(2)
    expect(m[0].normalized).toMatch(/^2d6/)
    expect(m[1].normalized).toMatch(/^1d4/)
  })

  it('rolls deterministic with injected RNG', () => {
    let i = 0
    const seq = [3, 4]
    const r = rollDiceExpression('2d6+2', {
      rollDie: () => seq[i++],
    })
    expect(r?.total).toBe(3 + 4 + 2)
    expect(r?.rolls).toEqual([3, 4])
  })
})
