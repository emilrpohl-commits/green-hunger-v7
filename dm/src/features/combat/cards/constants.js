/**
 * Shared constants and pure helpers for the combat card system.
 * No React, no store imports — safe to use in any component.
 */

// ── Condition lists (SRD 5.2.1 catalog + homebrew tags) ─────────────────────
export {
  CONDITIONS,
  CONDITION_DESC,
  CONDITION_COLOUR,
} from '@shared/lib/rules/conditionCatalog.js'

// ── Spell effects ──────────────────────────────────────────────────────────

/** DM applies these to enemies */
export const HOSTILE_SPELL_EFFECTS = [
  { name: 'Bane',                colour: '#a060c0', mechanic: '−1d4 attacks & saves',    concentration: true  },
  { name: 'Hex',                 colour: '#8040a0', mechanic: '−1d4 ability checks',      concentration: true  },
  { name: 'Faerie Fire',         colour: '#80c0ff', mechanic: 'Advantage on attacks vs.', concentration: true  },
  { name: 'Guiding Bolt',        colour: '#ffd080', mechanic: 'Adv. on next attack vs.',  concentration: false },
  { name: 'Hold Person',         colour: '#c08040', mechanic: 'Paralyzed, attacks crit',  concentration: true  },
  { name: 'Ray of Enfeeblement', colour: '#906040', mechanic: 'Half dmg STR attacks',     concentration: true  },
  { name: "Hunter's Mark",       colour: '#c04040', mechanic: '+1d6 damage from hunter',  concentration: true  },
  { name: 'Silvery Barbs',       colour: '#c0c0ff', mechanic: 'Reroll next success',      concentration: false },
  { name: 'Command',             colour: '#e0a040', mechanic: 'Obeying command',          concentration: false },
  { name: 'Charm',               colour: '#ff80a0', mechanic: 'Charmed by caster',        concentration: false },
]

/** DM applies these to PCs / allies */
export const PC_BUFF_SPELL_EFFECTS = [
  { name: 'Bless',           colour: '#6080c0', mechanic: '+1d4 attacks & saves', concentration: true  },
  { name: 'Shield of Faith', colour: '#8090ff', mechanic: '+2 AC',                concentration: true  },
  { name: 'Guidance',        colour: '#90b070', mechanic: '+1d4 ability checks',  concentration: true  },
]

// ── Visual helpers ─────────────────────────────────────────────────────────

/**
 * Returns the CSS colour string for a HP value.
 * @param {number} hpPct  0–100
 * @param {number} curHp
 */
export function HP_COLOUR(hpPct, curHp) {
  if (curHp === 0) return 'var(--danger)'
  if (hpPct > 60)  return 'var(--green-bright)'
  if (hpPct > 30)  return 'var(--warning)'
  return '#c46040'
}

/** Is the combatant bloodied (at or below 50% max HP)? */
export function isBloodied(combatant) {
  if (!combatant.maxHp) return false
  return combatant.curHp <= combatant.maxHp / 2 && combatant.curHp > 0
}

/** Is the combatant effectively dead/down? */
export function isDead(combatant) {
  return combatant.curHp === 0 && combatant.type === 'enemy'
}

/** Derive accent colour family for a combatant based on kind/type */
export function kindColour(combatant) {
  const k = combatant.kind || combatant.type
  if (k === 'pc' || k === 'player') return 'var(--green-bright)'
  if (k === 'boss')                 return '#d4a040'
  if (k === 'elite')                return '#c47040'
  return 'var(--rot-bright)'
}

export function kindColourRaw(combatant) {
  const k = combatant.kind || combatant.type
  if (k === 'pc' || k === 'player') return '#7ab86a'
  if (k === 'boss')                 return '#d4a040'
  if (k === 'elite')                return '#c47040'
  return '#c47040'
}

/** Human-readable type line for sub-header */
export function typeLine(combatant) {
  const k = combatant.kind || combatant.type
  if (k === 'pc' || k === 'player') {
    const parts = []
    if (combatant.race)     parts.push(combatant.race)
    if (combatant.class)    parts.push(`${combatant.class}${combatant.level ? ` ${combatant.level}` : ''}`)
    if (combatant.subclass) parts.push(combatant.subclass)
    return parts.join(' · ') || 'Player Character'
  }
  const parts = []
  if (combatant.creatureType) parts.push(combatant.creatureType)
  if (k === 'boss')            parts.push('Boss')
  if (k === 'elite')           parts.push('Elite')
  if (combatant.challengeRating != null) parts.push(`CR ${combatant.challengeRating}`)
  return parts.join(' — ') || 'Enemy'
}

// ── Dice helpers ───────────────────────────────────────────────────────────

export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

export function parseDmgString(str, crit = false) {
  const m = String(str).trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!m) {
    const n = parseInt(str) || 0
    return { total: crit ? n * 2 : n, rolls: [] }
  }
  const count = (crit ? 2 : 1) * parseInt(m[1])
  const sides  = parseInt(m[2])
  const mod    = m[3] ? parseInt(m[3]) : 0
  const rolls  = Array.from({ length: count }, () => rollDie(sides))
  return { total: rolls.reduce((a, b) => a + b, 0) + mod, rolls }
}

export function parseDamageFromStatblock(text) {
  const raw = String(text || '')
  const m   = raw.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i)
  if (!m) return null
  return m[1].replace(/\s+/g, '')
}
