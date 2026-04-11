/**
 * Quick Rulings Engine — static tables + helpers (DMG-style guidance).
 */

export const SEVERITY_ORDER = ['minor', 'moderate', 'dangerous', 'deadly', 'catastrophic']

export const SEVERITY_LABELS = {
  minor: 'Minor',
  moderate: 'Moderate',
  dangerous: 'Dangerous',
  deadly: 'Deadly',
  catastrophic: 'Catastrophic',
}

/** d10 counts per level band (0=1–4, 1=5–10, 2=11–16, 3=17–20) × severity */
export const IMPROVISED_DAMAGE_D10 = {
  0: { minor: 1, moderate: 2, dangerous: 4, deadly: 6, catastrophic: 10 },
  1: { minor: 2, moderate: 4, dangerous: 6, deadly: 10, catastrophic: 18 },
  2: { minor: 4, moderate: 6, dangerous: 10, deadly: 18, catastrophic: 24 },
  3: { minor: 6, moderate: 10, dangerous: 18, deadly: 24, catastrophic: 30 },
}

export function improvisedDamageLevelBand(level) {
  const lv = Math.min(20, Math.max(1, Math.floor(Number(level) || 1)))
  if (lv <= 4) return 0
  if (lv <= 10) return 1
  if (lv <= 16) return 2
  return 3
}

export function improvisedDamageDice(level, severity) {
  const band = improvisedDamageLevelBand(level)
  const sev = SEVERITY_ORDER.includes(severity) ? severity : 'moderate'
  const n = IMPROVISED_DAMAGE_D10[band][sev] ?? 2
  return { count: n, sides: 10, notation: `${n}d10` }
}

export function averageNd10(count) {
  const n = Math.max(0, Number(count) || 0)
  return n * 5.5
}

export function rollNd10(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  let sum = 0
  for (let i = 0; i < n; i++) sum += Math.floor(Math.random() * 10) + 1
  return sum
}

export const OBJECT_MATERIALS = [
  { id: 'cloth', label: 'Cloth / paper / rope', ac: 11 },
  { id: 'glass', label: 'Glass / ice', ac: 13 },
  { id: 'wood', label: 'Wood', ac: 15 },
  { id: 'stone', label: 'Stone', ac: 17 },
  { id: 'iron', label: 'Iron / steel', ac: 19 },
  { id: 'mithral', label: 'Mithral / adamantine', ac: 21 },
]

export const OBJECT_SIZES = ['tiny', 'small', 'medium', 'large', 'huge']

/** HP: avg, suggested dice string */
export const OBJECT_HP = {
  tiny: { fragile: { avg: 2, dice: '1d4' }, resilient: { avg: 5, dice: '2d4' } },
  small: { fragile: { avg: 3, dice: '1d6' }, resilient: { avg: 10, dice: '3d6' } },
  medium: { fragile: { avg: 4, dice: '1d8' }, resilient: { avg: 18, dice: '4d8' } },
  large: { fragile: { avg: 5, dice: '1d10' }, resilient: { avg: 27, dice: '5d10' } },
  huge: { fragile: { avg: 6, dice: '1d12' }, resilient: { avg: 40, dice: '5d12' } },
}

export const DC_TABLE = [
  { id: 'veryEasy', label: 'Very easy', dc: 5, hint: 'Routine for almost anyone.' },
  { id: 'easy', label: 'Easy', dc: 10, hint: 'A relaxed challenge for a capable person.' },
  { id: 'medium', label: 'Medium', dc: 15, hint: 'Typical trained adventurer benchmark.' },
  { id: 'hard', label: 'Hard', dc: 20, hint: 'Demanding even for veterans.' },
  { id: 'veryHard', label: 'Very hard', dc: 25, hint: 'Exceptional effort or luck.' },
  { id: 'nearlyImpossible', label: 'Nearly impossible', dc: 30, hint: 'Legendary; failure is expected.' },
]

/**
 * DMG-style adjusted XP multiplier from monster count.
 * @param {number} count
 */
export function encounterMultiplier(count) {
  const n = Math.max(1, Math.floor(Number(count) || 1))
  if (n === 1) return 1
  if (n === 2) return 1.5
  if (n <= 6) return 2
  if (n <= 10) return 2.5
  if (n <= 14) return 3
  return 4
}

export function adjustedEncounterXp(baseXpSum, monsterCount) {
  const base = Math.max(0, Number(baseXpSum) || 0)
  return Math.round(base * encounterMultiplier(monsterCount))
}

export const TRAP_SEVERITY = [
  { id: 'setback', label: 'Setback', effect: 'Minor inconvenience — slows the party, small resource tax, no lasting harm.' },
  { id: 'dangerous', label: 'Dangerous', effect: 'Moderate damage or meaningful setback; use Improvised Damage (Moderate–Dangerous tier).' },
  { id: 'deadly', label: 'Deadly', effect: 'Severe damage or incapacitation risk; pair with Deadly/Catastrophic damage for level.' },
]

export const CHASE_COMPLICATIONS = [
  'Crowd blocks the way — DC 10 Acrobatics or lose 10 feet.',
  'Narrow alley — squeeze or take a longer route.',
  'Guard patrol — Deception or hide, or they join the chase.',
  'Loose animals — Dex save DC 12 or fall prone.',
  'Market cart overturns — difficult terrain 20 feet.',
  'Roof tiles slip — DC 12 Acrobatics or slide 15 feet wrong direction.',
  'Bell alarm — next complication arrives one round sooner.',
  'Fog or smoke — Wisdom (Perception) DC 13 to keep sight on quarry.',
  'Bridge is out — Athletics DC 14 to leap or lose 1 round.',
  'Pickpocket distraction — lose an item or stop to retrieve it.',
  'Horse spooks — Animal Handling DC 12 or dismount.',
  'Dead end — Investigation DC 14 to find a hidden exit in 1 round.',
]

export function rollChaseComplication() {
  const i = Math.floor(Math.random() * CHASE_COMPLICATIONS.length)
  return { index: i + 1, text: CHASE_COMPLICATIONS[i] }
}

/** SRD-aligned summaries for quick lookup */
export const CONDITIONS_REFERENCE = [
  {
    name: 'Blinded',
    summary: 'Can’t see; attacks have disadvantage; attacks against it have advantage.',
    full: 'A blinded creature can’t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage.',
  },
  {
    name: 'Charmed',
    summary: 'Can’t attack the charmer; charmer has advantage on social checks.',
    full: 'A charmed creature can’t attack the charmer or target the charmer with harmful abilities. The charmer has advantage on ability checks to interact socially with the creature.',
  },
  {
    name: 'Deafened',
    summary: 'Can’t hear; fails checks that require hearing.',
    full: 'A deafened creature can’t hear and automatically fails any ability check that requires hearing.',
  },
  {
    name: 'Frightened',
    summary: 'Disadvantage while source in sight; can’t willingly move closer.',
    full: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can’t willingly move closer to that source.',
  },
  {
    name: 'Grappled',
    summary: 'Speed 0; ends if grappler is incapacitated or separated.',
    full: 'A grappled creature’s speed becomes 0, and it can’t benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the grappler’s reach.',
  },
  {
    name: 'Incapacitated',
    summary: 'Can’t take actions or reactions.',
    full: 'An incapacitated creature can’t take actions or reactions.',
  },
  {
    name: 'Invisible',
    summary: 'Heavily obscured for sight; attacks against it have disadvantage; its attacks have advantage.',
    full: 'An invisible creature is impossible to see without special senses; it’s heavily obscured for sight. Attack rolls against it have disadvantage, and its attack rolls have advantage.',
  },
  {
    name: 'Paralyzed',
    summary: 'Incapacitated; auto-fail Str/Dex saves; melee hits crit within 5 ft.',
    full: 'A paralyzed creature is incapacitated and can’t move or speak. It automatically fails Strength and Dexterity saving throws. Attack rolls against it have advantage. Any attack that hits from within 5 feet is a critical hit.',
  },
  {
    name: 'Petrified',
    summary: 'Turned to stone; weight ×10; resistant to damage; immune to poison/poisoned.',
    full: 'A petrified creature is transformed to solid inanimate material; its weight increases by a factor of ten. It is incapacitated, can’t move or speak, and is unaware. Attack rolls against it have advantage. It has resistance to all damage; immunity to poison and poisoned.',
  },
  {
    name: 'Poisoned',
    summary: 'Disadvantage on attacks and ability checks.',
    full: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
  },
  {
    name: 'Prone',
    summary: 'Disadvantage on attacks; melee vs prone has advantage; ranged disadvantage.',
    full: 'A prone creature’s only movement option is to crawl unless it stands up. It has disadvantage on attack rolls. An attack roll against it has advantage if the attacker is within 5 feet; otherwise disadvantage.',
  },
  {
    name: 'Restrained',
    summary: 'Speed 0; disadvantage on Dex saves and attacks; attacks against have advantage.',
    full: 'A restrained creature’s speed becomes 0, and it can’t benefit from bonuses to speed. Attack rolls against it have advantage, and its attack rolls have disadvantage. It has disadvantage on Dexterity saving throws.',
  },
  {
    name: 'Stunned',
    summary: 'Incapacitated; can’t move; auto-fail Str/Dex saves; attacks against have advantage.',
    full: 'A stunned creature is incapacitated, can’t move, and can speak only falteringly. It automatically fails Strength and Dexterity saving throws. Attack rolls against it have advantage.',
  },
  {
    name: 'Unconscious',
    summary: 'Incapacitated; drops held; prone; auto-fail Str/Dex; melee hits crit within 5 ft.',
    full: 'An unconscious creature is incapacitated, can’t move or speak, and is unaware. It drops whatever it’s holding and falls prone. It automatically fails Strength and Dexterity saving throws. Attack rolls against it have advantage. Hits from within 5 feet are critical hits.',
  },
]
