/**
 * Shared defaults for manual editor + PDF import — matches `characters` table + player runtime expectations.
 */

export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export const PHB_CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
]

export function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function abilityModFromScore(n) {
  const modNum = Math.floor((Number(n) - 10) / 2)
  return `${modNum >= 0 ? '+' : ''}${modNum}`
}

export function toAbilityBlock(score) {
  const n = Number(score) || 10
  return { score: n, mod: abilityModFromScore(n) }
}

export function defaultAbilityScores() {
  const o = {}
  ABILITIES.forEach((a) => { o[a] = toAbilityBlock(10) })
  return o
}

function normalizeAbilityScores(raw) {
  const base = defaultAbilityScores()
  if (!raw || typeof raw !== 'object') return base
  ABILITIES.forEach((a) => {
    const v = raw[a]
    if (v == null) return
    if (typeof v === 'number') base[a] = toAbilityBlock(v)
    else if (typeof v === 'object' && v.score != null) base[a] = toAbilityBlock(v.score)
  })
  return base
}

const DEFAULT_STATS = {
  maxHp: 10,
  ac: 10,
  speed: 30,
  initiative: '+0',
  proficiencyBonus: '+2',
}

function defaultPortraitCrop() {
  return { unit: 'relative', x: 0.12, y: 0.08, width: 0.76, height: 0.84, zoom: 1.0 }
}

/**
 * @param {string|null} campaignId
 * @param {Record<string, unknown>} [partial]
 */
export function blankDbCharacter(campaignId, partial = {}) {
  const id = partial.id || `pc-${Date.now()}`
  return {
    id,
    campaign_id: campaignId,
    name: partial.name != null ? String(partial.name) : 'New Character',
    password: partial.password ?? '',
    class: partial.class || 'Fighter',
    subclass: partial.subclass ?? '',
    level: Math.min(20, Math.max(1, Number(partial.level) || 1)),
    species: partial.species ?? '',
    background: partial.background ?? '',
    player: partial.player ?? '',
    image: partial.image ?? null,
    portrait_original_storage_path: partial.portrait_original_storage_path ?? null,
    portrait_crop: partial.portrait_crop && typeof partial.portrait_crop === 'object'
      ? { ...partial.portrait_crop }
      : defaultPortraitCrop(),
    portrait_thumb_storage_path: partial.portrait_thumb_storage_path ?? null,
    colour: partial.colour || '#6f9b7a',
    is_npc: !!partial.is_npc,
    assigned_pc_id: partial.assigned_pc_id ?? null,
    is_active: partial.is_active !== false,
    notes: partial.notes ?? '',
    stats: { ...DEFAULT_STATS, ...(partial.stats || {}) },
    ability_scores: normalizeAbilityScores(partial.ability_scores),
    saving_throws: partial.saving_throws || [],
    skills: partial.skills || [],
    spell_slots: partial.spell_slots || {},
    sorcery_points: partial.sorcery_points ?? null,
    features: partial.features || [],
    weapons: partial.weapons || [],
    healing_actions: partial.healing_actions || [],
    buff_actions: partial.buff_actions || [],
    equipment: partial.equipment || [],
    magic_items: partial.magic_items || [],
    passive_scores: partial.passive_scores || {},
    senses: partial.senses ?? null,
    languages: partial.languages ?? null,
    backstory: partial.backstory ?? '',
    srd_refs: partial.srd_refs && typeof partial.srd_refs === 'object' ? { ...partial.srd_refs } : {},
    homebrew_json: {
      ...(partial.homebrew_json && typeof partial.homebrew_json === 'object' ? partial.homebrew_json : {}),
      editor: 'stage-5-manual',
    },
  }
}

/**
 * Map a Supabase row into editor state (normalized scores + stats defaults).
 */
export function dbRowToEditorForm(row) {
  if (!row) return blankDbCharacter(null)
  return {
    ...row,
    stats: { ...DEFAULT_STATS, ...(row.stats || {}) },
    ability_scores: normalizeAbilityScores(row.ability_scores),
  }
}
