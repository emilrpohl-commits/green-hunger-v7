/**
 * Mob attack math: probability to hit vs AC, expected hits, optional damage.
 */

function singleAttackHitProb(attackMod, targetAc) {
  const mod = Number(attackMod) || 0
  const ac = Number(targetAc) || 10
  let hits = 0
  for (let d = 1; d <= 20; d++) {
    if (d === 1) continue
    if (d === 20) {
      hits += 1
      continue
    }
    if (d + mod >= ac) hits += 1
  }
  return hits / 20
}

/**
 * @param {Object} opts
 * @param {number} opts.attackBonus (total to hit bonus)
 * @param {number} opts.targetAc
 * @param {'normal'|'advantage'|'disadvantage'} [opts.advantage]
 */
export function mobHitProbability({ attackBonus, targetAc, advantage = 'normal' }) {
  const p = singleAttackHitProb(attackBonus, targetAc)
  if (advantage === 'advantage') return 1 - (1 - p) ** 2
  if (advantage === 'disadvantage') return p ** 2
  return p
}

/**
 * @param {Object} opts
 * @param {number} opts.mobCount
 * @param {number} opts.attackBonus
 * @param {number} opts.targetAc
 * @param {'normal'|'advantage'|'disadvantage'} [opts.advantage]
 */
export function mobExpectedHits(opts) {
  const n = Math.max(0, Math.floor(Number(opts.mobCount) || 0))
  return n * mobHitProbability(opts)
}

/** Average of NdX + flat */
export function averageNdX(count, sides, flat = 0) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  const s = Math.max(1, Math.floor(Number(sides) || 6))
  const f = Number(flat) || 0
  return n * ((s + 1) / 2) + f
}

/**
 * Expected damage if each hit deals avgDamage.
 */
export function mobExpectedDamage(hitOpts, avgDamagePerHit) {
  return mobExpectedHits(hitOpts) * (Number(avgDamagePerHit) || 0)
}
