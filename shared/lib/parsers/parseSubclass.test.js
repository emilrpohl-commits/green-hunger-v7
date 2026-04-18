import { describe, expect, it } from 'vitest'
import { parseSubclass } from './parseSubclass.js'

describe('parseSubclass', () => {
  it('extracts subclass core and feature rows', () => {
    const text = `Path of the Berserker
Barbarian subclass feature.
3rd level subclass feature. Frenzy. You can enter a frenzy rage.`
    const row = parseSubclass(text)
    expect(row.name).toBe('Path of the Berserker')
    expect(row.class_name).toBe('Barbarian')
    expect(row.feature_type).toBeUndefined()
    expect(row.features.length).toBeGreaterThan(0)
  })

  it('returns safe defaults for sparse subclass text', () => {
    const row = parseSubclass('School of Echoes')
    expect(row.class_name).toBeNull()
    expect(row.features).toEqual([])
  })

  it('normalizes pdf artifacts in subclass parsing', () => {
    const row = parseSubclass("Arcane Tra-\ndition\nWizard subclass feature\n2nd level subclass feature. Arcane Recovery.")
    expect(row.name).toBe('Arcane Tradition')
    expect(row.class_name).toBe('Wizard')
  })
})
