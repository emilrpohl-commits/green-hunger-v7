import { describe, it, expect } from 'vitest'
import { rollD20Test } from './d20Test.js'

describe('rollD20Test', () => {
  it('cancels advantage and disadvantage to a single die', () => {
    let i = 0
    const seq = [3, 7]
    const rollDie = () => {
      const v = seq[i++]
      return v
    }
    const r = rollD20Test(rollDie, { advantage: true, disadvantage: true })
    expect(r.mode).toBe('cancelled')
    expect(r.rolls).toEqual([3])
    expect(r.value).toBe(3)
  })

  it('advantage uses higher', () => {
    const rollDie = ((a) => {
      let i = 0
      return () => a[i++]
    })([4, 18])
    const r = rollD20Test(rollDie, { advantage: true })
    expect(r.value).toBe(18)
    expect(r.rolls).toEqual([4, 18])
  })
})
