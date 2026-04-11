/**
 * Find standard dice expressions in prose for clickable rolls.
 * Conservative: only matches NdM with optional +/- integer modifier (no PB until modeled).
 */

const DICE_RE = /\b(\d+)\s*d\s*(\d+)(?:\s*([+-])\s*(\d+))?\b/gi

/**
 * @typedef {{ start: number, end: number, expr: string, normalized: string }} DiceMatch
 */

/**
 * @param {string} text
 * @returns {DiceMatch[]}
 */
export function findDiceExpressionsInText(text) {
  const s = String(text || '')
  if (!s) return []
  /** @type {DiceMatch[]} */
  const out = []
  let m
  const re = new RegExp(DICE_RE.source, 'gi')
  while ((m = re.exec(s)) !== null) {
    const count = parseInt(m[1], 10)
    const sides = parseInt(m[2], 10)
    if (!Number.isFinite(count) || !Number.isFinite(sides)) continue
    if (count > 99 || sides > 1000) continue
    if (count === 0) continue
    let normalized = `${count}d${sides}`
    if (m[4]) {
      const val = parseInt(m[4], 10)
      normalized += m[3] === '-' ? `-${val}` : `+${val}`
    }
    const expr = s.slice(m.index, m.index + m[0].length).replace(/\s+/g, '')
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      expr,
      normalized: normalized.replace(/\s+/g, ''),
    })
  }
  return dedupeOverlapping(out, s)
}

function dedupeOverlapping(matches, fullText) {
  matches.sort((a, b) => a.start - b.start || b.end - a.end)
  /** @type {DiceMatch[]} */
  const kept = []
  let lastEnd = -1
  for (const m of matches) {
    if (m.start < lastEnd) continue
    const slice = fullText.slice(m.start, m.end)
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(slice)) continue
    kept.push(m)
    lastEnd = m.end
  }
  return kept
}

/**
 * Roll NdM+mod using RNG injectable for tests.
 * @param {string} normalized e.g. 2d6+3
 * @param {{ rollDie?: (n:number)=>number }} [rng]
 * @returns {{ total: number, rolls: number[], mod: number } | null}
 */
export function rollDiceExpression(normalized, rng = {}) {
  const rollDie = rng.rollDie || ((sides) => Math.floor(Math.random() * sides) + 1)
  const m = String(normalized || '').trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!m) return null
  const count = Math.min(99, Math.max(0, parseInt(m[1], 10)))
  const sides = Math.min(1000, Math.max(1, parseInt(m[2], 10)))
  const mod = m[3] ? parseInt(m[3], 10) : 0
  const rolls = []
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides))
  const total = rolls.reduce((a, b) => a + b, 0) + mod
  return { total, rolls, mod }
}
