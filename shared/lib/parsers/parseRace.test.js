import { describe, expect, it } from 'vitest'
import { parseRace } from './parseRace.js'

describe('parseRace', () => {
  it('extracts race core sections and traits', () => {
    const text = `Tiefling
Ability Score Increase. Your Intelligence score increases by 1, and your Charisma score increases by 2.
Size. Your size is Medium.
Speed. Your base walking speed is 30 feet.
Darkvision. You can see in dim light.
Languages. You can speak, read, and write Common and Infernal.`
    const race = parseRace(text)
    expect(race.name).toBe('Tiefling')
    expect(race.ability_bonuses).toEqual(
      expect.arrayContaining([{ ability: 'INT', bonus: 1 }, { ability: 'CHA', bonus: 2 }])
    )
    expect(race.size).toBe('Medium')
    expect(race.speed).toBe(30)
    expect(race.languages).toEqual(expect.arrayContaining(['Common', 'Infernal']))
    expect(race.traits.some((t) => t.name === 'Darkvision')).toBe(true)
  })

  it('uses defaults for missing optional sections', () => {
    const race = parseRace('Custom Folk\nSize. Small.\nSpeed. 25 feet.')
    expect(race.ability_bonuses).toEqual([])
    expect(race.languages).toEqual([])
    expect(race.size).toBe('Small')
    expect(race.speed).toBe(25)
  })

  it('handles pdf artifacts and smart quotes', () => {
    const race = parseRace("Elf\nSpeed. Your base walk-\ning speed is 30 feet.\nLanguages. You can speak “Common” and Elvish.")
    expect(race.speed).toBe(30)
    expect(race.languages).toEqual(expect.arrayContaining(['Common', 'Elvish']))
  })
})
