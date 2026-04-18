import { describe, expect, it } from 'vitest'
import {
  computeCharacterSheet,
  formatModifier,
  getAbilityModifier,
  getProficiencyBonus,
} from './computeCharacterSheet.js'

describe('computeCharacterSheet helpers', () => {
  it('calculates proficiency bonus by tier', () => {
    expect(getProficiencyBonus(1)).toBe(2)
    expect(getProficiencyBonus(4)).toBe(2)
    expect(getProficiencyBonus(5)).toBe(3)
    expect(getProficiencyBonus(9)).toBe(4)
  })

  it('calculates and formats modifiers', () => {
    expect(getAbilityModifier(18)).toBe(4)
    expect(getAbilityModifier(9)).toBe(-1)
    expect(formatModifier(3)).toBe('+3')
    expect(formatModifier(-2)).toBe('-2')
  })
})

describe('computeCharacterSheet', () => {
  const baseRaw = {
    id: 't1',
    class: 'Sorcerer',
    level: 5,
    abilityScores: { STR: 10, DEX: 14, CON: 16, INT: 12, WIS: 10, CHA: 18 },
    savingThrowProficiencies: { CON: true, CHA: true },
    skillProficiencies: [
      { name: 'Arcana', proficient: true, expertise: false },
      { name: 'Persuasion', proficient: true, expertise: true },
      { name: 'Perception', proficient: false, expertise: false },
    ],
    spellcastingAbility: 'CHA',
    acConfig: { base: 13, addDex: true, maxDex: null, shield: false, magicBonus: 0 },
    stats: { maxHp: 42, speed: 30 },
  }

  it('computes save and skill math', () => {
    const out = computeCharacterSheet(baseRaw)
    const conSave = out.savingThrows.find((s) => s.name === 'CON')
    const chaSave = out.savingThrows.find((s) => s.name === 'CHA')
    const arcana = out.skills.find((s) => s.name === 'Arcana')
    const persuasion = out.skills.find((s) => s.name === 'Persuasion')
    const perception = out.skills.find((s) => s.name === 'Perception')

    expect(out.proficiencyBonus).toBe('+3')
    expect(conSave?.mod).toBe(6) // +3 con, +3 prof
    expect(chaSave?.mod).toBe(7) // +4 cha, +3 prof
    expect(arcana?.mod).toBe(4) // +1 int, +3 prof
    expect(persuasion?.mod).toBe(10) // +4 cha, +6 expertise
    expect(perception?.mod).toBe(0) // +0 wis only
  })

  it('computes spell stats and passives', () => {
    const out = computeCharacterSheet(baseRaw)
    expect(out.spellAttack).toBe('+7') // +4 cha +3 prof
    expect(out.spellSaveDC).toBe(15) // 8+4+3
    expect(out.passiveScores.perception).toBe(10)
    expect(out.passiveScores.insight).toBe(10)
    expect(out.passiveScores.investigation).toBe(11)
  })

  it('computes AC variants', () => {
    const light = computeCharacterSheet(baseRaw)
    expect(light.ac).toBe(15) // 13 + full dex 2

    const medium = computeCharacterSheet({
      ...baseRaw,
      abilityScores: { ...baseRaw.abilityScores, DEX: 18 },
      acConfig: { base: 14, addDex: true, maxDex: 2, shield: false, magicBonus: 0 },
    })
    expect(medium.ac).toBe(16)

    const heavyShield = computeCharacterSheet({
      ...baseRaw,
      acConfig: { base: 16, addDex: false, maxDex: null, shield: true, magicBonus: 1 },
    })
    expect(heavyShield.ac).toBe(19)
  })

  it('maps class hit dice and preserves non-computed stats', () => {
    const out = computeCharacterSheet(baseRaw)
    expect(out.hitDice).toBe('d6')
    expect(out.stats.maxHp).toBe(42)
    expect(out.stats.speed).toBe(30)
  })
})
