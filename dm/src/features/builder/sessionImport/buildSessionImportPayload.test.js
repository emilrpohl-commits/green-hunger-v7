import { describe, expect, it } from 'vitest'
import { buildSessionImportPayload } from './buildSessionImportPayload.js'

describe('buildSessionImportPayload', () => {
  it('returns null for empty parsed input', () => {
    expect(buildSessionImportPayload(null, 'adv-1')).toBeNull()
  })

  it('maps session, scene, beat, and branch fields for import tx', () => {
    const payload = buildSessionImportPayload(
      {
        sessionNumber: 4,
        sessionTitle: 'Into The Weald',
        chapterSubtitle: 'Whispers',
        backgroundNotes: 'Recap here',
        estimatedDuration: '3h',
        objectives: ['Find Birna'],
        statBlocks: [{ name: 'Cultist', modifiers: [{ stat: 'dex', value: 2 }], cr: '1/8' }],
        scenes: [
          {
            sceneNumber: 1,
            order: 1,
            slug: 's1',
            title: 'Old Road',
            sceneType: 'narrative',
            purpose: 'Set tone',
            estimatedTime: '20m',
            fallbackNotes: 'Fallback',
            dmNotes: 'Foreshadow',
            outcomes: ['Party enters forest'],
            beats: [
              {
                order: 1,
                slug: 'b1',
                title: 'Arrival',
                type: 'narrative',
                triggerText: 'When party enters',
                content: 'Read aloud',
                dmNotes: 'Keep pace',
                mechanicalEffect: 'none',
                statBlockRef: 'cultist',
                statBlockSourceIndex: 'cultist-001',
              },
            ],
            branches: [
              {
                order: 1,
                label: 'Follow tracks',
                description: 'Move deeper',
                conditionText: 'if ranger succeeds',
                targetSceneNumber: 2,
              },
            ],
          },
        ],
      },
      'adv-1',
    )

    expect(payload.session).toMatchObject({
      adventure_id: 'adv-1',
      session_number: 4,
      title: 'Into The Weald',
    })
    expect(payload.stat_blocks[0]).toEqual({ name: 'Cultist', cr: '1/8' })
    expect(payload.scenes[0].scene_key).toBe('1')
    expect(payload.scenes[0].beats[0].player_text).toBe('Read aloud')
    expect(payload.scenes[0].branches[0].target_scene_key).toBe('2')
  })
})
