function toTitleCase(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function mapReferenceEquipmentToWeaponOption(row) {
  const properties = Array.isArray(row?.properties) ? row.properties : []
  const notes = [row?.damage_type, properties.join(', ')].filter(Boolean).join(' · ')
  return {
    id: row?.source_index || row?.id || row?.name,
    label: row?.name || 'Unnamed weapon',
    source: row?.source_type || 'reference',
    weapon: {
      name: row?.name || '',
      hit: '',
      damage: row?.damage_dice || '',
      notes,
    },
  }
}

export function mapSpellToOption(row) {
  const spellId = row?.spell_id || row?.source_index || ''
  const level = Number(row?.level) || 0
  return {
    id: spellId,
    spellId,
    label: row?.name || spellId || 'Unnamed spell',
    level,
    school: row?.school || '',
    source: row?.compendiumSource || row?.source_type || (row?.campaign_id ? 'campaign' : 'reference'),
  }
}

export function buildWeaponRowFromCustomInput(input) {
  return {
    name: String(input?.name || '').trim(),
    hit: String(input?.hit || '').trim(),
    damage: String(input?.damage || '').trim(),
    notes: String(input?.notes || '').trim(),
  }
}

export function buildCustomWeaponReferencePayload(input) {
  const weapon = buildWeaponRowFromCustomInput(input)
  const sourceIndex = String(weapon.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return {
    name: weapon.name,
    source_index: sourceIndex,
    source_type: 'custom',
    source_book: 'Homebrew',
    ruleset: '2014',
    equipment_category: 'weapon',
    weapon_category: toTitleCase(input?.weapon_category || 'martial'),
    damage_dice: weapon.damage || null,
    damage_type: String(input?.damage_type || '').trim() || null,
    properties: Array.isArray(input?.properties) ? input.properties : [],
  }
}

export function buildCustomSpellPayload(input, campaignId) {
  const name = String(input?.name || '').trim()
  const spellId = String(input?.spell_id || name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return {
    campaign_id: campaignId,
    spell_id: spellId,
    name,
    level: Math.max(0, Math.min(9, Number(input?.level) || 0)),
    school: String(input?.school || 'Evocation').trim(),
    casting_time: String(input?.casting_time || '1 action').trim(),
    range: String(input?.range || 'Self').trim(),
    duration: String(input?.duration || 'Instantaneous').trim(),
    ritual: !!input?.ritual,
    concentration: !!input?.concentration,
    description: String(input?.description || '').trim(),
    higher_level_effect: String(input?.higher_level_effect || '').trim(),
    source: 'Custom',
    source_type: 'custom',
    source_book: 'Homebrew',
    resolution_type: 'utility',
    target_mode: 'single',
    rules_json: {},
    area: {},
    scaling: {},
    classes: [],
    tags: [],
  }
}
