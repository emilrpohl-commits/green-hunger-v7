import { describe, it, expect } from 'vitest'
import { parseStatBlock } from './parseStatBlock.js'

const GOBLIN_TEXT = `Goblin
Small Humanoid (Goblinoid), Neutral Evil
Armor Class 15 (leather armor, shield)
Hit Points 7 (2d6)
Speed 30 ft.
STR DEX CON INT WIS CHA
8 (-1) 14 (+2) 10 (+0) 10 (+0) 8 (-1) 8 (-1)
Saving Throws DEX +4
Skills Stealth +6
Senses darkvision 60 ft., Passive Perception 9
Languages Common, Goblin
Challenge 1/4 (50 XP)
Proficiency Bonus +2

Traits
Nimble Escape. The goblin can take the Disengage or Hide action as a bonus action on each of its turns.

Actions
Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.
Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.
`

const ANCIENT_DRAGON_TEXT = `Ancient Red Dragon
Gargantuan Dragon, Chaotic Evil
Armor Class 22 (natural armor)
Hit Points 546 (28d20 + 252)
Speed 40 ft., climb 40 ft., fly 80 ft.
STR DEX CON INT WIS CHA
30 (+10) 10 (+0) 29 (+9) 18 (+4) 15 (+2) 23 (+6)
Saving Throws DEX +7, CON +16, WIS +9, CHA +13
Skills Perception +16, Stealth +7
Damage Immunities fire
Senses blindsight 60 ft., darkvision 120 ft., Passive Perception 26
Languages Common, Draconic
Challenge 24 (62000 XP)
Proficiency Bonus +7

Actions
Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.
Fire Breath. The dragon exhales fire in a 90-foot cone. Each creature in that area must make a DC 24 Dexterity saving throw, taking 91 (26d6) fire damage on a failed save, or half as much on a successful one.
`

describe('parseStatBlock — basic fields', () => {
  it('parses name from the first line', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.name).toBe('Goblin')
  })

  it('parses size', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.size).toBe('Small')
  })

  it('parses creature type', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.creature_type).toBe('Humanoid (Goblinoid)')
  })

  it('parses alignment', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.alignment).toBe('Neutral Evil')
  })

  it('parses AC', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.ac).toBe(15)
  })

  it('parses AC note', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.ac_note).toBe('leather armor, shield')
  })

  it('parses max HP', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.max_hp).toBe(7)
  })

  it('parses hit dice', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.hit_dice).toBe('2d6')
  })

  it('parses speed', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.speed).toBe('30 ft.')
  })

  it('parses challenge rating', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.cr).toBe('1/4')
  })

  it('parses proficiency bonus', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.proficiency_bonus).toBe(2)
  })

  it('generates a slug from the name', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.slug).toBe('goblin')
  })
})

describe('parseStatBlock — ability scores', () => {
  it('parses all six ability scores', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.ability_scores).toMatchObject({
      STR: 8,
      DEX: 14,
      CON: 10,
      INT: 10,
      WIS: 8,
      CHA: 8,
    })
  })

  it('computes modifiers', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.modifiers.DEX).toBe(2)
    expect(sb.modifiers.STR).toBe(-1)
  })

  it('parses high ability scores for a dragon', () => {
    const sb = parseStatBlock(ANCIENT_DRAGON_TEXT)
    expect(sb.ability_scores.STR).toBe(30)
    expect(sb.ability_scores.CON).toBe(29)
    expect(sb.modifiers.STR).toBe(10)
  })
})

describe('parseStatBlock — saving throws and skills', () => {
  it('parses saving throws', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.saving_throws).toContainEqual({ name: 'DEX', mod: 4 })
  })

  it('parses skills', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.skills).toContainEqual({ name: 'Stealth', mod: 6 })
  })

  it('parses multiple saving throws', () => {
    const sb = parseStatBlock(ANCIENT_DRAGON_TEXT)
    expect(sb.saving_throws.length).toBeGreaterThanOrEqual(4)
  })
})

describe('parseStatBlock — resistances and immunities', () => {
  it('parses damage immunities', () => {
    const sb = parseStatBlock(ANCIENT_DRAGON_TEXT)
    expect(sb.immunities.damage).toContain('fire')
  })

  it('parses damage resistances', () => {
    const text = GOBLIN_TEXT.replace('Challenge', 'Damage Resistances bludgeoning, piercing\nChallenge')
    const sb = parseStatBlock(text)
    expect(sb.resistances).toContain('bludgeoning')
    expect(sb.resistances).toContain('piercing')
  })

  it('parses condition immunities', () => {
    const text = GOBLIN_TEXT.replace('Challenge', 'Condition Immunities frightened, charmed\nChallenge')
    const sb = parseStatBlock(text)
    expect(sb.immunities.condition).toContain('frightened')
  })
})

describe('parseStatBlock — traits and actions', () => {
  it('parses traits section', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.traits.length).toBeGreaterThan(0)
    expect(sb.traits[0].name).toBe('Nimble Escape')
  })

  it('parses melee weapon attack action', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    const scimitar = sb.actions.find((a) => a.name === 'Scimitar')
    expect(scimitar).toBeDefined()
    expect(scimitar.type).toBe('attack')
    expect(scimitar.toHit).toBe(4)
  })

  it('parses ranged weapon attack action', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    const bow = sb.actions.find((a) => a.name === 'Shortbow')
    expect(bow).toBeDefined()
    expect(bow.type).toBe('attack')
  })

  it('parses save-based action', () => {
    const sb = parseStatBlock(ANCIENT_DRAGON_TEXT)
    const breath = sb.actions.find((a) => a.name === 'Fire Breath')
    expect(breath).toBeDefined()
    expect(breath.type).toBe('save')
    expect(breath.saveDC).toBe(24)
    expect(breath.saveType).toBe('DEX')
  })
})

describe('parseStatBlock — senses and languages', () => {
  it('parses senses', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.senses).toContain('darkvision')
  })

  it('parses languages', () => {
    const sb = parseStatBlock(GOBLIN_TEXT)
    expect(sb.languages).toContain('Common')
    expect(sb.languages).toContain('Goblin')
  })
})

describe('parseStatBlock — edge cases', () => {
  it('returns defaults for minimal input', () => {
    const sb = parseStatBlock('Unknown Creature')
    expect(sb.name).toBe('Unknown Creature')
    expect(sb.ac).toBe(10)
    expect(sb.max_hp).toBe(10)
  })

  it('handles Gargantuan size', () => {
    const sb = parseStatBlock(ANCIENT_DRAGON_TEXT)
    expect(sb.size).toBe('Gargantuan')
  })

  it('estimates proficiency bonus from CR when not stated', () => {
    const text = GOBLIN_TEXT.replace(/Proficiency Bonus \+2\n/, '')
    const sb = parseStatBlock(text)
    expect(sb.proficiency_bonus).toBeGreaterThanOrEqual(2)
  })
})
