import { describe, expect, it } from 'vitest'
import { parseTrait } from './parseTrait.js'

describe('parseTrait', () => {
  it('extracts standalone trait', () => {
    const trait = parseTrait(`Darkvision
You can see in dim light within 60 feet.`)
    expect(trait.name).toBe('Darkvision')
    expect(trait.description).toContain('60 feet')
    expect(trait.trait_type).toBe('sense')
  })

  it('handles minimal input defaults', () => {
    const trait = parseTrait('Battle Trance')
    expect(trait.name).toBe('Battle Trance')
    expect(trait.description).toBe('')
    expect(trait.trait_type).toBe('feature')
  })

  it('normalizes pdf artifacts before detection', () => {
    const trait = parseTrait("Arcane Apti-\ntude\nYou gain proficiency in the Arca\u2019na skill.")
    expect(trait.name).toBe('Arcane Aptitude')
    expect(trait.description.toLowerCase()).toContain('arcana')
    expect(trait.trait_type).toBe('proficiency')
  })
})
