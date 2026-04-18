import { describe, it, expect } from 'vitest'
import { DC_STANDARD_LADDER, DC_TABLE, findNearestDcRow } from './dcTable.js'

describe('DC_STANDARD_LADDER', () => {
  it('has 6 entries', () => {
    expect(DC_STANDARD_LADDER).toHaveLength(6)
  })

  it('includes the standard D&D 5e DC values', () => {
    const dcs = DC_STANDARD_LADDER.map((r) => r.dc)
    expect(dcs).toEqual([5, 10, 15, 20, 25, 30])
  })

  it('each row has id, label, dc, and hint', () => {
    for (const row of DC_STANDARD_LADDER) {
      expect(row).toHaveProperty('id')
      expect(row).toHaveProperty('label')
      expect(row).toHaveProperty('dc')
      expect(row).toHaveProperty('hint')
    }
  })

  it('DC_TABLE is an alias for DC_STANDARD_LADDER', () => {
    expect(DC_TABLE).toBe(DC_STANDARD_LADDER)
  })
})

describe('findNearestDcRow', () => {
  it('returns exact match for DC 15', () => {
    const r = findNearestDcRow(15)
    expect(r.dc).toBe(15)
    expect(r.id).toBe('medium')
  })

  it('returns nearest row for DC 12', () => {
    const r = findNearestDcRow(12)
    expect(r.dc).toBe(10)
  })

  it('returns nearest row for DC 18', () => {
    const r = findNearestDcRow(18)
    expect(r.dc).toBe(20)
  })

  it('returns null for NaN input', () => {
    expect(findNearestDcRow(NaN)).toBeNull()
    expect(findNearestDcRow('abc')).toBeNull()
  })

  it('returns veryEasy row for DC 1', () => {
    const r = findNearestDcRow(1)
    expect(r.dc).toBe(5)
  })

  it('returns nearlyImpossible row for DC 50', () => {
    const r = findNearestDcRow(50)
    expect(r.dc).toBe(30)
  })
})
