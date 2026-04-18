import { cleanText, wordToNumber } from './parserUtils.js'

export function parseBackground(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').map((line) => line.trim())
  const bg = {
    name: '',
    skill_proficiencies: [],
    tool_proficiencies: [],
    language_choices: 0,
    language_notes: null,
    starting_equipment: null,
    feature_name: null,
    feature_description: null,
    personality_traits: [],
    ideals: [],
    bonds: [],
    flaws: [],
  }

  const first = lines.find((line) => line.length > 0)
  bg.name = first || ''

  for (const line of lines) {
    const skillMatch = line.match(/^skill proficiencies?:\s*(.+)/i)
    if (skillMatch) {
      bg.skill_proficiencies = splitCsv(skillMatch[1]).filter((value) => value.toLowerCase() !== 'none')
      continue
    }
    const toolMatch = line.match(/^tool proficiencies?:\s*(.+)/i)
    if (toolMatch) {
      bg.tool_proficiencies = splitCsv(toolMatch[1]).filter((value) => value.toLowerCase() !== 'none')
      continue
    }
    const languageMatch = line.match(/^languages?:\s*(.+)/i)
    if (languageMatch) {
      bg.language_notes = languageMatch[1].trim()
      const chooseMatch = languageMatch[1].match(/(one|two|three|four|five|six|\d+)\s+of\s+your\s+choice/i)
      if (chooseMatch) bg.language_choices = wordToNumber(chooseMatch[1]) || 0
      continue
    }
    const equipmentMatch = line.match(/^equipment:\s*(.+)/i)
    if (equipmentMatch) {
      bg.starting_equipment = equipmentMatch[1].trim()
    }
  }

  const featureHeader = text.match(/feature:\s*(.+)/i)
  if (featureHeader) {
    bg.feature_name = featureHeader[1].trim()
    const featureStart = featureHeader.index + featureHeader[0].length
    const remaining = text.slice(featureStart).trim()
    const nextTableIdx = findNextSectionIndex(remaining, ['suggested characteristics', 'd8', 'd6', 'personality trait', 'ideals', 'bonds', 'flaws'])
    bg.feature_description = (nextTableIdx >= 0 ? remaining.slice(0, nextTableIdx) : remaining).trim() || null
  }

  bg.personality_traits = extractTableRows(text, 'personality trait')
  bg.ideals = extractTableRows(text, 'ideals')
  bg.bonds = extractTableRows(text, 'bonds')
  bg.flaws = extractTableRows(text, 'flaws')

  return bg
}

function splitCsv(value) {
  return String(value || '').split(/,\s*/).map((part) => part.trim()).filter(Boolean)
}

function findNextSectionIndex(text, candidates) {
  const lower = text.toLowerCase()
  let index = -1
  for (const candidate of candidates) {
    const candidateIndex = lower.indexOf(candidate.toLowerCase())
    if (candidateIndex >= 0 && (index < 0 || candidateIndex < index)) index = candidateIndex
  }
  return index
}

function extractTableRows(text, heading) {
  const lines = text.split('\n').map((line) => line.trim())
  const start = lines.findIndex((line) => line.toLowerCase().includes(heading.toLowerCase()))
  if (start < 0) return []
  const values = []
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) {
      if (values.length) break
      continue
    }
    if (/^(d\d+|feature:|skill proficiencies:|tool proficiencies:|languages?:|equipment:)/i.test(line) && values.length) break
    const match = line.match(/^\d+\s+(.+)/)
    if (match) {
      values.push(match[1].trim())
      continue
    }
    if (values.length) {
      values[values.length - 1] = `${values[values.length - 1]} ${line}`.trim()
    }
  }
  return values
}
