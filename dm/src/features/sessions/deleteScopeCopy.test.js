import { describe, expect, it } from 'vitest'
import {
  sceneDependentCounts,
  sceneDeleteConfirmMessage,
  sessionDependentCounts,
  sessionArchiveConfirmMessage,
} from './deleteScopeCopy.js'

describe('deleteScopeCopy', () => {
  it('counts scene dependents safely', () => {
    expect(sceneDependentCounts({ beats: [{}, {}], branches: [{}] })).toEqual({ beats: 2, branches: 1 })
    expect(sceneDependentCounts(null)).toEqual({ beats: 0, branches: 0 })
  })

  it('builds scene delete confirmation text with counts', () => {
    const msg = sceneDeleteConfirmMessage({
      title: 'Forked Crossing',
      beats: [{}, {}, {}],
      branches: [{}, {}],
    })
    expect(msg).toContain('Forked Crossing')
    expect(msg).toContain('3 beat(s)')
    expect(msg).toContain('2 branch(es)')
  })

  it('aggregates session dependent counts across scenes', () => {
    const counts = sessionDependentCounts({
      scenes: [
        { beats: [{}, {}], branches: [{}] },
        { beats: [{}], branches: [{}, {}] },
      ],
    })
    expect(counts).toEqual({ sceneCount: 2, beatCount: 3, branchCount: 3 })
  })

  it('builds archive confirmation text with aggregated totals', () => {
    const msg = sessionArchiveConfirmMessage({
      title: 'Session Two',
      scenes: [{ beats: [{}, {}], branches: [] }],
    })
    expect(msg).toContain('Session Two')
    expect(msg).toContain('1 scene(s)')
    expect(msg).toContain('2 beat(s)')
    expect(msg).toContain('0 branch(es)')
  })
})
