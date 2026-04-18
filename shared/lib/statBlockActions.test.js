import { describe, it, expect } from 'vitest'
import {
  normalizeStatBlockAction,
  normalizeStatBlockActions,
  validateStatBlock,
} from './statBlockActions.js'

describe('normalizeStatBlockAction', () => {
  it('infers attack kind from toHit field', () => {
    const r = normalizeStatBlockAction({ name: 'Claw', toHit: 5 })
    expect(r.resolution.kind).toBe('attack')
    expect(r.actionKind).toBe('attack')
  })

  it('infers save kind from saveType field', () => {
    const r = normalizeStatBlockAction({ name: 'Fire Breath', saveType: 'DEX', dc: 18 })
    expect(r.resolution.kind).toBe('save')
    expect(r.resolution.save_ability).toBe('DEX')
    expect(r.resolution.dc).toBe(18)
  })

  it('infers other kind when no attack or save hint', () => {
    const r = normalizeStatBlockAction({ name: 'Multiattack' })
    expect(r.resolution.kind).toBe('other')
  })

  it('normalizes save_ability to uppercase 3-letter abbreviation', () => {
    const r = normalizeStatBlockAction({ name: 'Blast', saveType: 'constitution' })
    expect(r.resolution.save_ability).toBe('CON')
  })

  it('wraps scalar damage into an array', () => {
    const r = normalizeStatBlockAction({ name: 'Bite', damageDice: '2d6', damage_type: 'piercing' })
    expect(Array.isArray(r.damage)).toBe(true)
    expect(r.damage[0].dice).toBe('2d6')
    expect(r.damage[0].type).toBe('piercing')
  })

  it('passes through existing damage array unchanged', () => {
    const damage = [{ dice: '1d8', type: 'fire' }]
    const r = normalizeStatBlockAction({ name: 'Scorch', damage })
    expect(r.damage).toBe(damage)
  })

  it('sets damage to [] when no damage info', () => {
    const r = normalizeStatBlockAction({ name: 'Dodge' })
    expect(r.damage).toEqual([])
  })

  it('preserves existing resolution.kind when present', () => {
    const r = normalizeStatBlockAction({ name: 'Custom', resolution: { kind: 'save', save_ability: 'WIS' } })
    expect(r.resolution.kind).toBe('save')
    expect(r.resolution.save_ability).toBe('WIS')
  })

  it('null recharge when recharge is not an object', () => {
    const r = normalizeStatBlockAction({ name: 'Foo', recharge: '5-6' })
    expect(r.recharge).toBeNull()
  })

  it('keeps recharge when it is an object', () => {
    const recharge = { min: 5, max: 6 }
    const r = normalizeStatBlockAction({ name: 'Foo', recharge })
    expect(r.recharge).toBe(recharge)
  })

  it('initializes empty tags array', () => {
    const r = normalizeStatBlockAction({ name: 'Foo' })
    expect(r.resolution.tags).toEqual([])
  })

  it('uses to_hit (snake case) as attack hint', () => {
    const r = normalizeStatBlockAction({ name: 'Strike', to_hit: 3 })
    expect(r.resolution.kind).toBe('attack')
  })
})

describe('normalizeStatBlockActions', () => {
  it('normalizes all action list keys', () => {
    const sb = {
      actions: [{ name: 'Bite', toHit: 6 }],
      bonus_actions: [{ name: 'Dash' }],
      reactions: [{ name: 'Parry', resolution: { kind: 'other' } }],
    }
    const result = normalizeStatBlockActions(sb)
    expect(result.actions[0].resolution.kind).toBe('attack')
    expect(result.bonus_actions[0].resolution.kind).toBe('other')
    expect(result.reactions[0].resolution.kind).toBe('other')
  })

  it('skips non-array keys', () => {
    const sb = { actions: null, name: 'Goblin' }
    const result = normalizeStatBlockActions(sb)
    expect(result.name).toBe('Goblin')
  })
})

describe('validateStatBlock', () => {
  it('returns ok: true for a valid stat block', () => {
    const sb = {
      actions: [{ name: 'Claw', resolution: { kind: 'attack', save_ability: null } }],
      bonus_actions: [],
      reactions: [],
    }
    const { ok, warnings } = validateStatBlock(sb)
    expect(ok).toBe(true)
    expect(warnings).toHaveLength(0)
  })

  it('warns when action has no name', () => {
    const sb = { actions: [{ resolution: { kind: 'other' } }], bonus_actions: [], reactions: [] }
    const { ok, warnings } = validateStatBlock(sb)
    expect(ok).toBe(false)
    expect(warnings[0]).toContain('missing name')
  })

  it('warns when save action has no save_ability', () => {
    const sb = {
      actions: [{ name: 'Blast', resolution: { kind: 'save' } }],
      bonus_actions: [],
      reactions: [],
    }
    const { ok, warnings } = validateStatBlock(sb)
    expect(ok).toBe(false)
    expect(warnings[0]).toContain('save_ability')
  })

  it('handles missing action arrays gracefully', () => {
    const { ok } = validateStatBlock({})
    expect(ok).toBe(true)
  })
})
