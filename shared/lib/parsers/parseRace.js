import { ABILITY_SHORT, cleanText, extractLanguageNames, splitIntoSections } from './parserUtils.js'

export function parseRace(rawText) {
  const text = cleanText(rawText)
  const sections = splitIntoSections(text)
  const race = {
    name: '',
    ability_bonuses: [],
    age_description: null,
    alignment_description: null,
    size: 'Medium',
    size_description: null,
    speed: 30,
    traits: [],
    languages: [],
    language_description: null,
    subraces: [],
  }

  if (!sections.length) return race
  race.name = sections[0].name || ''

  for (const section of sections.slice(1)) {
    const key = String(section.name || '').toLowerCase().trim()
    const desc = String(section.desc || '').trim()
    if (!key) continue

    if (key.includes('ability score')) {
      race.ability_bonuses = parseAbilityBonuses(desc)
      continue
    }
    if (key === 'age') {
      race.age_description = desc || null
      continue
    }
    if (key === 'alignment') {
      race.alignment_description = desc || null
      continue
    }
    if (key === 'size') {
      race.size_description = desc || null
      const m = desc.match(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/)
      if (m) race.size = m[1]
      continue
    }
    if (key === 'speed') {
      const m = desc.match(/(\d+)\s*feet/i)
      if (m) race.speed = parseInt(m[1], 10)
      continue
    }
    if (key === 'languages') {
      race.language_description = desc || null
      race.languages = extractLanguageNames(desc)
      continue
    }
    race.traits.push({ name: section.name, description: desc })
  }

  return race
}

function parseAbilityBonuses(text) {
  const bonuses = []
  const patterns = [
    /your\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+score\s+increases\s+by\s+(\d+)/gi,
    /(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+\+(\d+)/gi,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      bonuses.push({
        ability: ABILITY_SHORT[match[1].toLowerCase()],
        bonus: parseInt(match[2], 10),
      })
    }
  }
  return bonuses
}
