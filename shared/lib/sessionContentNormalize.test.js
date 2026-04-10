import { describe, it, expect } from 'vitest'
import { toPlayerNarrativeSession } from './sessionContentNormalize.js'

describe('toPlayerNarrativeSession', () => {
  it('includes player-safe beats with playerText only', () => {
    const session = {
      id: 's1',
      title: 'T',
      scenes: [
        {
          id: 'sc1',
          order: 0,
          title: 'Scene A',
          beats: [
            { id: 'b1', order: 0, title: 'Intro', type: 'narrative', player_text: 'You see fog.', dm_notes: 'SECRET' },
          ],
        },
      ],
    }
    const n = toPlayerNarrativeSession(session)
    expect(n.scenes[0].beats[0].playerText).toBe('You see fog.')
    expect(n.scenes[0].beats[0]).not.toHaveProperty('dm_notes')
  })
})
