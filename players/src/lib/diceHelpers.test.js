import { describe, it, expect } from 'vitest'
import {
  parseModNum,
  isAttackRoll,
  fmtMod,
  parseDiceNotation,
  rollDice,
} from './diceHelpers.js'

describe('parseModNum', () => {
  it('parses positive modifier string', () => {
    expect(parseModNum('+5')).toBe(5)
  })

  it('parses negative modifier string', () => {
    expect(parseModNum('-3')).toBe(-3)
  })

  it('returns 0 for non-numeric input', () => {
    expect(parseModNum('abc')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseModNum('')).toBe(0)
  })

  it('handles plain numbers', () => {
    expect(parseModNum('7')).toBe(7)
  })
})

describe('isAttackRoll', () => {
  it('returns true for a positive modifier string', () => {
    expect(isAttackRoll('+5')).toBe(true)
  })

  it('returns true for a negative modifier string', () => {
    expect(isAttackRoll('-2')).toBe(true)
  })

  it('returns true for a plain integer string', () => {
    expect(isAttackRoll('3')).toBe(true)
  })

  it('returns false for dice notation', () => {
    expect(isAttackRoll('1d6+3')).toBe(false)
  })

  it('returns false for descriptive text', () => {
    expect(isAttackRoll('none')).toBe(false)
  })
})

describe('fmtMod', () => {
  it('formats positive number with leading +', () => {
    expect(fmtMod(4)).toBe('+4')
  })

  it('formats 0 with leading +', () => {
    expect(fmtMod(0)).toBe('+0')
  })

  it('formats negative number without extra sign', () => {
    expect(fmtMod(-3)).toBe('-3')
  })
})

describe('parseDiceNotation', () => {
  it('parses simple notation like 1d6', () => {
    const r = parseDiceNotation('1d6')
    expect(r).toMatchObject({ count: 1, sides: 6, mod: 0 })
  })

  it('parses notation with positive modifier', () => {
    const r = parseDiceNotation('2d8+3')
    expect(r).toMatchObject({ count: 2, sides: 8, mod: 3 })
  })

  it('parses notation with negative modifier', () => {
    const r = parseDiceNotation('1d4-1')
    expect(r).toMatchObject({ count: 1, sides: 4, mod: -1 })
  })

  it('returns null for non-dice input', () => {
    expect(parseDiceNotation('hello')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(parseDiceNotation(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDiceNotation('')).toBeNull()
  })

  it('handles whitespace around notation', () => {
    const r = parseDiceNotation('  2d6 + 4  ')
    expect(r).not.toBeNull()
    expect(r.count).toBe(2)
    expect(r.mod).toBe(4)
  })
})

describe('rollDice', () => {
  it('returns the correct number of results', () => {
    const results = rollDice(5, 6)
    expect(results).toHaveLength(5)
  })

  it('each result is between 1 and sides inclusive', () => {
    const results = rollDice(20, 10)
    for (const r of results) {
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(10)
    }
  })

  it('returns empty array for count 0', () => {
    expect(rollDice(0, 6)).toEqual([])
  })

  it('returns empty array for negative count', () => {
    expect(rollDice(-3, 6)).toEqual([])
  })
})
