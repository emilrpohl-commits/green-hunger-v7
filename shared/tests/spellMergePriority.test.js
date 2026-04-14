import { describe, it, expect } from 'vitest'
import { mergeSpellSourceMaps } from '../../players/src/stores/playerStore/helpers.js'

describe('spell merge priority', () => {
  it('prefers campaign-specific sources over baseline sources', () => {
    const merged = mergeSpellSourceMaps([
      { name: 'rules_entities', entries: { fireball: { name: 'rules' } } },
      { name: 'spell_compendium', entries: { fireball: { name: 'compendium' } } },
      { name: 'spells_table', entries: { fireball: { name: 'spells' } } },
      { name: 'campaign_spells', entries: { fireball: { name: 'campaign' } } },
    ])
    expect(merged.fireball.name).toBe('campaign')
  })
})
