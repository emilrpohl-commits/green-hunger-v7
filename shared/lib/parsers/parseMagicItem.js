import { cleanText, toTitleCase } from './parserUtils.js'

export function parseMagicItem(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const header = lines.slice(0, 4).join(' ')
  const desc = lines.slice(2).join('\n').trim() || lines.slice(1).join('\n').trim()
  const row = {
    name: lines[0] || '',
    equipment_category: null,
    rarity: null,
    requires_attunement: false,
    attunement_conditions: null,
    description: desc,
    is_variant: false,
    variant_of_index: null,
  }

  const categoryMatch = header.match(/\b(armour|armor|potion|ring|rod|scroll|staff|wand|weapon|wondrous item)\b/i)
  if (categoryMatch) row.equipment_category = toTitleCase(categoryMatch[1] === 'armor' ? 'armour' : categoryMatch[1])

  const rarityMatch = header.match(/\b(common|uncommon|rare|very rare|legendary|artifact)\b/i)
  if (rarityMatch) row.rarity = toTitleCase(rarityMatch[1])

  const attuneMatch = text.match(/requires attunement(?:\s+by\s+([^)\n.]+))?/i)
  if (attuneMatch) {
    row.requires_attunement = true
    row.attunement_conditions = attuneMatch[1] ? attuneMatch[1].trim() : null
  }

  const variantMatch = text.match(/\bvariant of\s+([A-Z][\w\s'()-]+)/i)
  if (variantMatch) {
    row.is_variant = true
    row.variant_of_index = variantMatch[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  } else if (/(?:^|\s)\+\d+(?:\s|$)/.test(row.name)) {
    row.is_variant = true
  }

  return row
}
