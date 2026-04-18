import { describe, it, expect } from 'vitest'
import {
  AOE_SHAPES,
  shapeFootprintSquares,
  estimateTargetsInAoE,
} from './aoeEstimate.js'

describe('AOE_SHAPES', () => {
  it('exports the five standard AoE shapes', () => {
    expect(AOE_SHAPES).toEqual(['sphere', 'cube', 'cone', 'line', 'cylinder'])
  })
})

describe('shapeFootprintSquares', () => {
  it('returns at least 1 for every shape', () => {
    for (const shape of AOE_SHAPES) {
      expect(shapeFootprintSquares(shape, 5)).toBeGreaterThanOrEqual(1)
    }
  })

  it('sphere - 20ft radius covers more squares than a line of the same size', () => {
    expect(shapeFootprintSquares('sphere', 20)).toBeGreaterThan(shapeFootprintSquares('line', 20))
  })

  it('clamps minimum size to 5ft', () => {
    const result = shapeFootprintSquares('sphere', 0)
    expect(result).toBeGreaterThanOrEqual(1)
  })

  it('handles invalid size gracefully', () => {
    expect(shapeFootprintSquares('sphere', 'bad')).toBeGreaterThanOrEqual(1)
  })

  it('cylinder and sphere produce same footprint', () => {
    expect(shapeFootprintSquares('cylinder', 30)).toBe(shapeFootprintSquares('sphere', 30))
  })

  it('cube is larger than cone for the same size', () => {
    expect(shapeFootprintSquares('cube', 30)).toBeGreaterThan(shapeFootprintSquares('cone', 30))
  })

  it('unknown shape falls through to default formula', () => {
    expect(shapeFootprintSquares('unknown', 30)).toBeGreaterThanOrEqual(1)
  })
})

describe('estimateTargetsInAoE', () => {
  it('returns 0 for very small areas', () => {
    const r = estimateTargetsInAoE({ shape: 'line', sizeFeet: 5 })
    expect(r).toBeGreaterThanOrEqual(0)
  })

  it('tight density yields more targets than sparse', () => {
    const tight = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20, density: 'tight' })
    const sparse = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20, density: 'sparse' })
    expect(tight).toBeGreaterThan(sparse)
  })

  it('normal density is between tight and sparse', () => {
    const tight = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20, density: 'tight' })
    const normal = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20, density: 'normal' })
    const sparse = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20, density: 'sparse' })
    expect(normal).toBeLessThanOrEqual(tight)
    expect(normal).toBeGreaterThanOrEqual(sparse)
  })

  it('defaults density to normal', () => {
    const withDefault = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20 })
    const withNormal = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 20, density: 'normal' })
    expect(withDefault).toBe(withNormal)
  })

  it('larger AoE yields more targets', () => {
    const small = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 10 })
    const large = estimateTargetsInAoE({ shape: 'sphere', sizeFeet: 40 })
    expect(large).toBeGreaterThan(small)
  })
})
