export const ABILITY_SHORT = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

export function cleanText(raw) {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '—')
    .replace(/\u00AD/g, '')
    .replace(/([A-Za-z])'([a-z])/g, '$1$2')
    .replace(/-\n([a-z])/g, '$1')
    .replace(/([A-Za-z])\n([a-z])/g, '$1$2')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function splitIntoSections(text) {
  const sections = []
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean)
  let current = null

  for (const line of lines) {
    const sectionMatch = line.match(/^([A-Z][^.]+)\.\s+(.+)/)
    if (sectionMatch) {
      if (current) sections.push(current)
      current = { name: sectionMatch[1].trim(), desc: sectionMatch[2].trim() }
      continue
    }
    if (current) {
      current.desc = `${current.desc}\n${line}`.trim()
    } else {
      sections.push({ name: line, desc: '' })
    }
  }

  if (current) sections.push(current)
  return sections
}

export function toTitleCase(str) {
  return String(str || '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

export function wordToNumber(word) {
  const map = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  }
  const raw = String(word || '').trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(map, raw)) return map[raw]
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractLanguageNames(desc) {
  const KNOWN = [
    'Common',
    'Dwarvish',
    'Elvish',
    'Giant',
    'Gnomish',
    'Goblin',
    'Halfling',
    'Orc',
    'Abyssal',
    'Celestial',
    'Draconic',
    'Deep Speech',
    'Infernal',
    'Primordial',
    'Sylvan',
    'Undercommon',
  ]
  const text = String(desc || '')
  return KNOWN.filter((name) => new RegExp(`\\b${name}\\b`, 'i').test(text))
}
