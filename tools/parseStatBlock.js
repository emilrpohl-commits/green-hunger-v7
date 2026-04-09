/**
 * parseStatBlock(text) → StatBlock object
 *
 * Handles text copied from D&D Beyond, the SRD, or typed manually.
 * Covers: name, size/type/alignment, AC, HP, speed, ability scores,
 * saving throws, skills, resistances, immunities, vulnerabilities,
 * senses, languages, CR, proficiency bonus, traits, actions,
 * bonus actions, reactions, legendary actions, spellcasting.
 */

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']
const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lines(text) {
  return text.split(/\r?\n/).map(l => l.trim())
}

function clean(str) {
  return (str || '').replace(/\s+/g, ' ').trim()
}

function abilityMod(score) {
  return Math.floor((score - 10) / 2)
}

// Split a block of text into named entries like "Name. Description" or "Name — desc"
function parseEntries(block) {
  if (!block) return []
  const entries = []
  // Split on lines that look like an entry title:
  // - "Word Word. Rest..." (sentence ending in period)
  // - "Word Word (recharge X-Y). Rest..."
  // - "Word Word — Rest..."
  const entryPattern = /^([A-Z][^.—\n]+?(?:\([^)]*\))?)[.—]\s*(.+)/
  const rawLines = block.split(/\n+/)
  let current = null

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(entryPattern)
    if (m && m[1].length < 60) {
      if (current) entries.push(current)
      current = { name: clean(m[1]), desc: clean(m[2]) }
    } else if (current) {
      current.desc += ' ' + clean(trimmed)
    } else {
      // Orphan line — create entry with empty name
      current = { name: '', desc: clean(trimmed) }
    }
  }
  if (current) entries.push(current)
  return entries.filter(e => e.desc)
}

// Parse an action entry and detect attack format
function parseAction(entry) {
  const { name, desc } = entry

  // Melee/Ranged Weapon Attack: +X to hit
  const attackMatch = desc.match(/(Melee|Ranged)(?:\s+(?:Weapon|Spell))?\s+Attack:\s*\+?(-?\d+)\s+to hit[,.]?\s+reach\s+([\d]+\s*ft\.?)|(?:range\s+([\d/]+)\s*ft\.?)/i)
  if (attackMatch) {
    const toHit = parseInt(attackMatch[2]) || 0
    const reachRaw = desc.match(/reach\s+([\d]+\s*ft\.?)/i)
    const rangeRaw = desc.match(/range\s+([\d/]+\s*ft\.?)/i)
    const damageRaw = desc.match(/Hit:\s*[\d]+\s*\(([\dd\s+\-×*]+)\)\s*([\w]+)\s+damage/i)
      || desc.match(/Hit:\s*([\dd\s+\-]+)\s*([\w]+)\s+damage/i)

    return {
      name,
      type: 'attack',
      toHit,
      reach: reachRaw ? reachRaw[1] : undefined,
      range: rangeRaw ? rangeRaw[1] : undefined,
      damage: damageRaw ? `${damageRaw[1].trim()} ${damageRaw[2]}` : undefined,
      effect: desc,
    }
  }

  // Save-based action: DC X Type saving throw
  const saveMatch = desc.match(/DC\s*(\d+)\s+(\w+)\s+saving throw/i)
  if (saveMatch) {
    const damageRaw = desc.match(/([\dd\s+\-]+)\s*([\w]+)\s+damage/i)
    return {
      name,
      type: 'save',
      saveDC: parseInt(saveMatch[1]),
      saveType: saveMatch[2].toUpperCase().slice(0, 3),
      damage: damageRaw ? `${damageRaw[1].trim()} ${damageRaw[2]}` : undefined,
      desc,
    }
  }

  return { name, type: 'special', desc }
}

// Parse "Saving Throws DEX +3, CON +5, WIS +2" style line
function parseBonusList(str) {
  if (!str) return []
  return str.split(',').map(s => {
    const m = s.trim().match(/([A-Za-z\s]+?)\s*([+-]\d+)$/)
    if (m) return { name: m[1].trim(), mod: parseInt(m[2]) }
    return null
  }).filter(Boolean)
}

// Extract a section between two headers
function extractSection(text, startPattern, endPatterns) {
  const start = text.search(startPattern)
  if (start === -1) return ''
  let end = text.length
  for (const ep of endPatterns) {
    const pos = text.search(ep)
    if (pos > start && pos < end) end = pos
  }
  return text.slice(start, end)
    .replace(startPattern, '')
    .trim()
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseStatBlock(rawText) {
  const text = rawText.trim()
  const lineArr = lines(text)
  const result = {
    name: '',
    creature_type: '',
    size: 'Medium',
    alignment: '',
    cr: '1',
    proficiency_bonus: 2,
    ac: 10,
    ac_note: '',
    max_hp: 10,
    hit_dice: '',
    speed: '30 ft.',
    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    saving_throws: [],
    skills: [],
    resistances: [],
    vulnerabilities: [],
    immunities: { damage: [], condition: [] },
    senses: '',
    languages: '',
    traits: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    legendary_actions: [],
    combat_prompts: [],
    dm_notes: [],
    tags: [],
    source: 'Imported',
  }

  // --- Name: first non-empty line ---
  result.name = lineArr.find(l => l.length > 0) || ''

  // --- Size / Type / Alignment ---
  // Formats: "Small Humanoid (Goblinoid), Neutral Evil"
  //          "Gargantuan Dragon, Chaotic Evil"
  //          "Small, humanoid, neutral evil" (D&D Beyond 2024)
  for (let i = 1; i < Math.min(lineArr.length, 5); i++) {
    const l = lineArr[i]
    if (!l) continue
    const sizeMatch = SIZES.find(s => l.toLowerCase().startsWith(s.toLowerCase()))
    if (sizeMatch) {
      result.size = sizeMatch
      // Strip size from front, commas from D&D Beyond format
      const rest = l.slice(sizeMatch.length).replace(/^,\s*/, '').trim()
      // Alignment is usually after last comma
      const parts = rest.split(',')
      if (parts.length >= 2) {
        result.creature_type = parts.slice(0, -1).join(',').trim()
        result.alignment = parts[parts.length - 1].trim()
      } else {
        result.creature_type = rest
      }
      break
    }
  }

  // --- Armor Class ---
  const acMatch = text.match(/Armor Class\s+(\d+)\s*(?:\(([^)]*)\))?/i)
  if (acMatch) {
    result.ac = parseInt(acMatch[1])
    result.ac_note = acMatch[2] ? clean(acMatch[2]) : ''
  }

  // --- Hit Points ---
  const hpMatch = text.match(/Hit Points\s+(\d+)\s*(?:\(([^)]*)\))?/i)
  if (hpMatch) {
    result.max_hp = parseInt(hpMatch[1])
    result.hit_dice = hpMatch[2] ? clean(hpMatch[2]) : ''
  }

  // --- Speed ---
  const speedMatch = text.match(/Speed\s+(.+?)(?:\n|$)/i)
  if (speedMatch) result.speed = clean(speedMatch[1])

  // --- Ability Scores ---
  // Two formats:
  // 1) Header row "STR DEX CON INT WIS CHA" then scores on next non-empty line
  // 2) Inline "STR 8 (-1)  DEX 14 (+2) ..."
  const abHeaderIdx = lineArr.findIndex(l => /\bSTR\b.*\bDEX\b.*\bCON\b/i.test(l))
  if (abHeaderIdx >= 0) {
    // Find next line with numbers
    for (let i = abHeaderIdx + 1; i < lineArr.length; i++) {
      const l = lineArr[i]
      // Match "8 (-1) 14 (+2) 10 (+0) 10 (+0) 8 (-1) 8 (-1)"
      const nums = [...l.matchAll(/(\d+)\s*\([+-]?\d+\)/g)].map(m => parseInt(m[1]))
      if (nums.length === 6) {
        ABILITY_KEYS.forEach((k, idx) => { result.ability_scores[k] = nums[idx] })
        break
      }
      // Also handle format without parens: "8 14 10 10 8 8"
      const plain = l.trim().split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0 && n <= 30)
      if (plain.length === 6) {
        ABILITY_KEYS.forEach((k, idx) => { result.ability_scores[k] = plain[idx] })
        break
      }
    }
  } else {
    // Inline: "STR 8 (-1)  DEX 14 (+2)"
    for (const key of ABILITY_KEYS) {
      const m = text.match(new RegExp(`\\b${key}\\b\\s*(\\d+)\\s*\\([+-]?\\d+\\)`, 'i'))
      if (m) result.ability_scores[key] = parseInt(m[1])
    }
  }

  // Compute modifiers
  result.modifiers = {}
  ABILITY_KEYS.forEach(k => {
    result.modifiers[k] = abilityMod(result.ability_scores[k])
  })

  // --- Saving Throws ---
  const savesMatch = text.match(/Saving Throws\s+(.+?)(?:\n|$)/i)
  if (savesMatch) result.saving_throws = parseBonusList(savesMatch[1])

  // --- Skills ---
  const skillsMatch = text.match(/Skills\s+(.+?)(?:\n|$)/i)
  if (skillsMatch) result.skills = parseBonusList(skillsMatch[1])

  // --- Damage Resistances ---
  const resistMatch = text.match(/Damage Resistances?\s+(.+?)(?:\n|$)/i)
  if (resistMatch) result.resistances = resistMatch[1].split(/,\s*/).map(clean).filter(Boolean)

  // --- Damage Immunities ---
  const dmgImmMatch = text.match(/Damage Immunities?\s+(.+?)(?:\n|$)/i)
  if (dmgImmMatch) result.immunities.damage = dmgImmMatch[1].split(/,\s*/).map(clean).filter(Boolean)

  // --- Condition Immunities ---
  const condImmMatch = text.match(/Condition Immunities?\s+(.+?)(?:\n|$)/i)
  if (condImmMatch) result.immunities.condition = condImmMatch[1].split(/,\s*/).map(clean).filter(Boolean)

  // --- Damage Vulnerabilities ---
  const vulnMatch = text.match(/Damage Vulnerabilities?\s+(.+?)(?:\n|$)/i)
  if (vulnMatch) result.vulnerabilities = vulnMatch[1].split(/,\s*/).map(clean).filter(Boolean)

  // --- Senses ---
  const sensesMatch = text.match(/Senses\s+(.+?)(?:\n|$)/i)
  if (sensesMatch) result.senses = clean(sensesMatch[1])

  // Passive Perception sometimes on its own line
  const passiveMatch = text.match(/Passive Perception\s+(\d+)/i)
  if (passiveMatch && !result.senses.toLowerCase().includes('passive')) {
    result.senses = result.senses
      ? `${result.senses}, Passive Perception ${passiveMatch[1]}`
      : `Passive Perception ${passiveMatch[1]}`
  }

  // --- Languages ---
  const langMatch = text.match(/Languages?\s+(.+?)(?:\n|$)/i)
  if (langMatch) result.languages = clean(langMatch[1])

  // --- Challenge Rating ---
  const crMatch = text.match(/Challenge\s+([\d/]+)/i)
  if (crMatch) result.cr = crMatch[1]

  // --- Proficiency Bonus ---
  const profMatch = text.match(/Proficiency Bonus\s+\+?(\d+)/i)
  if (profMatch) result.proficiency_bonus = parseInt(profMatch[1])
  else {
    // Estimate from CR if not given
    const crParts = String(result.cr).split('/')
    const crNum = crParts.length === 2 ? parseInt(crParts[0]) / parseInt(crParts[1]) : (parseFloat(result.cr) || 1)
    result.proficiency_bonus = Math.max(2, Math.ceil(1 + crNum / 4))
  }

  // --- Sections ---
  const SECTION_HEADERS = [
    /^(?:Actions?|Traits?|Bonus Actions?|Reactions?|Legendary Actions?|Lair Actions?|Mythic Actions?)/im
  ]

  const traitsSection = extractSection(text, /^Traits?\s*\n/im, [
    /^Actions?\s*\n/im, /^Bonus Actions?\s*\n/im, /^Reactions?\s*\n/im, /^Legendary Actions?\s*\n/im
  ])
  const actionsSection = extractSection(text, /^Actions?\s*\n/im, [
    /^Bonus Actions?\s*\n/im, /^Reactions?\s*\n/im, /^Legendary Actions?\s*\n/im
  ])
  const bonusSection = extractSection(text, /^Bonus Actions?\s*\n/im, [
    /^Reactions?\s*\n/im, /^Legendary Actions?\s*\n/im
  ])
  const reactionsSection = extractSection(text, /^Reactions?\s*\n/im, [
    /^Legendary Actions?\s*\n/im, /^Lair Actions?\s*\n/im
  ])
  const legendarySection = extractSection(text, /^Legendary Actions?\s*\n/im, [
    /^Lair Actions?\s*\n/im
  ])

  result.traits = parseEntries(traitsSection)
  result.actions = parseEntries(actionsSection).map(parseAction)
  result.bonus_actions = parseEntries(bonusSection).map(parseAction)
  result.reactions = parseEntries(reactionsSection)
  result.legendary_actions = parseEntries(legendarySection)

  // Slug from name
  result.slug = result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return result
}
