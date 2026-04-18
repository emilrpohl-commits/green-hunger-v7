import { describe, it, expect } from 'vitest'
import {
  mobHitProbability,
  mobExpectedHits,
  averageNdX,
  mobExpectedDamage,
} from './mobCombat.js'

describe('mobHitProbability', () => {
  it('natural 20 always hits (100% for very low AC)', () => {
    // With AC 1 and +0 bonus, everything except nat 1 hits
    const p = mobHitProbability({ attackBonus: 0, targetAc: 1 })
    expect(p).toBeCloseTo(19 / 20, 4)
  })

  it('natural 1 always misses (very high AC)', () => {
    const p = mobHitProbability({ attackBonus: 0, targetAc: 30 })
    // Only nat 20 hits
    expect(p).toBeCloseTo(1 / 20, 4)
  })

  it('advantage increases hit probability', () => {
    const normal = mobHitProbability({ attackBonus: 5, targetAc: 15 })
    const adv = mobHitProbability({ attackBonus: 5, targetAc: 15, advantage: 'advantage' })
    expect(adv).toBeGreaterThan(normal)
  })

  it('disadvantage decreases hit probability', () => {
    const normal = mobHitProbability({ attackBonus: 5, targetAc: 15 })
    const dis = mobHitProbability({ attackBonus: 5, targetAc: 15, advantage: 'disadvantage' })
    expect(dis).toBeLessThan(normal)
  })

  it('probability is between 0 and 1', () => {
    const p = mobHitProbability({ attackBonus: 3, targetAc: 14 })
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})

describe('mobExpectedHits', () => {
  it('scales linearly with mob count', () => {
    const one = mobExpectedHits({ mobCount: 1, attackBonus: 5, targetAc: 15 })
    const ten = mobExpectedHits({ mobCount: 10, attackBonus: 5, targetAc: 15 })
    expect(ten).toBeCloseTo(one * 10, 5)
  })

  it('returns 0 for mob count of 0', () => {
    expect(mobExpectedHits({ mobCount: 0, attackBonus: 5, targetAc: 15 })).toBe(0)
  })

  it('handles negative mob count as 0', () => {
    expect(mobExpectedHits({ mobCount: -3, attackBonus: 5, targetAc: 15 })).toBe(0)
  })
})

describe('averageNdX', () => {
  it('1d6 average is 3.5', () => {
    expect(averageNdX(1, 6)).toBe(3.5)
  })

  it('2d8 average is 9', () => {
    expect(averageNdX(2, 8)).toBe(9)
  })

  it('adds flat modifier', () => {
    expect(averageNdX(1, 6, 3)).toBe(6.5)
  })

  it('0 dice returns 0 + flat', () => {
    expect(averageNdX(0, 6, 2)).toBe(2)
  })
})

describe('mobExpectedDamage', () => {
  it('equals expected hits × average damage', () => {
    const hitOpts = { mobCount: 5, attackBonus: 5, targetAc: 14 }
    const hits = mobExpectedHits(hitOpts)
    const avgDmg = 7
    expect(mobExpectedDamage(hitOpts, avgDmg)).toBeCloseTo(hits * avgDmg, 5)
  })

  it('returns 0 when no mobs', () => {
    expect(mobExpectedDamage({ mobCount: 0, attackBonus: 5, targetAc: 14 }, 10)).toBe(0)
  })
})
