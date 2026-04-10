import { parseCastingTimeMeta } from '@shared/lib/combatRules.js'
import { mapApiSpellToCharacterSpell } from '@shared/lib/engine/mappers.js'

export function getLoggedInCharacterId() {
  try {
    return sessionStorage.getItem('gh_player')
  } catch {
    return null
  }
}

export function shouldAcceptDmTargetForClient(rowTargetId, decodedTargetId, ilyaAssignedTo) {
  const tid = rowTargetId ?? decodedTargetId
  if (!tid || tid === 'all') return true
  const me = getLoggedInCharacterId()
  if (!me) return true
  if (String(tid) === String(me)) return true
  if (String(tid) === 'ilya' && ilyaAssignedTo && String(ilyaAssignedTo) === String(me)) return true
  return false
}

export function normalizeSpellId(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function mergeSpellWithOverride(baseSpell = {}, overrides = {}) {
  const merged = { ...baseSpell, ...overrides }
  if (baseSpell.damage || overrides.damage) {
    merged.damage = { ...(baseSpell.damage || {}), ...(overrides.damage || {}) }
  }
  if (baseSpell.healDice || overrides.healDice) {
    merged.healDice = { ...(baseSpell.healDice || {}), ...(overrides.healDice || {}) }
  }
  return merged
}

export function toEngineCompendiumSpell(row, charStats = {}) {
  if (!row) return null
  const payload = row.payload || {}
  return mapApiSpellToCharacterSpell({
    ...payload,
    ruleset: row.ruleset,
    source_index: row.source_index,
    source_url: row.source_url,
  }, charStats)
}

export function withSpellIds(characterMap) {
  const next = {}
  for (const [id, char] of Object.entries(characterMap || {})) {
    const spells = {}
    for (const [levelKey, list] of Object.entries(char.spells || {})) {
      spells[levelKey] = (list || []).map((spell) => ({
        ...spell,
        spellId: spell.spellId || normalizeSpellId(spell.name),
      }))
    }
    next[id] = { ...char, spells }
  }
  return next
}

export function sanitizeIlyaSheet(character) {
  if (!character || character.id !== 'ilya') return character
  const sanitized = { ...character }
  sanitized.subclass = 'Life Domain'
  sanitized.backstory = 'Scholar-cleric with a calm bedside manner and a habit of careful note-taking. Polite, precise, and immediately useful.'
  sanitized.features = (sanitized.features || []).map((feature) => {
    if (feature.name === "Talona's Touch") {
      return {
        ...feature,
        name: 'Field Suppression',
        description: 'Touch — DC 13 CON save or the target is weakened by a creeping malaise until the end of its next turn.',
      }
    }
    if (feature.name === 'Divine Intervention') {
      return {
        ...feature,
        description: 'Roll d100 — on ≤ level (7), divine aid answers. DM decides the form.',
      }
    }
    return feature
  })
  sanitized.equipment = (sanitized.equipment || []).map((item) => (
    item === 'Holy Symbol (Talona — concealed)' ? 'Holy Symbol (concealed)' : item
  ))
  return sanitized
}

export function sanitizeCombatantForPlayer(combatant) {
  if (!combatant || combatant.type !== 'enemy') return combatant
  const sanitized = { ...combatant }
  delete sanitized.abilityScores
  delete sanitized.savingThrows
  delete sanitized.actionOptions
  return sanitized
}
