import { describe, it, expect } from 'vitest'
import {
  classJsonToReferenceRow,
  equipmentJsonToReferenceRow,
  magicItemJsonToReferenceRow,
  raceJsonToReferenceRow,
} from './srdReferenceMoreRows.js'

describe('srdReferenceMoreRows', () => {
  it('maps barbarian class row', () => {
    const row = classJsonToReferenceRow(
      {
        index: 'barbarian',
        name: 'Barbarian',
        hit_die: 12,
        saving_throws: [{ index: 'str' }, { index: 'con' }],
        proficiencies: [
          { index: 'light-armor' },
          { index: 'shields' },
          { index: 'simple-weapons' },
        ],
        proficiency_choices: [],
      },
      '2014',
    )
    expect(row.source_index).toBe('barbarian')
    expect(row.saving_throw_proficiencies).toEqual(['STR', 'CON'])
    expect(row.armor_proficiencies).toContain('light-armor')
  })

  it('maps club equipment', () => {
    const row = equipmentJsonToReferenceRow(
      {
        index: 'club',
        name: 'Club',
        equipment_category: { index: 'weapon' },
        weapon_category: 'Simple',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: { index: 'bludgeoning' } },
        range: { normal: 5 },
        properties: [{ index: 'light' }],
      },
      '2014',
    )
    expect(row.damage_dice).toBe('1d4')
    expect(row.damage_type).toBe('bludgeoning')
    expect(row.properties).toContain('light')
  })

  it('detects magic item attunement from desc', () => {
    const row = magicItemJsonToReferenceRow(
      {
        index: 'amulet-of-health',
        name: 'Amulet of Health',
        equipment_category: { index: 'wondrous-items' },
        rarity: { name: 'Rare' },
        desc: ['Wondrous item, rare (requires attunement)', 'Body text'],
      },
      '2014',
    )
    expect(row.requires_attunement).toBe(true)
  })

  it('maps dwarf race', () => {
    const row = raceJsonToReferenceRow(
      {
        index: 'dwarf',
        name: 'Dwarf',
        speed: 25,
        size: 'Medium',
        ability_bonuses: [{ ability_score: { index: 'con' }, bonus: 2 }],
        languages: [{ index: 'common' }],
        traits: [{ index: 'darkvision' }],
        subraces: [{ index: 'hill-dwarf' }],
      },
      '2014',
    )
    expect(row.trait_indices).toContain('darkvision')
    expect(row.subrace_indices).toContain('hill-dwarf')
  })
})
