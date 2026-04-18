import { cleanText, toTitleCase } from './parserUtils.js'

const CLASS_NAMES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']

export function parseClassFeature(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const joined = lines.join(' ')
  const feature = {
    name: lines[0] || '',
    class_name: null,
    subclass_name: null,
    level: null,
    description: lines.slice(1).join('\n').trim(),
    feature_type: 'class',
    recharge: null,
    uses_formula: null,
  }

  const classMatch = joined.match(/\b(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\b/i)
  if (classMatch) feature.class_name = toTitleCase(classMatch[1])

  const levelMatch = joined.match(/\blevel\s+(\d+)\b/i) || joined.match(/(\d+)(?:st|nd|rd|th)\s+level/i)
  if (levelMatch) feature.level = parseInt(levelMatch[1], 10)

  const subclassMatch = joined.match(/(?:subclass|archetype|path|college|domain|circle|oath|patron|tradition)\s*[:\-]\s*([A-Z][\w\s'-]+)/i)
  if (subclassMatch) {
    feature.subclass_name = subclassMatch[1].trim()
    feature.feature_type = 'subclass'
  } else if (/subclass feature/i.test(joined)) {
    feature.feature_type = 'subclass'
  }

  if (/\bshort rest\b/i.test(joined)) feature.recharge = 'Short Rest'
  else if (/\blong rest\b/i.test(joined)) feature.recharge = 'Long Rest'
  else if (/\bper turn\b|\bonce on each of your turns\b/i.test(joined)) feature.recharge = 'Per Turn'

  const usesMatch = joined.match(/(\d+)\s+times/i) || joined.match(/equal to your [^.]+/i)
  if (usesMatch) feature.uses_formula = usesMatch[0]

  if (!feature.class_name) {
    const exact = CLASS_NAMES.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(feature.name))
    if (exact) feature.class_name = exact
  }

  return feature
}
