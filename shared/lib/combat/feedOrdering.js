function toTs(value) {
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? 0 : parsed
}

function toNumericId(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function sortCombatFeedEventsDesc(events) {
  return [...(events || [])].sort((a, b) => {
    const tsDiff = toTs(b?.timestamp) - toTs(a?.timestamp)
    if (tsDiff !== 0) return tsDiff
    return toNumericId(b?.id) - toNumericId(a?.id)
  })
}

export function mergeUniqueCombatFeedEvent(events, event) {
  const incomingId = event?.id != null ? String(event.id) : null
  const list = Array.isArray(events) ? events : []
  if (!incomingId) return sortCombatFeedEventsDesc([event, ...list])
  const deduped = [event, ...list.filter((entry) => String(entry?.id) !== incomingId)]
  return sortCombatFeedEventsDesc(deduped)
}
