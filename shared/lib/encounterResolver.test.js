import { describe, it, expect } from 'vitest'
import { expandEncounterParticipantsToEnemies, findEncounterByStatBlockSlug } from './encounterResolver.js'

describe('expandEncounterParticipantsToEnemies', () => {
  it('expands count and copies slug stats', () => {
    const sb = {
      id: 'uuid-wolf',
      slug: 'corrupted-wolf',
      name: 'Corrupted Wolf',
      ac: 13,
      max_hp: 13,
    }
    const byId = { 'uuid-wolf': sb }
    const enemies = expandEncounterParticipantsToEnemies(
      [{ stat_block_id: 'uuid-wolf', count: 2, initiative: 5 }],
      byId,
    )
    expect(enemies).toHaveLength(2)
    expect(enemies[0].id).toBe('corrupted-wolf')
    expect(enemies[0].initiative).toBe(5)
    expect(enemies[1].name).toBe('Corrupted Wolf')
  })
})

describe('findEncounterByStatBlockSlug', () => {
  it('finds encounter by participant stat block slug', () => {
    const enc = { id: 'e1', title: 'Hunt', participants: [{ stat_block_id: 'sb1' }] }
    const byId = { sb1: { slug: 'corrupted-wolf' } }
    expect(findEncounterByStatBlockSlug([enc], 'corrupted-wolf', byId)).toEqual(enc)
    expect(findEncounterByStatBlockSlug([enc], 'other', byId)).toBeNull()
  })
})
