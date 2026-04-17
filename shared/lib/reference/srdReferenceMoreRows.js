/**
 * SRD JSON → reference_* row shapes (beyond spells/monsters/conditions).
 * Pure functions — no Supabase. See docs/reference-import-contract.md.
 */

function joinDesc(desc) {
  if (Array.isArray(desc)) return desc.join('\n')
  if (desc == null) return ''
  return String(desc)
}

function abilityAbbrevFromIndex(idx) {
  if (!idx || typeof idx !== 'string') return null
  const u = idx.toUpperCase()
  if (u.length <= 3) return u
  return u.slice(0, 3)
}

function splitClassProficiencies(proficiencies = []) {
  const armor = []
  const weapons = []
  const tools = []
  for (const p of proficiencies) {
    const ix = p?.index
    if (!ix || typeof ix !== 'string') continue
    if (ix.startsWith('saving-throw-') || ix.startsWith('skill-')) continue
    if (ix.includes('armor') || ix === 'shields') armor.push(ix)
    else if (ix.includes('weapon') || ix === 'simple-weapons' || ix === 'martial-weapons') weapons.push(ix)
    else tools.push(ix)
  }
  return { armor, weapons, tools }
}

function extractSkillChoice(classJson) {
  const blocks = Array.isArray(classJson.proficiency_choices) ? classJson.proficiency_choices : []
  for (const b of blocks) {
    if (b?.type !== 'proficiencies') continue
    const choose = Number(b.choose) || 0
    const opts = b.from?.options
    if (!Array.isArray(opts) || !choose) continue
    const indices = []
    for (const o of opts) {
      const item = o?.item
      const ix = item?.index
      if (typeof ix === 'string' && ix.startsWith('skill-')) indices.push(ix)
    }
    if (indices.length) return { skill_choices: choose, skill_options: indices }
  }
  return { skill_choices: null, skill_options: [] }
}

/**
 * @param {Record<string, unknown>} classJson
 * @param {string} ruleset
 */
export function classJsonToReferenceRow(classJson, ruleset) {
  const saving = (classJson.saving_throws || [])
    .map((s) => abilityAbbrevFromIndex(s?.index))
    .filter(Boolean)
  const { armor, weapons, tools } = splitClassProficiencies(classJson.proficiencies || [])
  const { skill_choices, skill_options } = extractSkillChoice(classJson)
  const spellAb = classJson.spellcasting?.spellcasting_ability?.index
  const spellcastingAbility = spellAb ? abilityAbbrevFromIndex(spellAb) : null

  return {
    ruleset,
    source_index: classJson.index,
    name: classJson.name,
    hit_die: Number(classJson.hit_die) || 8,
    primary_ability: null,
    saving_throw_proficiencies: saving.length ? saving : [],
    armor_proficiencies: armor.length ? armor : [],
    weapon_proficiencies: weapons.length ? weapons : [],
    tool_proficiencies: tools.length ? tools : [],
    skill_choices,
    skill_options: skill_options.length ? skill_options : null,
    spellcasting_ability: spellcastingAbility,
    raw_json: classJson,
  }
}

/**
 * @param {Record<string, unknown>} feature
 * @param {string} ruleset
 */
export function classFeatureJsonToReferenceRow(feature, ruleset) {
  const classIndex = feature.class?.index || 'unknown'
  const subclassIndex = feature.subclass?.index ?? null
  const featureType = subclassIndex ? 'subclass' : 'class'
  return {
    ruleset,
    source_index: feature.index,
    class_index: classIndex,
    subclass_index: subclassIndex,
    level: Number(feature.level) || 0,
    name: feature.name,
    description: joinDesc(feature.desc),
    feature_type: featureType,
    raw_json: feature,
  }
}

/**
 * Flatten 2024 subclass embedded features into reference_class_features rows.
 * @param {Record<string, unknown>} subclassJson
 * @param {string} ruleset
 */
export function subclass2024FeaturesToReferenceRows(subclassJson, ruleset) {
  const classIndex = subclassJson.class?.index || 'unknown'
  const subclassIndex = subclassJson.index
  const feats = Array.isArray(subclassJson.features) ? subclassJson.features : []
  return feats.map((f, i) => {
    const slug = String(f?.name || 'feature')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const source_index = `${subclassIndex}-${slug}-${f.level}-${i}`
    return {
      ruleset,
      source_index,
      class_index: classIndex,
      subclass_index: subclassIndex,
      level: Number(f.level) || 0,
      name: f.name,
      description: joinDesc(f.description),
      feature_type: 'subclass',
      raw_json: { ...f, parent_subclass: subclassIndex },
    }
  })
}

/**
 * @param {Record<string, unknown>} sc
 * @param {string} ruleset
 */
export function subclassJsonToReferenceRow(sc, ruleset) {
  const desc = joinDesc(sc.desc)
  const desc2024 = typeof sc.description === 'string' ? sc.description : ''
  const granted = Array.isArray(sc.spells)
    ? sc.spells.map((entry) => ({
      prerequisites: entry.prerequisites || [],
      spell_index: entry.spell?.index ?? null,
      spell_name: entry.spell?.name ?? null,
    }))
    : null

  return {
    ruleset,
    source_index: sc.index,
    class_index: sc.class?.index || 'unknown',
    name: sc.name,
    flavor: sc.subclass_flavor || sc.summary || null,
    description: desc || desc2024 || null,
    granted_spells: granted,
    raw_json: sc,
  }
}

/**
 * @param {Record<string, unknown>} race
 * @param {string} ruleset
 */
export function raceJsonToReferenceRow(race, ruleset) {
  const ability_bonuses = (race.ability_bonuses || []).map((ab) => ({
    ability: abilityAbbrevFromIndex(ab?.ability_score?.index),
    bonus: Number(ab?.bonus) || 0,
  })).filter((x) => x.ability)

  return {
    ruleset,
    source_index: race.index,
    name: race.name,
    speed: race.speed != null ? Number(race.speed) : null,
    size: typeof race.size === 'string' ? race.size : null,
    ability_bonuses: ability_bonuses.length ? ability_bonuses : [],
    starting_languages: (race.languages || []).map((l) => l?.index).filter(Boolean),
    trait_indices: (race.traits || []).map((t) => t?.index).filter(Boolean),
    subrace_indices: (race.subraces || []).map((s) => s?.index).filter(Boolean),
    raw_json: race,
  }
}

/**
 * 2024 species JSON → reference_races row (same table, ruleset=2024).
 * @param {Record<string, unknown>} species
 * @param {string} ruleset
 */
export function speciesJsonToReferenceRow(species, ruleset) {
  return {
    ruleset,
    source_index: species.index,
    name: species.name,
    speed: species.speed != null ? Number(species.speed) : null,
    size: typeof species.size === 'string' ? species.size : null,
    ability_bonuses: [],
    starting_languages: [],
    trait_indices: (species.traits || []).map((t) => t?.index).filter(Boolean),
    subrace_indices: (species.subspecies || []).map((s) => s?.index).filter(Boolean),
    raw_json: species,
  }
}

/**
 * @param {Record<string, unknown>} trait
 * @param {string} ruleset
 */
export function traitJsonToReferenceRow(trait, ruleset) {
  const profs = (trait.proficiencies || []).map((p) => p?.index).filter(Boolean)
  return {
    ruleset,
    source_index: trait.index,
    name: trait.name,
    description: joinDesc(trait.desc),
    race_indices: (trait.races || []).map((r) => r?.index).filter(Boolean),
    subrace_indices: (trait.subraces || []).map((s) => s?.index).filter(Boolean),
    proficiency_grants: profs.length ? profs : null,
    raw_json: trait,
  }
}

/**
 * @param {Record<string, unknown>} item
 * @param {string} ruleset
 */
export function equipmentJsonToReferenceRow(item, ruleset) {
  const cat = item.equipment_category?.index ?? null
  const dmg = item.damage
  const ac = item.armor_class
  const throwR = item.throw_range
  const range = item.range

  return {
    ruleset,
    source_index: item.index,
    name: item.name,
    equipment_category: cat,
    weapon_category: item.weapon_category ?? null,
    weapon_range: item.weapon_range ?? null,
    damage_dice: dmg?.damage_dice ?? null,
    damage_type: dmg?.damage_type?.index ?? null,
    range_normal: range?.normal != null ? Number(range.normal) : (throwR?.normal != null ? Number(throwR.normal) : null),
    range_long: range?.long != null ? Number(range.long) : (throwR?.long != null ? Number(throwR.long) : null),
    ac_base: ac?.base != null ? Number(ac.base) : null,
    ac_add_dex_modifier: !!ac?.dex_bonus,
    ac_max_dex_bonus: ac?.max_bonus != null ? Number(ac.max_bonus) : null,
    strength_minimum: item.str_minimum != null ? Number(item.str_minimum) : null,
    stealth_disadvantage: !!item.stealth_disadvantage,
    cost_quantity: item.cost?.quantity != null ? Number(item.cost.quantity) : null,
    cost_unit: item.cost?.unit ?? null,
    weight_lb: item.weight != null ? Number(item.weight) : null,
    properties: (item.properties || []).map((p) => p?.index).filter(Boolean),
    raw_json: item,
  }
}

function parseMagicItemAttunement(descArr) {
  const first = Array.isArray(descArr) && descArr.length ? String(descArr[0]) : ''
  const lower = first.toLowerCase()
  const requires = lower.includes('requires attunement') || lower.includes('(requires attunement')
  let cond = null
  const m = first.match(/requires attunement(?:\s+by\s+([^.)]+))?/i)
  if (m && m[1]) cond = m[1].trim()
  return { requires_attunement: requires, attunement_conditions: cond }
}

/**
 * @param {Record<string, unknown>} item
 * @param {string} ruleset
 */
export function magicItemJsonToReferenceRow(item, ruleset) {
  const { requires_attunement, attunement_conditions } = parseMagicItemAttunement(item.desc)
  const variantOf = Array.isArray(item.variants) && item.variants.length && item.index
    ? null
    : null

  return {
    ruleset,
    source_index: item.index,
    name: item.name,
    equipment_category: item.equipment_category?.index ?? null,
    rarity: item.rarity?.name ?? null,
    requires_attunement,
    attunement_conditions,
    description: joinDesc(item.desc),
    is_variant: !!item.variant,
    variant_of_index: null,
    raw_json: item,
  }
}

function extractBackgroundLists(bg) {
  const skills = []
  const tools = []
  for (const p of bg.starting_proficiencies || []) {
    const ix = p?.index
    if (!ix) continue
    if (ix.startsWith('skill-')) skills.push(ix.replace(/^skill-/, ''))
    else tools.push(ix)
  }
  return { skills, tools }
}

/**
 * @param {Record<string, unknown>} bg
 * @param {string} ruleset
 */
export function backgroundJsonToReferenceRow(bg, ruleset) {
  const { skills, tools } = extractBackgroundLists(bg)
  const langChoose = bg.language_options?.choose != null ? Number(bg.language_options.choose) : null

  return {
    ruleset,
    source_index: bg.index,
    name: bg.name,
    skill_proficiencies: skills.length ? skills : [],
    tool_proficiencies: tools.length ? tools : [],
    language_choices: langChoose,
    starting_equipment: bg.starting_equipment || null,
    feature_name: bg.feature?.name ?? null,
    feature_description: joinDesc(bg.feature?.desc),
    personality_traits: bg.personality_traits || null,
    ideals: bg.ideals || null,
    bonds: bg.bonds || null,
    flaws: bg.flaws || null,
    raw_json: bg,
  }
}

/**
 * @param {Record<string, unknown>} p
 * @param {string} ruleset
 */
export function proficiencyJsonToReferenceRow(p, ruleset) {
  return {
    ruleset,
    source_index: p.index,
    name: p.name,
    proficiency_type: p.type ?? null,
    raw_json: p,
  }
}

/**
 * @param {Record<string, unknown>} lang
 * @param {string} ruleset
 */
export function languageJsonToReferenceRow(lang, ruleset) {
  return {
    ruleset,
    source_index: lang.index,
    name: lang.name,
    language_type: lang.type ?? null,
    typical_speakers: Array.isArray(lang.typical_speakers) ? lang.typical_speakers : [],
    script: lang.script ?? null,
    raw_json: lang,
  }
}

/**
 * @param {Record<string, unknown>} sk
 * @param {string} ruleset
 */
export function skillJsonToReferenceRow(sk, ruleset) {
  return {
    ruleset,
    source_index: sk.index,
    name: sk.name,
    ability_index: sk.ability_score?.index ?? null,
    description: joinDesc(sk.desc),
    raw_json: sk,
  }
}

/**
 * @param {Record<string, unknown>} dt
 * @param {string} ruleset
 */
export function damageTypeJsonToReferenceRow(dt, ruleset) {
  return {
    ruleset,
    source_index: dt.index,
    name: dt.name,
    description: joinDesc(dt.desc),
    raw_json: dt,
  }
}
