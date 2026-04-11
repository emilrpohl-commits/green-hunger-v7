/**
 * Canonical spell compendium ↔ runtime shapes (DM list, player compendium, character_spells payloads).
 */
import { parseCastingTimeMeta } from '../combatRules.js'

/** Coerce DB jsonb / import quirks to a plain object. */
export function normalizeRulesJson(raw) {
  if (raw == null || raw === '') return {}
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw)
      return typeof o === 'object' && o !== null && !Array.isArray(o) ? o : {}
    } catch {
      return {}
    }
  }
  return {}
}

/** Spell description / details for UI (never return a non-string to React). */
export function spellDetailToString(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  }
  return String(value)
}

export function slugifyPart(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

/** Stable spell_id / slug from name + level + source (idempotent imports). */
export function buildCompendiumSpellId(name, level, source) {
  const n = slugifyPart(name) || 'spell'
  const src = slugifyPart(source || 'unknown') || 'unknown'
  const base = `${n}_lv${Number(level) || 0}_${src}`
  if (base.length <= 200) return base
  let h = 0
  const s = `${name}|${level}|${source}`
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return `${n.slice(0, 120)}_lv${Number(level) || 0}_${src.slice(0, 40)}_${h.toString(16)}`
}

export function parseBooleanCell(value) {
  if (value === true || value === false) return value
  const t = String(value ?? '').trim().toLowerCase()
  if (!t) return false
  if (['yes', 'y', 'true', '1', 'x', '✓', 'on'].includes(t)) return true
  if (['no', 'n', 'false', '0', 'off', '—', '-'].includes(t)) return false
  return false
}

export function parseLevelCell(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(9, Math.max(0, Math.floor(value)))
  const t = String(value).trim().toLowerCase()
  if (t === 'cantrip' || t === 'c' || t === '0' || t === '0th') return 0
  const n = parseInt(String(value).replace(/\D/g, ''), 10)
  if (Number.isFinite(n)) return Math.min(9, Math.max(0, n))
  return 0
}

export function parseSaveAbility(save) {
  if (!save || typeof save !== 'string') return null
  const match = save.toUpperCase().match(/\b(STR|DEX|CON|INT|WIS|CHA)\b/)
  return match ? match[1] : null
}

export function parseAttackType(attack) {
  const value = String(attack ?? '').trim()
  if (!value) return null
  if (/melee/i.test(value)) return 'melee'
  if (/ranged/i.test(value)) return 'ranged'
  return null
}

export function parseDamageType(damageEffect) {
  const value = String(damageEffect ?? '').trim()
  if (!value) return null
  const upper = value.toUpperCase()
  const known = ['ACID', 'BLUDGEONING', 'COLD', 'FIRE', 'FORCE', 'LIGHTNING', 'NECROTIC', 'PIERCING', 'POISON', 'PSYCHIC', 'RADIANT', 'SLASHING', 'THUNDER']
  const found = known.find((k) => upper.includes(k))
  return found ? `${found[0]}${found.slice(1).toLowerCase()}` : null
}

export function mapTargetingToTargetMode(targetingText) {
  const t = String(targetingText ?? '').trim().toLowerCase()
  if (!t) return 'special'
  if (/\bself\b|yourself|you\b/.test(t) && t.length < 40) return 'self'
  if (/\bcone\b|\bcube\b|\bsphere\b|\bline\b|\bcylinder\b|\brectangle\b|emanation|aura|area|within \d+ ft/.test(t)) return 'area'
  if (/\bcreature\b|\btarget\b|\bone\b|\bmany\b|\bmultiple\b|\ball\b/.test(t)) {
    if (/\ball\b|each|every|any number|up to \d+ creatures/.test(t)) return 'multi_select'
    return 'single'
  }
  return 'special'
}

export function inferResolutionType({ attack, save, damageEffect, details }) {
  const attackStr = String(attack ?? '').trim()
  const saveStr = String(save ?? '').trim()
  const damage = parseDamageType(damageEffect)
  const d = String(details ?? '').toLowerCase()
  const effect = String(damageEffect ?? '').toLowerCase()

  if (/heal|regain hit points|restore hit points/.test(d) || effect.includes('healing')) return 'heal'
  if (attackStr && damage) return 'attack'
  if (saveStr && damage) return 'save'
  if (!attackStr && !saveStr && /auto-hit|automatically hits|magic missile/.test(d)) return 'auto'
  if (/summon|teleport|create|control|charmed|buff|detection|communication/.test(effect)) return 'utility'
  if (!attackStr && !saveStr && !damage) return 'utility'
  return 'special'
}

function inferTargetFromMode(targetMode) {
  if (targetMode === 'self') return 'self'
  if (targetMode === 'single') return 'enemy'
  if (targetMode === 'multi_select' || targetMode === 'area' || targetMode === 'area_all' || targetMode === 'area_selective') return 'enemy'
  return null
}

export function parseDiceSeries(text) {
  const matches = [...String(text || '').matchAll(/(\d+)d(\d+)/gi)]
  return matches.map((m) => ({ count: Number(m[1]), sides: Number(m[2]) }))
}

function parseScaling(details) {
  const text = String(details || '')
  const spellLevelPattern = /(\+?\d+d\d+|\+?\d+)\s+per slot level above/i
  const cantripPattern = /increases by (\d+d\d+) when you reach 5th level/i
  const dice = parseDiceSeries(text)
  return {
    has_spell_level_scaling: spellLevelPattern.test(text),
    has_cantrip_scaling: cantripPattern.test(text),
    dice_mentions: dice,
    confidence: dice.length > 0 ? 'medium' : 'low',
  }
}

/** Build search_text for DB GIN / client filtering. */
export function buildSearchText(parts) {
  return [
    parts.name,
    parts.school,
    parts.casting_time,
    parts.duration,
    parts.range,
    parts.area,
    parts.damage_effect,
    parts.details,
    parts.source,
    parts.targeting,
    parts.max_targets,
    parts.summon_stat_block,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 12000)
}

/**
 * Map a spell_compendium DB row → player spellCompendium entry (matches spells-table hydration shape).
 */
export function compendiumRowToPlayerEntry(row) {
  if (!row?.spell_id) return null
  const rulesJson = normalizeRulesJson(row.rules_json)
  const castingMeta = parseCastingTimeMeta(row.casting_time)
  const mechanic = rulesJson.inferred_mechanic || row.resolution_type || 'utility'
  const targetMode = row.target_mode || 'special'
  const target = rulesJson.inferred_target ?? inferTargetFromMode(targetMode)
  return {
    spellId: row.spell_id,
    source_index: row.spell_id,
    compendiumSource: 'spell_compendium',
    soundEffectUrl: row.sound_effect_url || null,
    name: row.name,
    level: row.level,
    school: row.school,
    mechanic,
    castingTime: row.casting_time,
    actionType: castingMeta.actionType,
    isBonusAction: castingMeta.isBonusAction,
    isReaction: castingMeta.isReaction,
    range: row.range,
    duration: row.duration,
    ritual: !!row.ritual,
    concentration: !!row.concentration,
    description: spellDetailToString(row.details),
    higher_levels: '',
    saveType: row.save_ability || row.save || null,
    attack_type: row.attack_type,
    targetMode,
    target,
    source: row.source || null,
    area: row.area ? { shape: null, size: row.area, origin: null } : rulesJson.area_struct || null,
    scaling: rulesJson.scaling || {},
    rules_json: {
      ...rulesJson,
      damage_effect: row.damage_effect,
      summon_stat_block: row.summon_stat_block,
      targeting_label: row.targeting,
      max_targets: row.max_targets,
      source_link: row.source_link,
      components: row.components,
    },
    combatProfile: {
      resolutionType: row.resolution_type || 'special',
      targetMode,
      saveAbility: row.save_ability || null,
      area: row.area ? { shape: null, size: row.area, origin: null } : {},
      rules: rulesJson,
    },
  }
}

/**
 * Map spell_compendium row → DM “spell list” shape (compatible with SpellLibrary + assignSpellsToCharacters).
 */
export function compendiumRowToDmListRow(row) {
  if (!row) return null
  const rulesJson = normalizeRulesJson(row.rules_json)
  const detailsStr = spellDetailToString(row.details)
  return {
    id: row.id,
    spell_id: row.spell_id,
    campaign_id: null,
    name: row.name,
    level: row.level,
    school: row.school,
    casting_time: row.casting_time,
    range: row.range,
    duration: row.duration,
    components: row.components || { V: !!row.verbal, S: !!row.somatic, M: row.material_text || null },
    ritual: !!row.ritual,
    concentration: !!row.concentration,
    description: detailsStr,
    higher_level_effect: '',
    damage_dice: rulesJson.primary_damage_dice || null,
    damage_type: rulesJson.primary_damage_type || parseDamageType(row.damage_effect),
    healing_dice: null,
    save_type: row.save_ability,
    attack_type: row.attack_type,
    resolution_type: row.resolution_type || 'utility',
    target_mode: row.target_mode || 'special',
    save_ability: row.save_ability,
    area: row.area ? { shape: null, size: row.area, origin: null } : {},
    scaling: rulesJson.scaling || {},
    rules_json: rulesJson,
    tags: row.tags || [],
    source: row.source,
    source_index: row.spell_id,
    source_url: row.source_link,
    classes: [],
    notes: null,
    sound_effect_url: row.sound_effect_url || null,
    _compendium: true,
    _sourceType: row.source_type || 'compendium',
    _compendiumRow: { ...row, details: detailsStr, rules_json: rulesJson },
  }
}

/**
 * Payload for character_spells.spell_data (snapshot + compendium ref).
 */
export function compendiumRowToSpellDataSnapshot(row) {
  const dm = compendiumRowToDmListRow(row)
  const player = compendiumRowToPlayerEntry(row)
  return { ...player, ...dm, spellId: row.spell_id }
}
