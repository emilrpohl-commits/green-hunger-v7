import { cleanText, toTitleCase } from './parserUtils.js'

const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']
const EQUIPMENT_CATEGORY_MAP = ['weapon', 'armour', 'armor', 'adventuring gear', 'tool', 'mount', 'vehicle']

export function parseEquipment(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const joined = lines.join(' ')

  const row = {
    name: lines[0] || '',
    equipment_category: null,
    weapon_category: null,
    weapon_range: null,
    damage_dice: null,
    damage_type: null,
    range_normal: null,
    range_long: null,
    ac_base: null,
    ac_add_dex_modifier: false,
    ac_max_dex_bonus: null,
    strength_minimum: null,
    stealth_disadvantage: false,
    cost_quantity: null,
    cost_unit: null,
    weight_lb: null,
    properties: [],
  }

  const categoryHit = EQUIPMENT_CATEGORY_MAP.find((entry) => new RegExp(`\\b${entry}\\b`, 'i').test(joined))
  if (categoryHit) {
    row.equipment_category = categoryHit === 'armor' ? 'Armour' : toTitleCase(categoryHit)
  }

  if (/\b(simple|martial)\b/i.test(joined)) row.weapon_category = toTitleCase(joined.match(/\b(simple|martial)\b/i)[1])
  if (/\bmelee\b/i.test(joined)) row.weapon_range = 'Melee'
  if (/\branged\b/i.test(joined)) row.weapon_range = 'Ranged'

  const damageMatch = joined.match(/(\d+d\d+(?:\s*\+\s*\d+)?)\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)/i)
  if (damageMatch) {
    row.damage_dice = damageMatch[1]
    row.damage_type = toTitleCase(damageMatch[2])
  }

  const rangeMatch = joined.match(/\b(\d+)\s*\/\s*(\d+)\b/)
  if (rangeMatch) {
    row.range_normal = parseInt(rangeMatch[1], 10)
    row.range_long = parseInt(rangeMatch[2], 10)
  }

  const acMatch = joined.match(/\bAC\s*(\d+)\b/i) || joined.match(/\b(\d+)\s*AC\b/i)
  if (acMatch) row.ac_base = parseInt(acMatch[1], 10)
  if (/\badd.*dex\b|\bdex modifier\b/i.test(joined)) row.ac_add_dex_modifier = true
  const maxDexMatch = joined.match(/\bmax(?:imum)?\s+dex(?:terity)?\s*(?:bonus)?\s*(\d+)\b/i)
  if (maxDexMatch) row.ac_max_dex_bonus = parseInt(maxDexMatch[1], 10)
  const strReqMatch = joined.match(/\bstrength\s*(\d+)\b/i)
  if (strReqMatch) row.strength_minimum = parseInt(strReqMatch[1], 10)
  if (/\bstealth.*disadvantage\b/i.test(joined)) row.stealth_disadvantage = true

  const costMatch = joined.match(/(\d+)\s*(gp|sp|cp)\b/i)
  if (costMatch) {
    row.cost_quantity = parseInt(costMatch[1], 10)
    row.cost_unit = costMatch[2].toLowerCase()
  }
  const weightMatch = joined.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/i)
  if (weightMatch) row.weight_lb = Number(weightMatch[1])

  row.properties = extractProperties(joined)
  if (!row.damage_type) {
    const dt = DAMAGE_TYPES.find((dmg) => new RegExp(`\\b${dmg}\\b`, 'i').test(joined))
    if (dt) row.damage_type = toTitleCase(dt)
  }

  return row
}

function extractProperties(text) {
  const known = ['Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Reach', 'Special', 'Thrown', 'Two-Handed', 'Versatile', 'Monk']
  return known.filter((prop) => new RegExp(`\\b${prop.replace('-', '[- ]')}\\b`, 'i').test(text))
}
