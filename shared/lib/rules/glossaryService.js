/**
 * Rules glossary: load structured SRD glossary, flatten, and search.
 * Data from `@rules-data/rules-glossary.json` (Vite alias in DM / Player apps).
 */
import rulesGlossary from '@rules-data/rules-glossary.json'
import { flattenRulesGlossary } from './glossaryFromDataRules.js'

/** @type {null | Array<{ term: string, definition: string, families?: string[], key?: string, searchBlob: string }>}
 */
let _flat = null

/**
 * @returns {{ term: string, definition: string, families?: string[], key?: string, searchBlob: string }[]}
 */
export function getGlossaryFlatIndex() {
  if (!_flat) {
    const base = flattenRulesGlossary(rulesGlossary)
    _flat = base.map((e) => ({
      ...e,
      searchBlob: `${e.term}\n${e.definition}\n${(e.families || []).join(' ')}\n${e.key || ''}`.toLowerCase(),
    }))
  }
  return _flat
}

/**
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export function searchRulesGlossary(query, opts = {}) {
  const limit = opts.limit ?? 40
  const q = String(query || '').trim().toLowerCase()
  const idx = getGlossaryFlatIndex()
  if (!q) return idx.slice(0, limit)
  return idx.filter((e) => e.searchBlob.includes(q)).slice(0, limit)
}

/**
 * Match glossary entry for a canonical condition display name (e.g. "Blinded").
 * @param {string} conditionName
 * @returns {{ term: string, definition: string, families?: string[], key?: string } | null}
 */
export function lookupGlossaryForCondition(conditionName) {
  const name = String(conditionName || '').trim()
  if (!name) return null
  const lower = name.toLowerCase()
  const idx = getGlossaryFlatIndex()
  return (
    idx.find((e) => e.term && e.term.toLowerCase() === lower)
    || idx.find((e) => e.key && String(e.key).toLowerCase() === lower.replace(/\s+/g, '_'))
    || null
  )
}

export function getRulesGlossaryMeta() {
  return rulesGlossary?.meta ?? {}
}
