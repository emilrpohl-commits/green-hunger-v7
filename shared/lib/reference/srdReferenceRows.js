/**
 * Map Open5e / 5e-database SRD JSON entries → reference_* table row shapes (ETL + validation).
 * No browser-only deps.
 */

function joinDesc(desc) {
  if (Array.isArray(desc)) return desc.join('\n')
  if (desc == null) return ''
  return String(desc)
}

function extractSpellDamage(spell) {
  const d = spell.damage
  if (!d) return { damage_dice: null, damage_type: null }
  const dtype = d.damage_type?.name || null
  const atSlot = d.damage_at_slot_level
  if (atSlot && typeof atSlot === 'object') {
    const keys = Object.keys(atSlot).map(Number).sort((a, b) => a - b)
    const dice = keys.length ? atSlot[String(keys[0])] : null
    return { damage_dice: dice, damage_type: dtype }
  }
  const atChar = d.damage_at_character_level
  if (atChar && typeof atChar === 'object') {
    const keys = Object.keys(atChar).map(Number).sort((a, b) => a - b)
    const dice = keys.length ? atChar[String(keys[0])] : null
    return { damage_dice: dice, damage_type: dtype }
  }
  return { damage_dice: null, damage_type: dtype }
}

function componentsFromSrd(spell) {
  const arr = spell.components || []
  return {
    V: arr.includes('V'),
    S: arr.includes('S'),
    M: arr.includes('M') ? (spell.material || true) : null,
  }
}

/**
 * @param {Record<string, unknown>} spell
 * @param {string} ruleset e.g. '2014' | '2024'
 */
export function spellJsonToReferenceRow(spell, ruleset) {
  const { damage_dice, damage_type } = extractSpellDamage(spell)
  const saveIdx = spell.dc?.dc_type?.index
  const saveAbility = typeof saveIdx === 'string' ? saveIdx.toUpperCase().slice(0, 3) : null
  const classes = Array.isArray(spell.classes)
    ? spell.classes.map((c) => c?.name).filter(Boolean)
    : []

  return {
    ruleset,
    source_index: spell.index,
    name: spell.name,
    level: spell.level ?? 0,
    school: spell.school?.name ?? null,
    casting_time: spell.casting_time ?? null,
    range: spell.range ?? null,
    components: componentsFromSrd(spell),
    duration: spell.duration ?? null,
    ritual: !!spell.ritual,
    concentration: !!spell.concentration,
    description: joinDesc(spell.desc),
    higher_level: joinDesc(spell.higher_level),
    attack_type: spell.attack_type ?? null,
    damage_dice,
    damage_type,
    save_ability: saveAbility,
    classes: classes.length ? classes : null,
    raw_json: spell,
    source_url: spell.url ?? null,
  }
}

export function formatSrdSpeed(speed) {
  if (!speed) return null
  if (typeof speed === 'string') return speed
  if (typeof speed === 'object') {
    return Object.entries(speed)
      .map(([k, v]) => `${k} ${v}`.trim())
      .join(', ')
  }
  return null
}

/**
 * @param {Record<string, unknown>} m
 * @param {string} ruleset
 */
export function monsterJsonToReferenceRow(m, ruleset) {
  const acFirst = Array.isArray(m.armor_class) && m.armor_class[0] ? m.armor_class[0].value : null
  return {
    ruleset,
    source_index: m.index,
    name: m.name,
    size: m.size ?? null,
    creature_type: m.type ?? null,
    alignment: m.alignment ?? null,
    challenge_rating: m.challenge_rating != null ? String(m.challenge_rating) : null,
    xp: m.xp != null ? Number(m.xp) : null,
    ac: acFirst != null ? Number(acFirst) : null,
    max_hp: m.hit_points != null ? Number(m.hit_points) : null,
    hit_dice: m.hit_dice ?? null,
    speed: formatSrdSpeed(m.speed),
    raw_json: m,
  }
}

/**
 * @param {Record<string, unknown>} c
 * @param {string} ruleset
 */
export function conditionJsonToReferenceRow(c, ruleset) {
  return {
    ruleset,
    source_index: c.index,
    name: c.name,
    description: joinDesc(c.desc),
    raw_json: c,
  }
}
