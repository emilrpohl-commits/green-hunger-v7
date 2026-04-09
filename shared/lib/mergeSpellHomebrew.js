/**
 * Apply active `homebrew_overlays` rows onto a spell compendium entry.
 * @param {Record<string, unknown>} spell - built compendium spell
 * @param {Array<{ entity_type: string, canonical_ref: string | null, overlay_payload: Record<string, unknown> }>} overlays
 */
export function applySpellHomebrewOverlays(spell, overlays = []) {
  if (!spell || !overlays.length) return spell
  const spellId = String(spell.spellId || '').toLowerCase()
  const sourceIndex = String(spell.source_index || '').toLowerCase()
  let out = { ...spell }
  for (const row of overlays) {
    if (row.entity_type !== 'spell') continue
    const cr = row.canonical_ref != null ? String(row.canonical_ref).toLowerCase() : ''
    if (!cr || (cr !== spellId && cr !== sourceIndex)) continue
    const payload = row.overlay_payload && typeof row.overlay_payload === 'object' ? row.overlay_payload : {}
    out = { ...out, ...payload }
    if (out.combatProfile && typeof out.combatProfile === 'object') {
      out.combatProfile = { ...out.combatProfile, ...(payload.combatProfile || {}) }
    }
  }
  return out
}
