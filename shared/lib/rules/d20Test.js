/**
 * D20 tests: advantage, disadvantage, cancel, single-die rerolls (SRD 5.2.1 style).
 */

/**
 * @typedef {{ value: number, rolls: number[], mode: 'normal' | 'advantage' | 'disadvantage' | 'cancelled' }} D20TestResult
 */

/**
 * @param {(sides: number) => number} rollDie e.g. (s) => rollDie(s) with sides 20
 * @param {{ advantage?: boolean, disadvantage?: boolean }} opts
 * @returns {D20TestResult}
 */
export function rollD20Test(rollDie, opts = {}) {
  const adv = !!opts.advantage
  const dis = !!opts.disadvantage
  if (adv && dis) {
    const value = rollDie(20)
    return { value, rolls: [value], mode: 'cancelled' }
  }
  if (adv) {
    const a = rollDie(20)
    const b = rollDie(20)
    return { value: Math.max(a, b), rolls: [a, b], mode: 'advantage' }
  }
  if (dis) {
    const a = rollDie(20)
    const b = rollDie(20)
    return { value: Math.min(a, b), rolls: [a, b], mode: 'disadvantage' }
  }
  const value = rollDie(20)
  return { value, rolls: [value], mode: 'normal' }
}

/**
 * When rerolling with advantage/disadvantage, reroll only one die (SRD).
 * @param {number[]} previousRolls two values from first roll
 * @param {(sides: number) => number} rollDie
 * @param {'advantage' | 'disadvantage'} mode
 * @param {number} replaceIndex 0 or 1
 */
export function rerollOneD20(previousRolls, rollDie, mode, replaceIndex = 0) {
  const a = previousRolls[0] ?? rollDie(20)
  const b = previousRolls[1] ?? rollDie(20)
  const next = [...previousRolls]
  const idx = replaceIndex === 1 ? 1 : 0
  next[idx] = rollDie(20)
  const [x, y] = next
  const value = mode === 'advantage' ? Math.max(x, y) : Math.min(x, y)
  return { value, rolls: next, mode }
}
