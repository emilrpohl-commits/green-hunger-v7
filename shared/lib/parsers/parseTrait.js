import { cleanText } from './parserUtils.js'

export function parseTrait(rawText) {
  const lines = cleanText(rawText).split('\n').map((line) => line.trim()).filter(Boolean)
  const desc = lines.slice(1).join('\n').trim()
  return {
    name: lines[0] || '',
    description: desc,
    trait_type: detectTraitType(desc),
  }
}

export function detectTraitType(descRaw) {
  const desc = String(descRaw || '')
  if (/\bsee in dim light\b|\bdarkvision\b|\btremorsense\b|\bblindsight\b/i.test(desc)) return 'sense'
  if (/\bresistance to\b/i.test(desc)) return 'resistance'
  if (/\byou (know|can cast|learn)\b.*\bspell\b/i.test(desc)) return 'spellcasting'
  if (/\bproficiency\b.*\bskill\b|\bgain proficiency\b/i.test(desc)) return 'proficiency'
  return 'feature'
}
