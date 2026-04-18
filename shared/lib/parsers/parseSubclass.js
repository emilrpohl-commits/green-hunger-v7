import { cleanText, splitIntoSections, toTitleCase } from './parserUtils.js'

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']

export function parseSubclass(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const joined = lines.join(' ')
  const sections = splitIntoSections(text)
  const row = {
    name: lines[0] || '',
    class_name: null,
    flavor: null,
    description: '',
    features: [],
  }

  const classMatch = joined.match(/\b(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\b/i)
  if (classMatch) row.class_name = toTitleCase(classMatch[1])

  const flavorMatch = joined.match(/\b(Primal Path|Sacred Oath|Arcane Tradition|Martial Archetype|Roguish Archetype|Bard College|Druid Circle|Monastic Tradition|Sorcerous Origin|Otherworldly Patron|Ranger Archetype)\b/i)
  if (flavorMatch) row.flavor = flavorMatch[1]

  const featureSections = sections.filter((sec) => /subclass feature|\blevel\b/i.test(sec.name))
  if (featureSections.length) {
    row.features = featureSections.map((sec) => {
      const levelMatch = sec.name.match(/(\d+)(?:st|nd|rd|th)?\s*[- ]?level/i) || sec.desc.match(/(\d+)(?:st|nd|rd|th)\s+level/i)
      return {
        name: sec.name.replace(/\b\d+(?:st|nd|rd|th)?\s*[- ]?level\b/i, '').replace(/subclass feature/i, '').trim() || sec.name.trim(),
        level: levelMatch ? parseInt(levelMatch[1], 10) : null,
        description: sec.desc,
      }
    })
  }

  row.description = lines.slice(1, Math.max(1, Math.min(lines.length, 8))).join('\n').trim()
  if (!row.class_name) {
    const classFromName = CLASSES.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(row.name))
    if (classFromName) row.class_name = classFromName
  }
  return row
}
