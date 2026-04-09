/**
 * Apply `characters.homebrew_json` patches for player-facing sheets (campaign flavor, renames).
 * @param {Record<string, unknown>} character - merged player character object (camelCase)
 * @returns {Record<string, unknown>}
 */
export function applyHomebrewPlayerSheet(character) {
  if (!character || typeof character !== 'object') return character
  const patch = character.homebrew_json || character.homebrewJson
  if (!patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
    return character
  }

  const next = { ...character }

  if (patch.subclass != null) next.subclass = patch.subclass
  if (patch.backstory != null) next.backstory = patch.backstory

  if (Array.isArray(patch.features_override)) {
    next.features = patch.features_override
  } else if (Array.isArray(patch.feature_replacements)) {
    for (const rep of patch.feature_replacements) {
      const m = String(rep.match || '').toLowerCase()
      if (!m) continue
      next.features = (next.features || []).map((f) => {
        const n = String(f?.name || '').toLowerCase()
        if (n.includes(m)) {
          return {
            ...f,
            name: rep.name != null ? rep.name : f.name,
            description: rep.description != null ? rep.description : f.description,
          }
        }
        return f
      })
    }
  }

  if (Array.isArray(patch.equipment_string_replacements)) {
    next.equipment = (next.equipment || []).map((item) => {
      let out = typeof item === 'string' ? item : String(item)
      for (const r of patch.equipment_string_replacements) {
        if (r.from && out.includes(r.from)) out = out.split(r.from).join(r.to ?? '')
      }
      return out
    })
  }

  return next
}

/**
 * When true, bundled legacy sanitize (e.g. Ilya Talona strings) is skipped — DB row is already player-safe.
 * @param {Record<string, unknown>} homebrewJson
 */
export function shouldSkipLegacyPlayerSanitize(homebrewJson) {
  return !!(homebrewJson && typeof homebrewJson === 'object' && homebrewJson.player_sheet_sanitized)
}
