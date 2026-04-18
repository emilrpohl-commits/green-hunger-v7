import { describe, it, expect } from 'vitest'
import { collectScriptStatBlockRefs } from './sessionBeatStatBlocks.js'

describe('collectScriptStatBlockRefs', () => {
  it('returns empty when session missing or no scenes', () => {
    expect(collectScriptStatBlockRefs(null)).toEqual([])
    expect(collectScriptStatBlockRefs({})).toEqual([])
    expect(collectScriptStatBlockRefs({ scenes: [] })).toEqual([])
  })

  it('collects statBlockId with label and scene hint in order, deduping by id', () => {
    const session = {
      scenes: [
        {
          title: 'Chamber',
          beats: [
            { title: 'The Failed Circle', statBlockId: 'uuid-a' },
            { title: 'Repeat ref', stat_block_id: 'uuid-a' },
            { title: 'Other', statBlockId: 'slug-b' },
          ],
        },
        {
          title: 'Heart',
          beats: [{ title: 'Creature', statBlockId: 'uuid-c' }],
        },
      ],
    }
    expect(collectScriptStatBlockRefs(session)).toEqual([
      { statBlockId: 'uuid-a', label: 'The Failed Circle', hint: 'Chamber' },
      { statBlockId: 'slug-b', label: 'Other', hint: 'Chamber' },
      { statBlockId: 'uuid-c', label: 'Creature', hint: 'Heart' },
    ])
  })

  it('skips beats without stat block ref', () => {
    const session = {
      scenes: [
        {
          title: 'S',
          beats: [{ title: 'Narration' }, { title: 'Fight', statBlockId: 'x' }],
        },
      ],
    }
    expect(collectScriptStatBlockRefs(session)).toEqual([
      { statBlockId: 'x', label: 'Fight', hint: 'S' },
    ])
  })
})
