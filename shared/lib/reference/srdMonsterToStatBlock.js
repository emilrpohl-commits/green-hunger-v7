/**
 * Build a stat_blocks-compatible draft object from SRD monster JSON (same shape as 5e-database / API).
 */

import { formatSrdSpeed } from './srdReferenceRows.js'

function formatSensesObject(senses) {
  if (!senses || typeof senses !== 'object') return ''
  return Object.entries(senses)
    .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
    .join(', ')
}

function mapNamedBlocks(list) {
  if (!Array.isArray(list)) return []
  return list.map((a) => ({
    name: a.name || 'Unnamed',
    desc: Array.isArray(a.desc) ? a.desc.join('\n') : String(a.desc || ''),
    attack_bonus: a.attack_bonus,
    damage: a.damage,
    dc: a.dc,
  }))
}

/**
 * @param {Record<string, unknown>} m
 * @returns {Record<string, unknown>}
 */
export function srdMonsterToStatBlockDraft(m) {
  const acFirst = Array.isArray(m.armor_class) && m.armor_class[0] ? m.armor_class[0].value : m.ac
  const scores = {
    STR: m.strength ?? 10,
    DEX: m.dexterity ?? 10,
    CON: m.constitution ?? 10,
    INT: m.intelligence ?? 10,
    WIS: m.wisdom ?? 10,
    CHA: m.charisma ?? 10,
  }

  const profs = m.proficiencies || []
  const savingThrows = []
  const skills = []
  for (const p of profs) {
    const name = p.proficiency?.name || ''
    if (name.startsWith('Saving Throw:')) {
      savingThrows.push({ name: name.replace(/^Saving Throw:\s*/i, '').trim(), mod: p.value })
    } else if (name.startsWith('Skill:')) {
      skills.push({ name: name.replace(/^Skill:\s*/i, '').trim(), mod: p.value })
    }
  }

  const slug = String(m.index || m.name || 'monster')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return {
    name: m.name || 'Creature',
    slug,
    source: 'SRD (reference import)',
    creature_type: m.type || '',
    size: m.size || 'Medium',
    alignment: m.alignment || '',
    cr: m.challenge_rating != null ? String(m.challenge_rating) : '0',
    proficiency_bonus: m.proficiency_bonus != null ? Number(m.proficiency_bonus) : 2,
    ac: Number(acFirst) || 10,
    ac_note: Array.isArray(m.armor_class) && m.armor_class[0]?.type ? String(m.armor_class[0].type) : '',
    max_hp: Number(m.hit_points) || 1,
    hit_dice: m.hit_dice || '',
    speed: formatSrdSpeed(m.speed) || '30 ft.',
    ability_scores: scores,
    saving_throws: savingThrows,
    skills,
    resistances: (m.damage_resistances || []).map(String),
    vulnerabilities: (m.damage_vulnerabilities || []).map(String),
    immunities: {
      damage: (m.damage_immunities || []).map(String),
      condition: (m.condition_immunities || []).map(String),
    },
    senses: typeof m.senses === 'object' ? formatSensesObject(m.senses) : String(m.senses || ''),
    languages: typeof m.languages === 'string' ? m.languages : '—',
    traits: mapNamedBlocks(m.special_abilities),
    actions: mapNamedBlocks(m.actions),
    bonus_actions: mapNamedBlocks(m.bonus_actions),
    reactions: mapNamedBlocks(m.reactions),
    legendary_actions: mapNamedBlocks(m.legendary_actions),
    lair_actions: mapNamedBlocks(m.lair_actions),
    spellcasting: m.spellcasting || {},
    combat_prompts: [],
    dm_notes: [],
    tags: ['srd', 'reference'],
  }
}
