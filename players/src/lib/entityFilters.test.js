import { describe, it, expect } from 'vitest'
import {
  ENTITY_FILTER_LABELS,
  matchesEntityFilter,
  spellToFilterTags,
  weaponToFilterTags,
  healingActionToFilterTags,
  buffActionToFilterTags,
  featureToFilterTags,
} from './entityFilters.js'

describe('ENTITY_FILTER_LABELS', () => {
  it('includes an "all" filter', () => {
    expect(ENTITY_FILTER_LABELS.some((f) => f.id === 'all')).toBe(true)
  })

  it('each label has id and label properties', () => {
    for (const f of ENTITY_FILTER_LABELS) {
      expect(f).toHaveProperty('id')
      expect(f).toHaveProperty('label')
    }
  })
})

describe('matchesEntityFilter', () => {
  it('returns true for "all" filter', () => {
    expect(matchesEntityFilter('all', new Set(['action']))).toBe(true)
  })

  it('returns true when tag is in the set', () => {
    expect(matchesEntityFilter('action', new Set(['action', 'attack']))).toBe(true)
  })

  it('returns false when tag is not in the set', () => {
    expect(matchesEntityFilter('concentration', new Set(['action']))).toBe(false)
  })

  it('returns true for null/empty filter', () => {
    expect(matchesEntityFilter(null, new Set())).toBe(true)
    expect(matchesEntityFilter('', new Set())).toBe(true)
  })
})

describe('spellToFilterTags', () => {
  it('action spells get "action" tag', () => {
    const tags = spellToFilterTags({ actionType: 'action' })
    expect(tags.has('action')).toBe(true)
  })

  it('bonus action spells get "bonus_action" tag', () => {
    const tags = spellToFilterTags({ actionType: 'bonus_action' })
    expect(tags.has('bonus_action')).toBe(true)
  })

  it('reaction spells get "reaction" tag', () => {
    const tags = spellToFilterTags({ actionType: 'reaction' })
    expect(tags.has('reaction')).toBe(true)
  })

  it('concentration spells get "concentration" tag', () => {
    const tags = spellToFilterTags({ actionType: 'action', concentration: true })
    expect(tags.has('concentration')).toBe(true)
  })

  it('attack mechanic spells get "attack" tag', () => {
    const tags = spellToFilterTags({ actionType: 'action', mechanic: 'attack' })
    expect(tags.has('attack')).toBe(true)
  })

  it('utility mechanic spells get "utility" tag', () => {
    const tags = spellToFilterTags({ actionType: 'action', mechanic: 'utility' })
    expect(tags.has('utility')).toBe(true)
  })

  it('defaults to action when actionType is missing', () => {
    const tags = spellToFilterTags({})
    expect(tags.has('action')).toBe(true)
  })
})

describe('weaponToFilterTags', () => {
  it('always returns action and attack tags', () => {
    const tags = weaponToFilterTags()
    expect(tags.has('action')).toBe(true)
    expect(tags.has('attack')).toBe(true)
  })
})

describe('healingActionToFilterTags', () => {
  it('always has utility tag', () => {
    const tags = healingActionToFilterTags({ action: 'Action' })
    expect(tags.has('utility')).toBe(true)
  })

  it('bonus action healing gets bonus_action tag', () => {
    const tags = healingActionToFilterTags({ action: 'Bonus Action' })
    expect(tags.has('bonus_action')).toBe(true)
  })

  it('regular action healing gets action tag', () => {
    const tags = healingActionToFilterTags({ action: 'Action' })
    expect(tags.has('action')).toBe(true)
  })

  it('adds limited tag when slotLevel is present', () => {
    const tags = healingActionToFilterTags({ action: 'Action', slotLevel: 2 })
    expect(tags.has('limited')).toBe(true)
  })
})

describe('buffActionToFilterTags', () => {
  it('returns bonus_action and limited tags', () => {
    const tags = buffActionToFilterTags()
    expect(tags.has('bonus_action')).toBe(true)
    expect(tags.has('limited')).toBe(true)
  })
})

describe('featureToFilterTags', () => {
  it('passive feature (no uses) gets passive tag', () => {
    const tags = featureToFilterTags({ uses: undefined, description: '' })
    expect(tags.has('passive')).toBe(true)
  })

  it('feature with uses gets limited tag', () => {
    const tags = featureToFilterTags({ uses: '3/day', description: 'Use your action...' })
    expect(tags.has('limited')).toBe(true)
  })

  it('feature description mentioning bonus action gets bonus_action tag', () => {
    const tags = featureToFilterTags({ uses: '1/day', description: 'As a bonus action...' })
    expect(tags.has('bonus_action')).toBe(true)
  })

  it('feature description mentioning reaction gets reaction tag', () => {
    const tags = featureToFilterTags({ uses: '1/day', description: 'As a reaction...' })
    expect(tags.has('reaction')).toBe(true)
  })
})
