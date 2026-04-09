/**
 * Dev-only QA: Realtime Presence channel so the DM app can signal player clients
 * without env vars or combat_state persistence.
 */
export function qaHoldSavePromptChannelName(sessionRunId) {
  const id = encodeURIComponent(String(sessionRunId || 'default'))
  return `qa-dev-hold-save-prompt:${id}`
}
