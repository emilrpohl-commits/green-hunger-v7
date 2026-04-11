import { describe, it, expect } from 'vitest'
import {
  parseTacticalJson,
  tacticalJsonFromCharacterStateRow,
  buildTacticalViewModel,
} from './tacticalCharacterShape.js'

describe('parseTacticalJson', () => {
  it('normalizes classResources and actionEconomy', () => {
    const t = parseTacticalJson({
      concentrationSpell: 'Hex',
      inspiration: true,
      classResources: [{ label: 'Rage', current: 2, max: 4, displayType: 'pips' }],
      actionEconomy: { action: true, bonusAction: false, reaction: true },
    })
    expect(t.concentrationSpell).toBe('Hex')
    expect(t.inspiration).toBe(true)
    expect(t.classResources[0].label).toBe('Rage')
    expect(t.classResources[0].max).toBe(4)
    expect(t.actionEconomy.bonusAction).toBe(false)
  })

  it('returns empty-ish object for garbage', () => {
    expect(parseTacticalJson(null).classResources).toEqual([])
  })
})

describe('tacticalJsonFromCharacterStateRow', () => {
  it('reads tactical_json from row', () => {
    const t = tacticalJsonFromCharacterStateRow({ tactical_json: { concentrationSpell: 'Bane' } })
    expect(t.concentrationSpell).toBe('Bane')
  })
})

describe('buildTacticalViewModel', () => {
  it('computes bloodied and downed', () => {
    const v = buildTacticalViewModel({
      dbCharacter: { id: 'a', stats: { maxHp: 20, ac: 15, speed: 30, initiative: '+2' } },
      stateRow: { cur_hp: 10, temp_hp: 0 },
    })
    expect(v.bloodied).toBe(true)
    expect(v.downed).toBe(false)
    const dead = buildTacticalViewModel({
      dbCharacter: { id: 'a', stats: { maxHp: 20 } },
      stateRow: { cur_hp: 0 },
    })
    expect(dead.downed).toBe(true)
  })
})
