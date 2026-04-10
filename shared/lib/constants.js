/**
 * Canonical beat type values as stored in the database.
 * The DM builder uses these directly. The run-mode sessionStore maps
 * 'combat' → 'combat trigger' for display, but the source-of-truth types are here.
 */
export const BEAT_TYPES = [
  'narrative',
  'prompt',
  'check',
  'decision',
  'combat',
  'reveal',
  'transition',
]

export const BEAT_TYPE_LABELS = {
  narrative:  'NARRATIVE',
  prompt:     'PROMPT',
  check:      'CHECK',
  decision:   'DECISION',
  combat:     'COMBAT',
  reveal:     'REVEAL',
  transition: 'TRANSITION',
}

export const BEAT_TYPE_COLOURS = {
  narrative:  'var(--text-muted)',
  prompt:     '#a0b0ff',
  check:      'var(--warning)',
  decision:   '#c4a0e0',
  combat:     'var(--danger)',
  reveal:     'var(--green-bright)',
  transition: 'var(--text-muted)',
}

export const BEAT_TYPE_STYLES = {
  narrative:  { color: 'var(--text-secondary)', bg: 'transparent' },
  prompt:     { color: '#a0b0ff',               bg: 'rgba(140,160,255,0.06)' },
  check:      { color: 'var(--warning)',        bg: 'rgba(196,160,64,0.06)' },
  decision:   { color: '#c4a0e0',              bg: 'rgba(180,140,220,0.06)' },
  combat:     { color: 'var(--danger)',         bg: 'rgba(196,64,64,0.08)' },
  reveal:     { color: 'var(--green-bright)',   bg: 'rgba(100,200,100,0.06)' },
  transition: { color: 'var(--text-muted)',     bg: 'transparent' },
}

export const CREATURE_SIZES = [
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
  'Gargantuan',
]

export const SPELL_RESOLUTION_TYPES = [
  'attack',
  'save',
  'auto',
  'heal',
  'utility',
  'special',
]
