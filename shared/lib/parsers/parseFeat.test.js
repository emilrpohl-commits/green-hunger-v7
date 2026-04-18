import { describe, expect, it } from 'vitest'
import { parseFeat } from './parseFeat.js'

describe('parseFeat', () => {
  it('extracts well-formed feat fields', () => {
    const text = `Sentinel
Prerequisite: Strength 13, 4th level, Fighter

You gain powerful reactions.`
    const feat = parseFeat(text)
    expect(feat.name).toBe('Sentinel')
    expect(feat.prerequisite).toContain('Strength 13')
    expect(feat.ability_score_minimum).toEqual({ ability: 'STR', minimum: 13 })
    expect(feat.level_minimum).toBe(4)
    expect(feat.class_requirement).toBe('Fighter')
    expect(feat.description).toContain('powerful reactions')
  })

  it('gracefully handles missing optional fields', () => {
    const feat = parseFeat('Lucky\n\nGain luck points.')
    expect(feat.prerequisite).toBeNull()
    expect(feat.level_minimum).toBeNull()
    expect(feat.class_requirement).toBeNull()
    expect(feat.description).toContain('Gain luck points')
  })

  it('normalizes pdf artifacts through cleanText', () => {
    const feat = parseFeat("Sharpshoot\u00AD\ner\nPrerequisite: Dexterity 13\nYou can’t be sur-\nprised.")
    expect(feat.name).toBe('Sharpshooter')
    expect(feat.description.toLowerCase()).toContain('surprised')
  })
})
