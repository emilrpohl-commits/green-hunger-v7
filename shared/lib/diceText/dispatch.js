function formatRollBreakdown(rolls, mod) {
  const dicePart = Array.isArray(rolls) && rolls.length > 0 ? `[${rolls.join('+')}]` : ''
  const modPart = mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ''
  return `${dicePart}${modPart}` || '0'
}

export function formatDiceRollFeedText({
  contextLabel,
  normalized,
  total,
  rolls,
  mod,
  hasAveragePrefix = false,
  displayAverage = null,
  includeAverageHint = false,
}) {
  const ctx = contextLabel ? `${contextLabel}: ` : ''
  const avgHint = includeAverageHint && hasAveragePrefix && Number.isFinite(Number(displayAverage))
    ? ` (avg ${Number(displayAverage)})`
    : ''
  return `${ctx}${normalized}${avgHint} -> ${formatRollBreakdown(rolls, mod)} = ${total}`
}

export function createPlayerDiceRollHandler({
  pushRoll,
  rollerName = 'Player',
  defaultContextLabel = '',
  includeAverageHint = false,
}) {
  return (payload) => {
    if (typeof pushRoll !== 'function' || !payload) return
    const text = formatDiceRollFeedText({
      ...payload,
      contextLabel: payload.contextLabel || defaultContextLabel,
      includeAverageHint,
    })
    pushRoll(text, rollerName)
  }
}

export function createDmDiceRollHandler({
  pushFeedEvent,
  defaultContextLabel = '',
  type = 'roll',
  shared = true,
  includeAverageHint = false,
}) {
  return (payload) => {
    if (typeof pushFeedEvent !== 'function' || !payload) return
    const text = formatDiceRollFeedText({
      ...payload,
      contextLabel: payload.contextLabel || defaultContextLabel,
      includeAverageHint,
    })
    pushFeedEvent(text, type, shared)
  }
}

