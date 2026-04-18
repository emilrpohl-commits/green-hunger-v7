import { describe, it, expect } from 'vitest'
import {
  isMeleeProxyRange,
  targetHasCritCondition,
  shouldForceCriticalOnHit,
  autoFailSaveFromConditions,
} from './criticalConditionRules.js'

describe('isMeleeProxyRange', () => {
  it('melee is melee-proxy', () => {
    expect(isMeleeProxyRange('melee')).toBe(true)
  })

  it('ranged is not melee-proxy', () => {
    expect(isMeleeProxyRange('ranged')).toBe(false)
  })

  it('defaults to melee when undefined', () => {
    expect(isMeleeProxyRange()).toBe(true)
  })

  it('empty string defaults to melee', () => {
    expect(isMeleeProxyRange('')).toBe(true)
  })
})

describe('targetHasCritCondition', () => {
  it('paralyzed triggers crit condition', () => {
    expect(targetHasCritCondition(['paralyzed'])).toBe(true)
  })

  it('paralysed (alternate spelling) triggers crit condition', () => {
    expect(targetHasCritCondition(['paralysed'])).toBe(true)
  })

  it('stunned triggers crit condition', () => {
    expect(targetHasCritCondition(['stunned'])).toBe(true)
  })

  it('unconscious triggers crit condition', () => {
    expect(targetHasCritCondition(['unconscious'])).toBe(true)
  })

  it('prone does not trigger crit condition', () => {
    expect(targetHasCritCondition(['prone'])).toBe(false)
  })

  it('empty conditions returns false', () => {
    expect(targetHasCritCondition([])).toBe(false)
  })

  it('condition matching is case-insensitive', () => {
    expect(targetHasCritCondition(['Paralyzed'])).toBe(true)
    expect(targetHasCritCondition(['STUNNED'])).toBe(true)
  })
})

describe('shouldForceCriticalOnHit', () => {
  it('forces critical for melee attack against paralyzed target', () => {
    expect(shouldForceCriticalOnHit({ attackRange: 'melee', targetConditions: ['paralyzed'] })).toBe(true)
  })

  it('does NOT force critical for ranged attack, even against paralyzed', () => {
    expect(shouldForceCriticalOnHit({ attackRange: 'ranged', targetConditions: ['paralyzed'] })).toBe(false)
  })

  it('does NOT force critical for melee with no crit conditions', () => {
    expect(shouldForceCriticalOnHit({ attackRange: 'melee', targetConditions: ['prone'] })).toBe(false)
  })

  it('defaults to melee when attackRange omitted', () => {
    expect(shouldForceCriticalOnHit({ targetConditions: ['unconscious'] })).toBe(true)
  })
})

describe('autoFailSaveFromConditions', () => {
  it('paralyzed auto-fails STR saves', () => {
    expect(autoFailSaveFromConditions(['paralyzed'], 'str')).toBe(true)
  })

  it('paralyzed auto-fails DEX saves', () => {
    expect(autoFailSaveFromConditions(['paralyzed'], 'dex')).toBe(true)
  })

  it('paralyzed does NOT auto-fail CON saves', () => {
    expect(autoFailSaveFromConditions(['paralyzed'], 'con')).toBe(false)
  })

  it('stunned auto-fails STR saves', () => {
    expect(autoFailSaveFromConditions(['stunned'], 'str')).toBe(true)
  })

  it('unconscious auto-fails DEX saves', () => {
    expect(autoFailSaveFromConditions(['unconscious'], 'dex')).toBe(true)
  })

  it('returns false for non-critical conditions', () => {
    expect(autoFailSaveFromConditions(['poisoned'], 'str')).toBe(false)
  })

  it('returns false for empty conditions', () => {
    expect(autoFailSaveFromConditions([], 'str')).toBe(false)
  })
})
