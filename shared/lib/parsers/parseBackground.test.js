import { describe, expect, it } from 'vitest'
import { parseBackground } from './parseBackground.js'

describe('parseBackground', () => {
  it('extracts key background fields and tables', () => {
    const text = `Acolyte
Skill Proficiencies: Insight, Religion
Tool Proficiencies: None
Languages: Two of your choice
Equipment: A holy symbol and clothes
Feature: Shelter of the Faithful
You command respect in temples.

d8 Personality Trait
1 I idolize a hero.`
    const bg = parseBackground(text)
    expect(bg.name).toBe('Acolyte')
    expect(bg.skill_proficiencies).toEqual(['Insight', 'Religion'])
    expect(bg.language_choices).toBe(2)
    expect(bg.feature_name).toBe('Shelter of the Faithful')
    expect(bg.personality_traits.length).toBe(1)
  })

  it('keeps defaults when optional sections are absent', () => {
    const bg = parseBackground('Wanderer\nSkill Proficiencies: Survival')
    expect(bg.tool_proficiencies).toEqual([])
    expect(bg.feature_name).toBeNull()
    expect(bg.ideals).toEqual([])
    expect(bg.flaws).toEqual([])
  })

  it('handles pdf artifacts and preserves parsed values', () => {
    const bg = parseBackground("Sage\nSkill Proficiencies: Arcana, His-\ntory\nLanguages: One of your choice")
    expect(bg.skill_proficiencies).toEqual(['Arcana', 'History'])
    expect(bg.language_choices).toBe(1)
  })
})
