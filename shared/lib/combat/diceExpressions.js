import { extractDiceMatches, rollNormalizedExpression } from '@shared/lib/diceText/parser.js'

/**
 * @typedef {{ start: number, end: number, expr: string, normalized: string }} DiceMatch
 */

/**
 * Backward-compatible bridge to new dice text parser.
 * @param {string} text
 * @returns {DiceMatch[]}
 */
export function findDiceExpressionsInText(text) {
  return extractDiceMatches(text).map((m) => ({
    start: m.start,
    end: m.end,
    expr: m.expr,
    normalized: m.normalized,
  }))
}

/**
 * Roll NdM+mod using RNG injectable for tests.
 * @param {string} normalized e.g. 2d6+3
 * @param {{ rollDie?: (n:number)=>number }} [rng]
 * @returns {{ total: number, rolls: number[], mod: number } | null}
 */
export function rollDiceExpression(normalized, rng = {}) {
  return rollNormalizedExpression(normalized, rng)
}
