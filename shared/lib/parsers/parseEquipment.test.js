import { describe, expect, it } from 'vitest'
import { parseEquipment } from './parseEquipment.js'

describe('parseEquipment', () => {
  it('extracts weapon data from well-formed text', () => {
    const row = parseEquipment(`Longsword
Martial melee weapon
Cost 15 gp
Damage 1d8 slashing
Weight 3 lb
Properties: Versatile`)
    expect(row.name).toBe('Longsword')
    expect(row.weapon_category).toBe('Martial')
    expect(row.weapon_range).toBe('Melee')
    expect(row.damage_dice).toBe('1d8')
    expect(row.damage_type).toBe('Slashing')
    expect(row.cost_quantity).toBe(15)
    expect(row.cost_unit).toBe('gp')
  })

  it('uses null/false defaults when optional fields missing', () => {
    const row = parseEquipment('Torch')
    expect(row.damage_dice).toBeNull()
    expect(row.ac_base).toBeNull()
    expect(row.properties).toEqual([])
  })

  it('normalizes pdf artifacts and keeps parsed values', () => {
    const row = parseEquipment("Chain Mail\nHeavy ar-\nmour\nAC 16\nStrength 13\nStealth disadvantage")
    expect(row.equipment_category).toBe('Armour')
    expect(row.ac_base).toBe(16)
    expect(row.strength_minimum).toBe(13)
    expect(row.stealth_disadvantage).toBe(true)
  })
})
