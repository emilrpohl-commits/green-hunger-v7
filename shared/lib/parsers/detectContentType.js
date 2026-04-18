export function detectContentType(rawText) {
  const text = String(rawText || '').trim()
  const head = text.slice(0, 300).toLowerCase()

  if (/^\s*\d+(?:st|nd|rd|th)[- ]level\s+\w+/im.test(text)) return 'spell'
  if (/\bcantrip\b/i.test(head) && /\bcasting time\b/i.test(head)) return 'spell'

  if (/\bchallenge\b.*\d+/i.test(head)) return 'stat-block'
  if (/\bstr\b.*\bdex\b.*\bcon\b/i.test(head)) return 'stat-block'

  if (/^prerequisite/im.test(text)) return 'feat'

  if (/^(age|size|speed|languages)\./im.test(text)) return 'race'

  if (/^traits?\b/im.test(text) && !/\bchallenge\b/i.test(text)) return 'trait'

  if (/\bskill proficiencies\b/i.test(head)) return 'background'

  if (/\brequires attunement\b/i.test(head)) return 'magic-item'
  if (/\bwondrous item\b/i.test(head)) return 'magic-item'
  if (/\bmagic (weapon|armor|armour|ring|rod|staff|wand)\b/i.test(head)) return 'magic-item'

  if (/\b\d+\s*(gp|sp|cp)\b/i.test(head) && /\b(simple|martial|light|medium|heavy)\b/i.test(head)) return 'equipment'

  if (/subclass feature/i.test(head)) return 'subclass'

  if (
    /\b(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\b/i.test(head) &&
    /\blevel\s+\d+\b/i.test(head)
  ) return 'class-feature'

  return 'unknown'
}
