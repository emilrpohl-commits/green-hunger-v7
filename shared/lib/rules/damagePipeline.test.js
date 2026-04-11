import { describe, it, expect } from 'vitest'
import { applyDamageWithTraits, normalizeDamageTypeId } from './damagePipeline.js'

describe('damagePipeline', () => {
  it('halves for resistance', () => {
    const r = applyDamageWithTraits(10, 'fire', { resistances: ['Fire'] })
    expect(r.final).toBe(5)
    expect(r.factors.some((f) => f.kind === 'resistance')).toBe(true)
  })

  it('doubles for vulnerability', () => {
    const r = applyDamageWithTraits(10, 'fire', { vulnerabilities: ['fire'] })
    expect(r.final).toBe(20)
  })

  it('immunity zeroes', () => {
    const r = applyDamageWithTraits(99, 'Necrotic', { immunities: ['necrotic'] })
    expect(r.final).toBe(0)
  })

  it('normalizes damage type', () => {
    expect(normalizeDamageTypeId('Slashing')).toBe('slashing')
  })
})
