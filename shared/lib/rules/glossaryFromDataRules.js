/**
 * Prefer structured glossary under data/rules; produces the legacy { term, definition }[] shape.
 * Build-time: apps should import JSON from @rules-data/rules-glossary.json where configured.
 */

/**
 * @param {Record<string, unknown>} structured
 * @returns {{ term: string, definition: string, families?: string[], key?: string }[]}
 */
export function flattenRulesGlossary(structured) {
  const entries = structured?.entries
  if (!Array.isArray(entries)) return []
  return entries.map((e) => {
    const term = e.label || e.key || ''
    const definition = e.definition || e.summary || e.text || ''
    const fam = e.families ?? e.family
    const families = Array.isArray(fam) ? fam : fam != null ? [String(fam)] : undefined
    const key = typeof e.key === 'string' ? e.key : undefined
    return { term, definition, ...(families ? { families } : {}), ...(key ? { key } : {}) }
  })
}
