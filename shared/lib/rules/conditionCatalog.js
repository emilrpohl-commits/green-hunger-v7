/**
 * Canonical SRD 5.2.1-aligned conditions for UI + combat state.
 * @see catalog/conditions.json
 */
import conditionsDoc from './catalog/conditions.json'

const { entries, nameAliases } = conditionsDoc

/** @type {string[]} Display names in stable UI order */
export const CONDITIONS = entries.map((e) => e.name)

/** @type {Record<string, string>} Tooltip one-liners */
export const CONDITION_DESC = Object.fromEntries(entries.map((e) => [e.name, e.summary]))

/** @type {Record<string, string>} Chip colours */
export const CONDITION_COLOUR = Object.fromEntries(
  entries.map((e) => [e.name, e.colour || '#a09080']),
)

/** Quick Rulings panel: SRD-aligned summaries */
export const CONDITIONS_REFERENCE = entries
  .filter((e) => e.srd)
  .map((e) => ({
    name: e.name,
    summary: e.summary,
    full: e.summary,
  }))

const byNameLower = new Map(entries.map((e) => [e.name.toLowerCase(), e.name]))

/**
 * Normalize legacy / alternate spellings to catalog display name.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeConditionName(raw) {
  const s = String(raw || '').trim()
  if (!s) return s
  const alias = nameAliases[s.toLowerCase().replace(/\s+/g, ' ')]
  if (alias) return alias
  const direct = byNameLower.get(s.toLowerCase())
  if (direct) return direct
  return s
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isCanonicalConditionName(name) {
  return byNameLower.has(String(name || '').toLowerCase())
}
