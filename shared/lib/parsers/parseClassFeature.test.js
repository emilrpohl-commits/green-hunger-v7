import { describe, expect, it } from 'vitest'
import { parseClassFeature } from './parseClassFeature.js'

describe('parseClassFeature', () => {
  it('extracts class feature fields', () => {
    const text = `Extra Attack
Fighter level 5
Beginning at 5th level, you can attack twice. You can use this 2 times per long rest.`
    const feature = parseClassFeature(text)
    expect(feature.name).toBe('Extra Attack')
    expect(feature.class_name).toBe('Fighter')
    expect(feature.level).toBe(5)
    expect(feature.recharge).toBe('Long Rest')
  })

  it('defaults optional values for sparse input', () => {
    const feature = parseClassFeature('Improved Focus')
    expect(feature.class_name).toBeNull()
    expect(feature.level).toBeNull()
    expect(feature.recharge).toBeNull()
  })

  it('handles pdf artifacts and subclass detection', () => {
    const feature = parseClassFeature("Mystic Fea-\nture\nSubclass Feature - Path: Berserker\nAt 3rd level, you gain fury.")
    expect(feature.name).toBe('Mystic Feature')
    expect(feature.feature_type).toBe('subclass')
    expect(feature.subclass_name).toContain('Berserker')
    expect(feature.level).toBe(3)
  })
})
