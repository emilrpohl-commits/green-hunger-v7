/**
 * Rough AoE target estimates (5 ft grid heuristics). Not simulation — operational speed.
 */

export const AOE_SHAPES = ['sphere', 'cube', 'cone', 'line', 'cylinder']

/** Approximate 5×5 ft squares covered (gross, for crowd density math). */
export function shapeFootprintSquares(shape, sizeFeet) {
  const s = Math.max(5, Number(sizeFeet) || 30)
  const r = s / 5 // in "squares" radius or half-side
  switch (shape) {
    case 'sphere':
    case 'cylinder': {
      const sq = Math.PI * r * r
      return Math.max(1, Math.round(sq * 0.55))
    }
    case 'cube':
      return Math.max(1, Math.round((2 * r) ** 2 * 0.7))
    case 'cone': {
      const length = r
      const width = Math.max(1, Math.round(length * 0.45))
      return Math.max(1, Math.round((length * width) * 0.4))
    }
    case 'line':
      return Math.max(1, Math.round(r * 0.35))
    default:
      return Math.max(1, Math.round(r * r * 0.5))
  }
}

/**
 * @param {Object} o
 * @param {'sphere'|'cube'|'cone'|'line'|'cylinder'} o.shape
 * @param {number} o.sizeFeet
 * @param {'sparse'|'normal'|'tight'} [o.density]
 */
export function estimateTargetsInAoE({ shape, sizeFeet, density = 'normal' }) {
  const squares = shapeFootprintSquares(shape, sizeFeet)
  const mult = density === 'tight' ? 1.45 : density === 'sparse' ? 0.55 : 1
  // Assume ~1 creature per 2–3 squares in a "normal" skirmish blob
  const basePerSquare = 0.38
  return Math.max(0, Math.round(squares * basePerSquare * mult * 10) / 10)
}
