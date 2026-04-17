const DMG_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]

const MINUS_LIKE_RE = /[−–—]/g
const SPACES_RE = /\s+/g
const DICE_ATOM_RE = /(?<![A-Za-z0-9_])\d*\s*d\s*(?:%|\d+)(?![A-Za-z0-9_])/gi
const LEADING_AVERAGE_RE = /(\d+)\s*\($/
const TRAILING_PAREN_MOD_RE = /^\s*\(\s*([+\-−–—])\s*(\d+)\s*\)/

function normalizeOp(op) {
  return String(op || '').replace(MINUS_LIKE_RE, '-') === '-' ? '-' : '+'
}

function normalizeDiceAtom(raw) {
  const clean = String(raw || '').replace(SPACES_RE, '')
  const m = clean.match(/^(\d*)d(%|\d+)$/i)
  if (!m) return null
  const count = m[1] === '' ? 1 : Number(m[1])
  const sides = m[2] === '%' ? 100 : Number(m[2])
  if (!Number.isFinite(count) || !Number.isFinite(sides)) return null
  if (count < 0 || count > 999 || sides < 1 || sides > 1000) return null
  return `${count}d${sides}`
}

function isLikelyDateSlice(slice) {
  return /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(slice)
}

function parseNormalizedTerms(normalized) {
  const src = String(normalized || '').trim()
  if (!src) return null
  const terms = []
  let i = 0
  while (i < src.length) {
    let sign = 1
    const ch = src[i]
    if (ch === '+') {
      i += 1
    } else if (ch === '-') {
      sign = -1
      i += 1
    }
    let j = i
    while (j < src.length && src[j] !== '+' && src[j] !== '-') j += 1
    const token = src.slice(i, j).trim()
    if (!token) return null
    const dm = token.match(/^(\d+)d(\d+)$/i)
    if (dm) {
      terms.push({ kind: 'dice', sign, count: Number(dm[1]), sides: Number(dm[2]) })
      i = j
      continue
    }
    const n = Number(token)
    if (!Number.isFinite(n)) return null
    terms.push({ kind: 'flat', sign, value: Math.abs(Math.trunc(n)) })
    i = j
  }
  return terms
}

function inferEffects(fullText, start, end) {
  const s = String(fullText || '')
  const left = s.slice(Math.max(0, start - 110), end)
  const right = s.slice(start, Math.min(s.length, end + 110))
  const nearby = `${left} ${right}`.toLowerCase()

  const isTempHp = /\btemporary hit points?\b/.test(nearby)
  const isHealing = /\b(regain|heals?|healing|restore)\b/.test(nearby) || /\bhit points?\b/.test(nearby)
  const halfOnSuccess = /\bhalf( as much)? on (a )?success\b/.test(nearby) || /\bon a failed save, half on a success\b/.test(nearby)
  const damageTypes = DMG_TYPES.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(nearby))
  const effectKind = isTempHp ? 'temp_hp' : isHealing ? 'healing' : 'damage'

  return {
    effectKind,
    damageTypes,
    halfOnSuccess,
  }
}

function toSegments(fullText, matches) {
  const s = String(fullText || '')
  if (!matches.length) return [{ type: 'text', value: s }]
  const segs = []
  let last = 0
  matches.forEach((m) => {
    if (m.start > last) segs.push({ type: 'text', value: s.slice(last, m.start) })
    segs.push({
      type: 'dice',
      label: s.slice(m.start, m.end),
      ...m,
    })
    last = m.end
  })
  if (last < s.length) segs.push({ type: 'text', value: s.slice(last) })
  return segs
}

export function extractDiceMatches(text) {
  const s = String(text || '')
  if (!s) return []
  const out = []
  const atomRe = new RegExp(DICE_ATOM_RE.source, 'gi')
  let atom
  while ((atom = atomRe.exec(s)) !== null) {
    let start = atom.index
    let end = atom.index + atom[0].length
    let normalized = normalizeDiceAtom(atom[0])
    let displayAverage = null
    let hasAveragePrefix = false
    if (!normalized) continue

    // Extend with chained + / - terms (dice or flat integers).
    let cursor = end
    while (cursor < s.length) {
      const rest = s.slice(cursor)
      const opMatch = rest.match(/^\s*([+\-−–—])\s*/)
      if (!opMatch) break
      const op = normalizeOp(opMatch[1])
      const afterOp = cursor + opMatch[0].length
      const restAfterOp = s.slice(afterOp)
      const nextDice = restAfterOp.match(/^\d*\s*d\s*(?:%|\d+)/i)
      if (nextDice) {
        const nd = normalizeDiceAtom(nextDice[0])
        if (!nd) break
        normalized += `${op}${nd}`
        cursor = afterOp + nextDice[0].length
        end = cursor
        continue
      }
      const nextInt = restAfterOp.match(/^(\d+)/)
      if (!nextInt) break
      normalized += `${op}${nextInt[1]}`
      cursor = afterOp + nextInt[1].length
      end = cursor
    }

    // Optional wrapped average prefix: "10 (2d6+3)".
    const leftRaw = s.slice(Math.max(0, start - 16), start)
    const avgMatch = leftRaw.match(LEADING_AVERAGE_RE)
    if (avgMatch && s.slice(start - 1, start) === '(' && s.slice(end, end + 1) === ')') {
      start = start - avgMatch[0].length
      end += 1
      displayAverage = Number(avgMatch[1])
      hasAveragePrefix = Number.isFinite(displayAverage)
    } else if (s.slice(start - 1, start) === '(' && s.slice(end, end + 1) === ')') {
      start -= 1
      end += 1
    }

    // Optional trailing "(+1)" style modifier.
    const trailing = s.slice(end)
    const trailingMod = trailing.match(TRAILING_PAREN_MOD_RE)
    if (trailingMod) {
      const op = normalizeOp(trailingMod[1])
      normalized += `${op}${trailingMod[2]}`
      end += trailingMod[0].length
    }

    const expr = s.slice(start, end)
    if (isLikelyDateSlice(expr)) continue
    const terms = parseNormalizedTerms(normalized)
    if (!terms) continue

    out.push({
      start,
      end,
      expr,
      normalized,
      terms,
      displayAverage: hasAveragePrefix ? displayAverage : null,
      hasAveragePrefix,
      ...inferEffects(s, start, end),
    })
    atomRe.lastIndex = end
  }

  // Dedupe overlapping ranges.
  out.sort((a, b) => a.start - b.start || b.end - a.end)
  const deduped = []
  let lastEnd = -1
  for (const m of out) {
    if (m.start < lastEnd) continue
    deduped.push(m)
    lastEnd = m.end
  }
  return deduped
}

export function parseDiceText(text) {
  const s = String(text || '')
  const matches = extractDiceMatches(s)
  return {
    text: s,
    matches,
    segments: toSegments(s, matches),
  }
}

export function rollNormalizedExpression(normalized, rng = {}) {
  const rollDie = rng.rollDie || ((sides) => Math.floor(Math.random() * sides) + 1)
  const terms = parseNormalizedTerms(String(normalized || '').trim())
  if (!terms) return null

  const rolls = []
  let mod = 0
  let total = 0
  for (const term of terms) {
    if (term.kind === 'flat') {
      const v = term.sign * term.value
      mod += v
      total += v
      continue
    }
    const count = Math.max(0, Math.min(999, Number(term.count) || 0))
    const sides = Math.max(1, Math.min(1000, Number(term.sides) || 0))
    for (let i = 0; i < count; i += 1) {
      const r = rollDie(sides)
      rolls.push(term.sign < 0 ? -r : r)
      total += term.sign < 0 ? -r : r
    }
  }
  return { total, rolls, mod }
}

