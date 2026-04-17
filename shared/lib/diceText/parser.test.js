import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractDiceMatches, parseDiceText, rollNormalizedExpression } from './parser.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, '__fixtures__', 'diceCases.json')
const CASES = JSON.parse(readFileSync(fixturePath, 'utf8'))

describe('diceText parser', () => {
  it('matches fixture expectations', () => {
    for (const c of CASES) {
      const matches = extractDiceMatches(c.text)
      expect(matches.map((m) => m.normalized), c.name).toEqual(c.normalized)
      if (c.effectKind && matches[0]) {
        expect(matches[0].effectKind, c.name).toBe(c.effectKind)
      }
      if (Array.isArray(c.damageTypes) && matches[0]) {
        expect(matches[0].damageTypes, c.name).toEqual(expect.arrayContaining(c.damageTypes))
      }
      if (typeof c.halfOnSuccess === 'boolean' && matches[0]) {
        expect(matches[0].halfOnSuccess, c.name).toBe(c.halfOnSuccess)
      }
      if (typeof c.hasAveragePrefix === 'boolean' && matches[0]) {
        expect(matches[0].hasAveragePrefix, c.name).toBe(c.hasAveragePrefix)
      }
      if (typeof c.displayAverage === 'number' && matches[0]) {
        expect(matches[0].displayAverage, c.name).toBe(c.displayAverage)
      }
    }
  })

  it('preserves text via segments', () => {
    const text = 'Melee Attack Roll: +12. Hit: 16 (2d8 + 7) Slashing.'
    const parsed = parseDiceText(text)
    const rebuilt = parsed.segments.map((seg) => (seg.type === 'text' ? seg.value : seg.label)).join('')
    expect(rebuilt).toBe(text)
  })

  it('rolls multi-term expressions deterministically', () => {
    let i = 0
    const seq = [3, 4, 2]
    const rolled = rollNormalizedExpression('1d6+1d8+2', {
      rollDie: () => seq[i++],
    })
    expect(rolled?.total).toBe(3 + 4 + 2)
    expect(rolled?.rolls).toEqual([3, 4])
    expect(rolled?.mod).toBe(2)
  })

  it('does not include average prefixes in calculations', () => {
    const m = extractDiceMatches('Melee Attack Roll. Hit: 45 (10d8) Lightning damage.')[0]
    expect(m?.normalized).toBe('10d8')
    expect(m?.displayAverage).toBe(45)
    const rolled = rollNormalizedExpression(m.normalized, { rollDie: () => 1 })
    expect(rolled?.total).toBe(10)
  })
})

