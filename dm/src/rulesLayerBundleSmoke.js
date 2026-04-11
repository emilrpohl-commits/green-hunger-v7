/**
 * Ensures Vite bundles `data/rules` via `@rules-data` alias (smoke / future UI).
 */
import srdSource from '@rules-data/srd-source.json'
import rulesGlossary from '@rules-data/rules-glossary.json'

export const bundledRulesManifest = srdSource
/** Keeps `rules-glossary.json` in the DM bundle (used by glossaryService / RulesLookupPanel). */
export const rulesGlossaryEntryCount = Array.isArray(rulesGlossary?.entries) ? rulesGlossary.entries.length : 0
