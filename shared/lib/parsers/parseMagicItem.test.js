import { describe, expect, it } from 'vitest'
import { parseMagicItem } from './parseMagicItem.js'

describe('parseMagicItem', () => {
  it('extracts magic item fields', () => {
    const row = parseMagicItem(`Cloak of Elvenkind
Wondrous item, uncommon (requires attunement by a wizard)
While wearing this cloak, you have advantage on Dexterity (Stealth) checks.`)
    expect(row.name).toBe('Cloak of Elvenkind')
    expect(row.equipment_category).toBe('Wondrous Item')
    expect(row.rarity).toBe('Uncommon')
    expect(row.requires_attunement).toBe(true)
    expect(row.attunement_conditions).toContain('wizard')
  })

  it('handles sparse item text with defaults', () => {
    const row = parseMagicItem('Mysterious Charm')
    expect(row.rarity).toBeNull()
    expect(row.requires_attunement).toBe(false)
    expect(row.description).toBe('')
  })

  it('handles pdf artifacts and variant flags', () => {
    const row = parseMagicItem("Sword of Sharp-\nness +1\nMagic weapon, rare")
    expect(row.name).toContain('Sword of Sharpness')
    expect(row.is_variant).toBe(true)
    expect(row.rarity).toBe('Rare')
  })
})
