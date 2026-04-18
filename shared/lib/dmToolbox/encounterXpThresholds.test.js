import { describe, it, expect } from 'vitest'
import {
  XP_THRESHOLDS_BY_LEVEL,
  partyXpBudget,
} from './encounterXpThresholds.js'

describe('XP_THRESHOLDS_BY_LEVEL', () => {
  it('has entries for levels 1 through 20', () => {
    for (let lv = 1; lv <= 20; lv++) {
      expect(XP_THRESHOLDS_BY_LEVEL[lv]).toBeDefined()
    }
  })

  it('each entry has easy, medium, hard, and deadly', () => {
    for (const row of Object.values(XP_THRESHOLDS_BY_LEVEL)) {
      expect(row).toHaveProperty('easy')
      expect(row).toHaveProperty('medium')
      expect(row).toHaveProperty('hard')
      expect(row).toHaveProperty('deadly')
    }
  })

  it('thresholds increase with level for medium difficulty', () => {
    for (let lv = 1; lv < 20; lv++) {
      expect(XP_THRESHOLDS_BY_LEVEL[lv].medium).toBeLessThanOrEqual(
        XP_THRESHOLDS_BY_LEVEL[lv + 1].medium,
      )
    }
  })

  it('deadly is always greater than hard', () => {
    for (const row of Object.values(XP_THRESHOLDS_BY_LEVEL)) {
      expect(row.deadly).toBeGreaterThan(row.hard)
    }
  })
})

describe('partyXpBudget', () => {
  it('returns per-character threshold × party size', () => {
    const perChar = XP_THRESHOLDS_BY_LEVEL[5].hard
    expect(partyXpBudget(5, 'hard', 4)).toBe(perChar * 4)
  })

  it('clamps level below 1 to level 1', () => {
    expect(partyXpBudget(0, 'medium', 4)).toBe(partyXpBudget(1, 'medium', 4))
  })

  it('clamps level above 20 to level 20', () => {
    expect(partyXpBudget(25, 'medium', 4)).toBe(partyXpBudget(20, 'medium', 4))
  })

  it('treats party size 0 as the default of 4', () => {
    expect(partyXpBudget(5, 'easy', 0)).toBe(partyXpBudget(5, 'easy', 4))
  })

  it('clamps negative party size to minimum of 1', () => {
    expect(partyXpBudget(5, 'easy', -5)).toBe(partyXpBudget(5, 'easy', 1))
  })

  it('clamps party size to maximum of 12', () => {
    expect(partyXpBudget(5, 'easy', 20)).toBe(partyXpBudget(5, 'easy', 12))
  })

  it('handles non-numeric level gracefully', () => {
    expect(partyXpBudget('abc', 'medium', 4)).toBe(partyXpBudget(1, 'medium', 4))
  })

  it('falls back to medium for unknown difficulty', () => {
    expect(partyXpBudget(5, 'legendary', 4)).toBe(partyXpBudget(5, 'medium', 4))
  })
})
