/**
 * parseSpell(text) → Spell object
 *
 * Handles text copied from D&D Beyond, the SRD, or typed manually.
 * Covers: name, level, school, casting time, range, components,
 * duration, concentration, ritual, description, higher levels, classes.
 */

const SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]

const CLASSES = [
  'Artificer', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
]

function clean(str) {
  return (str || '').replace(/\s+/g, ' ').trim()
}

function lines(text) {
  return text.split(/\r?\n/).map(l => l.trim())
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseSpell(rawText) {
  const text = rawText.trim()
  const lineArr = lines(text)

  const result = {
    name: '',
    level: 0,
    school: '',
    casting_time: '',
    range: '',
    components: '',
    duration: '',
    concentration: false,
    ritual: false,
    description: '',
    higher_levels: '',
    classes: [],
    source: 'Imported',
  }

  // --- Name: first non-empty line ---
  result.name = lineArr.find(l => l.length > 0) || ''

  // --- Level + School ---
  // Formats:
  //   "2nd-level Evocation"
  //   "Cantrip (Evocation)"
  //   "Evocation Cantrip"
  //   "Level 2 Evocation" (D&D Beyond 2024)
  for (let i = 1; i < Math.min(lineArr.length, 5); i++) {
    const l = lineArr[i]
    if (!l) continue

    // "Xth-level School" or "X-level School"
    const levelMatch = l.match(/(\d+)(?:st|nd|rd|th)[- ]level\s+(\w+)/i)
      || l.match(/Level\s+(\d+)\s+(\w+)/i)
    if (levelMatch) {
      result.level = parseInt(levelMatch[1])
      result.school = levelMatch[2]
      break
    }

    // "Cantrip" or "Evocation Cantrip"
    const cantripMatch = l.match(/(\w+\s+)?Cantrip(?:\s*\((\w+)\))?/i)
    if (cantripMatch) {
      result.level = 0
      result.school = cantripMatch[2] || cantripMatch[1]?.trim() || ''
      // Check if the school word is actually a school
      if (!SCHOOLS.find(s => s.toLowerCase() === result.school.toLowerCase())) {
        result.school = ''
      }
      break
    }

    // "School Cantrip" or "Xth-level School"
    const schoolFirst = SCHOOLS.find(s => l.toLowerCase().includes(s.toLowerCase()))
    if (schoolFirst) {
      result.school = schoolFirst
      if (l.toLowerCase().includes('cantrip')) result.level = 0
      const lm = l.match(/(\d+)/)
      if (lm) result.level = parseInt(lm[1])
      break
    }
  }

  // Normalise school capitalisation
  if (result.school) {
    const matched = SCHOOLS.find(s => s.toLowerCase() === result.school.toLowerCase())
    if (matched) result.school = matched
  }

  // --- Ritual / Concentration flags in level/school line ---
  const headerBlock = lineArr.slice(0, 6).join(' ')
  if (/\(ritual\)/i.test(headerBlock)) result.ritual = true

  // --- Casting Time ---
  const ctMatch = text.match(/Casting Time:?\s+(.+?)(?:\n|$)/i)
  if (ctMatch) result.casting_time = clean(ctMatch[1])

  // --- Range ---
  const rangeMatch = text.match(/Range:?\s+(.+?)(?:\n|$)/i)
  if (rangeMatch) result.range = clean(rangeMatch[1])

  // --- Components ---
  const compMatch = text.match(/Components?:?\s+(.+?)(?:\n|$)/i)
  if (compMatch) result.components = clean(compMatch[1])

  // --- Duration ---
  const durMatch = text.match(/Duration:?\s+(.+?)(?:\n|$)/i)
  if (durMatch) {
    const durStr = clean(durMatch[1])
    result.duration = durStr
    if (/concentration/i.test(durStr)) result.concentration = true
  }

  // --- Description ---
  // Everything between the property block and "At Higher Levels" / "Spell Lists" / "Classes"
  // Property block ends after the last of: Duration, Components, Range, Casting Time
  const propBlock = text.match(/(Duration|Components?|Range|Casting Time):?.+?(?:\n|$)/gi)
  let descStart = 0
  if (propBlock) {
    const lastProp = propBlock[propBlock.length - 1]
    const lastPropIdx = text.lastIndexOf(lastProp)
    descStart = lastPropIdx + lastProp.length
  }

  const higherMatch = text.match(/At Higher Levels[.:]?|Higher Levels[.:]?/i)
  const classesMatch = text.match(/(?:Spell Lists?|Available to|Classes?)\s*[:\n]/i)

  let descEnd = text.length
  if (higherMatch && higherMatch.index > descStart) descEnd = Math.min(descEnd, higherMatch.index)
  if (classesMatch && classesMatch.index > descStart) descEnd = Math.min(descEnd, classesMatch.index)

  result.description = clean(text.slice(descStart, descEnd))

  // --- At Higher Levels ---
  if (higherMatch) {
    const hlStart = higherMatch.index + higherMatch[0].length
    let hlEnd = text.length
    if (classesMatch && classesMatch.index > hlStart) hlEnd = classesMatch.index
    result.higher_levels = clean(text.slice(hlStart, hlEnd).replace(/^[.:\s]+/, ''))
  }

  // --- Classes ---
  // "Spell Lists: Bard, Cleric, Wizard" or "Classes: Wizard (Arcane Tradition)"
  if (classesMatch) {
    const classStr = text.slice(classesMatch.index + classesMatch[0].length)
    const firstLine = classStr.split('\n')[0]
    result.classes = CLASSES.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(firstLine))
  }

  // Fallback: scan whole text for class names if none found
  if (result.classes.length === 0) {
    result.classes = CLASSES.filter(c => {
      const m = text.match(new RegExp(`\\b${c}\\b`, 'gi'))
      return m && m.length > 0
    })
  }

  return result
}
