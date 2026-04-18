import { describe, it, expect } from 'vitest'
import {
  WILD_MAGIC_EFFECTS,
  resolveWildMagicRoll,
  wildMagicShouldTrackActive,
} from './wildMagicTable.js'

describe('WILD_MAGIC_EFFECTS', () => {
  it('has 50 entries covering rolls 1-100', () => {
    expect(WILD_MAGIC_EFFECTS).toHaveLength(50)
  })

  it('first entry covers rolls 1-2', () => {
    expect(WILD_MAGIC_EFFECTS[0].range).toEqual([1, 2])
  })

  it('last entry covers rolls 99-100', () => {
    expect(WILD_MAGIC_EFFECTS[49].range).toEqual([99, 100])
  })

  it('every entry has required fields', () => {
    for (const e of WILD_MAGIC_EFFECTS) {
      expect(e).toHaveProperty('id')
      expect(e).toHaveProperty('range')
      expect(e).toHaveProperty('title')
      expect(e).toHaveProperty('description')
      expect(e).toHaveProperty('type')
      expect(e).toHaveProperty('tone')
    }
  })

  it('ranges are contiguous with no gaps', () => {
    let expected = 1
    for (const e of WILD_MAGIC_EFFECTS) {
      expect(e.range[0]).toBe(expected)
      expected = e.range[1] + 1
    }
    expect(expected - 1).toBe(100)
  })

  it('each id is unique', () => {
    const ids = WILD_MAGIC_EFFECTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('resolveWildMagicRoll', () => {
  it('resolves roll 1 to the first effect', () => {
    const result = resolveWildMagicRoll(1)
    expect(result).not.toBeNull()
    expect(result.range[0]).toBe(1)
    expect(result.roll).toBe(1)
  })

  it('resolves roll 100 to the last effect', () => {
    const result = resolveWildMagicRoll(100)
    expect(result).not.toBeNull()
    expect(result.range[1]).toBe(100)
  })

  it('attaches the roll number to the result', () => {
    const result = resolveWildMagicRoll(42)
    expect(result.roll).toBe(42)
  })

  it('clamps out-of-range rolls to 1-100', () => {
    expect(resolveWildMagicRoll(0)).not.toBeNull()
    expect(resolveWildMagicRoll(200)).not.toBeNull()
  })

  it('every roll 1-100 resolves to a non-null effect', () => {
    for (let r = 1; r <= 100; r++) {
      expect(resolveWildMagicRoll(r)).not.toBeNull()
    }
  })
})

describe('wildMagicShouldTrackActive', () => {
  it('returns true for duration effects', () => {
    expect(wildMagicShouldTrackActive({ type: 'duration' })).toBe(true)
  })

  it('returns true for triggered effects', () => {
    expect(wildMagicShouldTrackActive({ type: 'triggered' })).toBe(true)
  })

  it('returns false for instant effects', () => {
    expect(wildMagicShouldTrackActive({ type: 'instant' })).toBe(false)
  })
})
