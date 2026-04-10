export const rollDie = (sides) => Math.floor(Math.random() * sides) + 1

export const rollDice = (count, sides) =>
  Array.from({ length: Math.max(count, 0) }, () => rollDie(sides))

export const parseModNum = (modStr) => {
  const n = parseInt(modStr)
  return isNaN(n) ? 0 : n
}

export const isAttackRoll = (hitStr) => /^[+-]?\d+$/.test(String(hitStr).trim())

export const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`)

export const parseDiceNotation = (notation) => {
  if (!notation || typeof notation !== 'string') return null
  const m = notation.trim().match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/)
  if (!m) return null
  const modVal = m[4] ? Number(m[4]) * (m[3] === '-' ? -1 : 1) : 0
  return { count: Number(m[1]), sides: Number(m[2]), mod: modVal }
}
