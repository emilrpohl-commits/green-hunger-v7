/**
 * d100 Wild Magic Surge table (PHB Sorcerer) — operational DM reference.
 * Align ranges 01–00 with pairs [1,2] … [99,100].
 *
 * @typedef {'instant' | 'duration' | 'triggered'} WildMagicEffectType
 * @typedef {'beneficial' | 'harmful' | 'chaotic'} WildMagicTone
 *
 * @typedef {Object} WildMagicEffect
 * @property {string} id
 * @property {[number, number]} range
 * @property {string} title
 * @property {string} description
 * @property {WildMagicEffectType} type
 * @property {string} [duration]
 * @property {WildMagicTone} tone
 */

const ROWS = [
  ['Cascade surges', 'Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.', 'duration', '1 minute', 'chaotic'],
  ['See invisible', 'For the next minute, you can see invisible creatures within 60 feet if they are not behind total cover.', 'duration', '1 minute', 'beneficial'],
  ['Modron visitor', 'A modron appears in an unoccupied space within 60 feet of you, then vanishes 1 minute later.', 'duration', '1 minute', 'chaotic'],
  ['Centered fireball', 'You cast fireball as a 3rd-level spell centered on yourself.', 'instant', undefined, 'harmful'],
  ['Magic missile barrage', 'You cast magic missile as a 5th-level spell.', 'instant', undefined, 'chaotic'],
  ['Height shift', 'Roll a d10. Change height by that many inches (odd = shrink, even = grow) for the same number of minutes.', 'duration', '1d10 minutes', 'chaotic'],
  ['Self confusion', 'You cast confusion centered on yourself.', 'instant', undefined, 'harmful'],
  ['Regeneration pulse', 'For the next minute, you regain 5 hit points at the start of each of your turns.', 'duration', '1 minute', 'beneficial'],
  ['Feather beard', 'You sprout a long beard of feathers that lasts until you sneeze, when the feathers explode away.', 'duration', 'Until sneeze', 'chaotic'],
  ['Greased', 'You cast grease centered on yourself.', 'instant', undefined, 'harmful'],
  ['Spell save pressure', 'Creatures have disadvantage on saving throws against the next spell you cast within the next minute.', 'triggered', 'Next spell within 1 minute', 'beneficial'],
  ['Astral rift', 'A portal to the Astral Plane opens for 1 minute; creatures may emerge.', 'duration', '1 minute', 'chaotic'],
  ['Sheepform', 'You cast polymorph on yourself. If you fail the save, you become a sheep for the spell’s duration.', 'duration', 'Spell duration', 'harmful'],
  ['Butterflies', 'Illusory butterflies and petals fill a 10-foot radius for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Ethereal blink', 'You vanish to the Ethereal Plane for 1 round, then return to the space you left or the nearest empty one.', 'duration', '1 round', 'chaotic'],
  ['Bonus action surge', 'You can take one additional action immediately.', 'instant', undefined, 'beneficial'],
  ['Mass invisibility', 'Each creature within 30 feet of you becomes invisible until the end of your next turn (attacking ends it early).', 'duration', 'Until end of your next turn', 'beneficial'],
  ['Flumph summons', '1d4 flumphs appear in unoccupied spaces within 60 feet. They are afraid of you and flee.', 'instant', undefined, 'chaotic'],
  ['Potted plant', 'You transform into a potted plant until the start of your next turn. While a plant, you are incapacitated and vulnerable.', 'duration', 'Until start of your next turn', 'harmful'],
  ['Combat teleport', 'For the next minute, you can use a bonus action each turn to teleport up to 20 feet.', 'duration', '1 minute', 'beneficial'],
  ['Levitate self', 'You cast levitate on yourself.', 'duration', 'Up to 10 minutes', 'chaotic'],
  ['Unicorn', 'A unicorn appears in an unoccupied space within 60 feet; the DM controls it. It may not stick around.', 'duration', 'Varies', 'chaotic'],
  ['Muted', 'You cannot speak for 1 minute; verbal components fail.', 'duration', '1 minute', 'harmful'],
  ['Spectral shield', 'Spectral shield grants you +2 AC for 1 minute.', 'duration', '1 minute', 'beneficial'],
  ['Mass healing burst', 'Each creature within 30 feet regains 1d10 hit points, including you.', 'instant', undefined, 'beneficial'],
  ['Ethereal music', 'Faint ethereal music surrounds you for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Object recall', 'You teleport an object you can see within 60 feet into your hand if you have a hand free.', 'instant', undefined, 'beneficial'],
  ['Third eye', 'An eye appears on your forehead for 1 minute, giving you 120-foot darkvision.', 'duration', '1 minute', 'beneficial'],
  ['Flumph stampede', '1d6 flumphs appear within 60 feet, frightened of you, and scatter.', 'instant', undefined, 'chaotic'],
  ['Alcohol immunity', 'You are immune to intoxication for 24 hours.', 'duration', '24 hours', 'beneficial'],
  ['Berry shrub', 'A shrub grows from your head. Once, plucking a berry restores 1 HP; then the shrub vanishes.', 'triggered', 'Until used', 'beneficial'],
  ['Whisper shout', 'You shout when whispering and whisper when shouting for 1 hour.', 'duration', '1 hour', 'chaotic'],
  ['Annoying orb', 'A harmless orb of light orbits you, shedding dim light in 5 feet, for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Stench', 'You emit a faint offensive odor for 1 minute.', 'duration', '1 minute', 'harmful'],
  ['Daylight aura', 'Bright light radiates from you in a 30-foot radius for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Sorcery surge', 'You regain all expended sorcery points.', 'instant', undefined, 'beneficial'],
  ['Bonus language', 'You speak one extra language (DM’s choice) for 8 hours.', 'duration', '8 hours', 'beneficial'],
  ['Perception eye', 'A third eye grants advantage on Wisdom (Perception) checks for 1 minute.', 'duration', '1 minute', 'beneficial'],
  ['Charisma armor', 'Your AC includes your Charisma modifier for 1 minute.', 'duration', '1 minute', 'beneficial'],
  ['Uncontrollable laughter', 'You are overcome with laughter for 1 minute; incapacitated and prone until you save (DM adjudicates).', 'duration', '1 minute', 'harmful'],
  ['Free spell', 'The next spell you cast within 1 minute that uses an action uses no action.', 'triggered', 'Next spell within 1 minute', 'beneficial'],
  ['Mayfly swarm', 'A cloud of harmless oversized mayflies fills a 10-foot-radius sphere for 10 rounds.', 'duration', '10 rounds', 'chaotic'],
  ['Echo music', 'Faint ethereal music surrounds you for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Blue skin', 'Your skin turns vivid blue until removed by dispel magic.', 'duration', 'Until dispelled', 'chaotic'],
  ['Object glow', 'An object you see within 60 feet glows with faerie fire–like dim light for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['False earthquake', 'Creatures within 300 feet feel a harmless tremor for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Size up', 'Your size increases one category for 1 minute if space allows.', 'duration', '1 minute', 'chaotic'],
  ['Piercing vulnerability', 'You and creatures within 30 feet gain vulnerability to piercing for 1 minute.', 'duration', '1 minute', 'harmful'],
  ['Haunting melody', 'Faint ethereal music surrounds you for 1 minute.', 'duration', '1 minute', 'chaotic'],
  ['Sorcery nova', 'You regain all expended sorcery points.', 'instant', undefined, 'beneficial'],
]

function buildEffects() {
  /** @type {WildMagicEffect[]} */
  const out = []
  for (let i = 0; i < ROWS.length; i++) {
    const low = i * 2 + 1
    const high = i * 2 + 2
    const [title, description, type, duration, tone] = ROWS[i]
    out.push({
      id: `wm-${String(i + 1).padStart(2, '0')}`,
      range: [low, high],
      title,
      description,
      type: /** @type {WildMagicEffectType} */ (type),
      ...(duration ? { duration } : {}),
      tone: /** @type {WildMagicTone} */ (tone),
    })
  }
  return out
}

export const WILD_MAGIC_EFFECTS = buildEffects()

/**
 * @param {number} d100 1–100
 * @returns {(WildMagicEffect & { roll: number }) | null}
 */
export function resolveWildMagicRoll(d100) {
  const r = Math.min(100, Math.max(1, Math.floor(Number(d100) || 0)))
  for (const e of WILD_MAGIC_EFFECTS) {
    if (r >= e.range[0] && r <= e.range[1]) {
      return { ...e, roll: r }
    }
  }
  return null
}

export function rollWildMagicD100() {
  return Math.floor(Math.random() * 100) + 1
}

/** Add to active tracker when not purely instant. */
export function wildMagicShouldTrackActive(effect) {
  return effect.type === 'duration' || effect.type === 'triggered'
}
