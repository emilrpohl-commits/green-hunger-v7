/**
 * Collect beat-linked stat block refs for the DM Encounters rail (deduped, script order).
 * Expects runtime-normalised sessions (see sessionContentNormalize) but tolerates snake_case beat fields.
 *
 * @param {{ scenes?: Array<{ title?: string, beats?: Array<Record<string, unknown>> }> } | null | undefined} session
 * @returns {Array<{ statBlockId: string, label: string, hint: string }>}
 */
export function collectScriptStatBlockRefs(session) {
  if (!session?.scenes?.length) return []
  const seen = new Set()
  const out = []
  for (const scene of session.scenes) {
    const sceneTitle = String(scene.title || '').trim() || 'Scene'
    const beats = Array.isArray(scene.beats) ? scene.beats : []
    for (const beat of beats) {
      const raw = beat.statBlockId ?? beat.stat_block_id
      if (raw == null) continue
      const statBlockId = String(raw).trim()
      if (!statBlockId) continue
      if (seen.has(statBlockId)) continue
      seen.add(statBlockId)
      const label = String(beat.title || '').trim() || 'Encounter beat'
      out.push({
        statBlockId,
        label,
        hint: sceneTitle,
      })
    }
  }
  return out
}
