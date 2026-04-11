import { describe, it, expect } from 'vitest'
import {
  applyDamageWithTraits,
  normalizeDamageTypeId,
  applyDamageComponentsBundle,
  formatDamageBundleLinesForFeed,
} from './damagePipeline.js'

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

  it('applyDamageComponentsBundle sums typed parts', () => {
    const target = { resistances: ['fire'], immunities: ['cold'] }
    const b = applyDamageComponentsBundle(
      [{ amount: 10, type: 'fire' }, { amount: 8, type: 'cold' }],
      target,
      { usePipeline: true },
    )
    expect(b.totalFinal).toBe(5)
    expect(b.lines.length).toBe(2)
  })

  it('formatDamageBundleLinesForFeed mentions untyped', () => {
    const s = formatDamageBundleLinesForFeed([
      { raw: 7, typeId: null, final: 7, factors: [{ kind: 'untyped' }] },
    ])
    expect(s).toContain('Untyped')
  })
})
