import { ABILITY_SHORT, cleanText, toTitleCase } from './parserUtils.js'

const CLASS_NAMES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']

export function parseFeat(rawText) {
  const lines = cleanText(rawText).split('\n').map((line) => line.trim()).filter(Boolean)
  const feat = {
    name: '',
    prerequisite: null,
    description: '',
    ability_score_minimum: null,
    level_minimum: null,
    class_requirement: null,
  }

  if (!lines.length) return feat
  let i = 0
  feat.name = toTitleCase(lines[i++] || '')

  const prereqScanStart = i
  while (i < Math.min(4, lines.length)) {
    const prereqMatch = lines[i].match(/^prerequisite[s]?:?\s*(.+)/i)
    if (prereqMatch) {
      feat.prerequisite = prereqMatch[1].trim() || null
      if (feat.prerequisite) {
        const abilityMatch = feat.prerequisite.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)/i)
        if (abilityMatch) {
          feat.ability_score_minimum = {
            ability: ABILITY_SHORT[abilityMatch[1].toLowerCase()],
            minimum: parseInt(abilityMatch[2], 10),
          }
        }
        const levelMatch = feat.prerequisite.match(/(\d+)(?:st|nd|rd|th)[- ]level/i)
        if (levelMatch) feat.level_minimum = parseInt(levelMatch[1], 10)
        const classMatch = feat.prerequisite.match(new RegExp(`\\b(${CLASS_NAMES.join('|')})\\b`, 'i'))
        if (classMatch) feat.class_requirement = toTitleCase(classMatch[1])
      }
      i += 1
      break
    }
    i += 1
  }
  if (!feat.prerequisite) i = prereqScanStart

  feat.description = lines.slice(i).join('\n').trim()
  return feat
}
