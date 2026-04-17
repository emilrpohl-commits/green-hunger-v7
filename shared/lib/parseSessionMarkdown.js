/**
 * parseSessionMarkdown(markdown)
 *
 * Parses session markdown for Green Hunger imports.
 *
 * Actual format discovered from the real documents:
 *   - Title: "__THE GREEN HUNGER__" (bold)
 *   - Session line: "*DM Guide · Session Three*"
 *   - Chapter: "*Chapter Three: Title*"
 *   - Overview table: flat sequential lines (not pipe table)
 *     __#__  __Scene__  __Purpose__  __Time__  __Notes__
 *     1  \n  Scene Title  \n  Purpose  \n  Time  \n  Notes  \n  2  ...
 *   - Background: "# __Background — What the DM Knows__"
 *   - Scene headings: "# __Scene N — Title__"
 *   - Beat headings: "## __Heading__"
 *   - Sub-beat headings: "### __Sub__"
 *   - Stat blocks: "## __Stat Block — Name__"
 *   - DM notes: "__DM NOTE__" or "__DM NOTE  __"
 *   - Inline tables: flat sequential lines with __Header__ rows
 */

import { parseStatBlock } from './parseStatBlock.js'

// ─── Word → number map ────────────────────────────────────────────────────────
const WORD_TO_NUM = {
  one: 1, first: 1,
  two: 2, second: 2,
  three: 3, third: 3,
  four: 4, fourth: 4,
  five: 5, fifth: 5,
  six: 6, sixth: 6,
  seven: 7, seventh: 7,
  eight: 8, eighth: 8,
  nine: 9, ninth: 9,
  ten: 10, tenth: 10,
  eleven: 11, eleventh: 11,
  twelve: 12, twelfth: 12,
  thirteen: 13, thirteenth: 13,
  fourteen: 14, fourteenth: 14,
  fifteen: 15, fifteenth: 15,
  sixteen: 16, sixteenth: 16,
  seventeen: 17, seventeenth: 17,
  eighteen: 18, eighteenth: 18,
  nineteen: 19, nineteenth: 19,
  twenty: 20, twentieth: 20,
}

function wordOrDigitToNum(str) {
  if (!str) return null
  const s = str.trim().toLowerCase().replace(/[^\w-]/g, '')
  if (WORD_TO_NUM[s]) return WORD_TO_NUM[s]
  const n = parseInt(s)
  return isNaN(n) ? null : n
}

// ─── Text cleaning ────────────────────────────────────────────────────────────

/** Strip mammoth markdown artifacts: __bold__, *italic*, backslash escapes */
function strip(s) {
  return (s || '')
    .replace(/\\(.)/g, '$1')      // backslash escapes: \. → .
    .replace(/__/g, '')           // bold markers
    .replace(/\*\*/g, '')         // bold alt
    .replace(/^\*|\*$/g, '')      // wrapping italics
    .replace(/\s+/g, ' ')
    .trim()
}

function clean(s) { return strip(s) }

// ─── Beat type detection / validation ────────────────────────────────────────

const ALLOWED_BEAT_TYPES = new Set(['narrative', 'prompt', 'check', 'decision', 'combat', 'reveal', 'transition'])

const BEAT_TYPE_RULES = [
  { re: /stat block/i,                     type: '__statblock__' },
  { re: /dm note/i,                        type: '__dmnote__'    },
  { re: /combat description prompts/i,     type: '__dmnote__'    },
  { re: /^setup$/i,                        type: 'combat'        },
  { re: /before initiative/i,              type: 'prompt'        },
  { re: /combat|fight|battle/i,            type: 'combat'        },
  { re: /opening narrative|description.*what they see/i, type: 'narrative' },
  { re: /three beats|two beats|four beats/i, type: 'narrative'  },
  { re: /what they can find|what they can learn|the clue|rot opportunity|finding the entrance/i, type: 'check' },
  { re: /if.*fails|if.*succeeds|outcomes?$|choices|boon/i, type: 'decision' },
  { re: /persuasion window|raven appear|birna|send.off|freeing\s/i, type: 'prompt' },
  { re: /level up|session close/i,         type: 'narrative'     },
  { re: /reveal/i,                         type: 'reveal'        },
  { re: /appears?$|'s\s+\w+$|what\s+\w+\s+says/i, type: 'prompt' },
]

function detectBeatType(heading) {
  const h = clean(heading)
  for (const { re, type } of BEAT_TYPE_RULES) {
    if (re.test(h)) return type
  }
  return 'narrative'
}

function parseExplicitBeatHeading(heading) {
  const m = clean(heading).match(/^\[(narrative|prompt|check|decision|combat|reveal|transition)\]\s*(.+)$/i)
  if (!m) return null
  const type = m[1].toLowerCase()
  const title = clean(m[2] || '')
  if (!ALLOWED_BEAT_TYPES.has(type) || !title) return null
  return { type, title }
}

// ─── Flat table parser ────────────────────────────────────────────────────────
/**
 * Mammoth renders Word tables as sequential lines, not pipe tables.
 * Format:
 *   __Col1__          ← header line (contains __)
 *   __Col2__
 *   __Col3__
 *   value1            ← data rows (no __)
 *   value2
 *   value3
 *   value1 row2
 *   ...
 *
 * We detect the header lines by looking for __ markers or known column names,
 * then group subsequent non-header lines into rows of the same width.
 */
function parseFlatTable(lines) {
  if (!lines || lines.length === 0) return []

  // Find header lines: lines that contain __ (bold markers) and look like column headers
  const headerIdx = []
  for (let i = 0; i < lines.length; i++) {
    if (/__/.test(lines[i]) && lines[i].trim()) headerIdx.push(i)
    // Once we hit a non-header non-empty line after headers started, stop
    if (headerIdx.length > 0 && !/__/.test(lines[i]) && lines[i].trim()) break
  }

  if (headerIdx.length === 0) return []

  const headers = headerIdx.map(i => clean(lines[i]))
  const numCols = headers.length
  const dataLines = lines.slice(Math.max(...headerIdx) + 1).filter(l => l.trim())

  const rows = []
  for (let i = 0; i < dataLines.length; i += numCols) {
    const row = {}
    headers.forEach((h, j) => {
      row[h] = clean(dataLines[i + j] || '')
    })
    if (Object.values(row).some(v => v)) rows.push(row)
  }
  return rows
}

/**
 * Parse the session overview table. Returns map of sceneTitle → { purpose, estimatedTime, fallbackNotes }
 * The table has columns: # | Scene | Purpose | Time | Notes
 * Mammoth renders it as sequential lines.
 */
function parseOverviewTable(block) {
  const lines = block.split('\n').filter(l => l.trim())

  // Find the header pattern: look for lines with __#__, __Scene__, etc.
  const hashIdx = lines.findIndex(l => /^__#__$|^__\\#__$/.test(l.trim()))
  if (hashIdx === -1) {
    // Try alternative: look for __Scene__ header
    const sceneHdrIdx = lines.findIndex(l => /^__Scene__$/i.test(l.trim()))
    if (sceneHdrIdx === -1) return {}
  }

  // Find all header lines (consecutive lines with __)
  let hdrStart = hashIdx >= 0 ? hashIdx : lines.findIndex(l => /__/.test(l))
  if (hdrStart === -1) return {}

  // Collect consecutive header lines
  const headers = []
  let i = hdrStart
  while (i < lines.length && /__/.test(lines[i])) {
    headers.push(clean(lines[i]))
    i++
  }

  // Now parse data rows: groups of headers.length lines
  const dataLines = lines.slice(i).filter(l => l.trim())
  const numCols = headers.length
  const result = {}

  for (let j = 0; j + numCols <= dataLines.length; j += numCols) {
    const row = {}
    headers.forEach((h, k) => { row[h] = clean(dataLines[j + k] || '') })

    // Find the scene title column
    const titleCol = headers.find(h => /^scene$/i.test(h))
    const purposeCol = headers.find(h => /purpose/i.test(h))
    const timeCol = headers.find(h => /time/i.test(h))
    const notesCol = headers.find(h => /notes/i.test(h))

    const title = row[titleCol] || ''
    if (title) {
      result[title.toLowerCase()] = {
        purpose: row[purposeCol] || '',
        estimatedTime: row[timeCol] || '',
        fallbackNotes: row[notesCol] || '',
      }
    }
  }

  return result
}

// ─── Content cleaning helpers ─────────────────────────────────────────────────

function isDmNote(line) {
  return /dm note/i.test(clean(line))
}

function extractDmNoteText(line) {
  return clean(line.replace(/dm note[s]?\s*[:\-]?\s*/i, ''))
}

// ─── Inline stat block extraction (within [combat] beat bodies) ──────────────

const SIZES_PATTERN = 'Tiny|Small|Medium|Large|Huge|Gargantuan'
const INLINE_SIZE_CHALLENGE_RE = new RegExp(
  `^(${SIZES_PATTERN})\\b.+[—–\\-].+Challenge`, 'i'
)

/**
 * Detect a stat block embedded in combat beat body text.
 * The boundary is a creature-name line immediately followed by a
 * size/type/alignment line containing "— Challenge".
 * Returns { prose, statBlockLines } or null.
 */
function extractInlineStatBlock(bodyText) {
  const rawLines = bodyText.split('\n')
  const cleanLines = rawLines.map(l => clean(l))

  let statBlockStart = -1
  for (let i = 0; i < cleanLines.length - 1; i++) {
    const thisLine = cleanLines[i]
    const nextLine = cleanLines[i + 1]
    if (!thisLine || !nextLine) continue
    if (/^(AC|HP|Speed|STR|DEX|Saving|Skills|Damage|Condition|Senses|ACTIONS|Combat)/i.test(thisLine)) continue
    if (/^#{1,3}\s/.test(rawLines[i].trim())) continue
    if (INLINE_SIZE_CHALLENGE_RE.test(nextLine)) {
      statBlockStart = i
      break
    }
  }

  if (statBlockStart === -1) return null

  const proseLines = cleanLines.slice(0, statBlockStart).filter(Boolean)
  const statBlockCleanLines = cleanLines.slice(statBlockStart).filter(Boolean)

  return {
    prose: proseLines.join('\n\n'),
    statBlockLines: statBlockCleanLines,
  }
}

/**
 * Parse ALL-CAPS-named entries: "TRAIT NAME. Description text"
 * Used for traits and actions in inline stat blocks.
 */
function parseAllCapsEntries(text) {
  const entries = []
  const entryRe = /^([A-Z][A-Z\s]*(?:\([^)]*\))?)\.\s*(.+)/
  let current = null

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(entryRe)
    if (m) {
      if (current) entries.push(current)
      current = { name: clean(m[1]), desc: clean(m[2]) }
    } else if (current) {
      current.desc += ' ' + clean(trimmed)
    }
  }
  if (current) entries.push(current)
  return entries.filter(e => e.name && e.desc)
}

/**
 * Parse an inline stat block (array of cleaned lines) into a structured
 * object compatible with StatBlockView / the stat_blocks table.
 */
function parseInlineStatBlock(sbLines) {
  const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
  const text = sbLines.join('\n')

  const result = {
    name: '',
    size: 'Medium',
    creature_type: '',
    alignment: '',
    cr: '1',
    xp: 0,
    proficiency_bonus: 2,
    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    modifiers: {},
    ac: 10,
    ac_note: '',
    max_hp: 10,
    hit_dice: '',
    speed: '30 ft.',
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
    slug: '',
  }

  // Line 0: creature name
  result.name = sbLines[0] || ''

  // Line 1: Size type, alignment — Challenge CR (XP xp)
  const typeRe = new RegExp(
    `^(${SIZES_PATTERN})\\s+(.+?)\\s*[—–\\-]\\s*Challenge\\s+([\\d/]+)\\s*(?:\\(([\\d,]+)\\s*XP\\))?`,
    'i'
  )
  const typeMatch = sbLines[1]?.match(typeRe)
  if (typeMatch) {
    result.size = typeMatch[1]
    const typeAlign = typeMatch[2].trim()
    const parts = typeAlign.split(',').map(s => s.trim())
    if (parts.length >= 2) {
      result.creature_type = parts.slice(0, -1).join(', ')
      result.alignment = parts[parts.length - 1]
    } else {
      result.creature_type = typeAlign
    }
    result.cr = typeMatch[3]
    result.xp = typeMatch[4] ? parseInt(typeMatch[4].replace(/,/g, '')) : 0
  }

  // Proficiency bonus from CR
  const crParts = String(result.cr).split('/')
  const crNum = crParts.length === 2
    ? parseInt(crParts[0]) / parseInt(crParts[1])
    : (parseFloat(result.cr) || 1)
  result.proficiency_bonus = Math.max(2, Math.ceil(1 + crNum / 4))

  // Ability scores: "STR DEX CON INT WIS CHA" header then values
  const abIdx = sbLines.findIndex(l => /\bSTR\b.*\bDEX\b.*\bCON\b.*\bINT\b.*\bWIS\b.*\bCHA\b/i.test(l))
  if (abIdx >= 0 && abIdx + 1 < sbLines.length) {
    const scoreLine = sbLines[abIdx + 1]
    const withMods = [...scoreLine.matchAll(/(\d+)\s*\([+\-−]?\d+\)/g)].map(m => parseInt(m[1]))
    if (withMods.length === 6) {
      ABILITY_KEYS.forEach((k, i) => { result.ability_scores[k] = withMods[i] })
    } else {
      const plain = scoreLine.split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0 && n <= 30)
      if (plain.length === 6) {
        ABILITY_KEYS.forEach((k, i) => { result.ability_scores[k] = plain[i] })
      }
    }
  }

  ABILITY_KEYS.forEach(k => {
    result.modifiers[k] = Math.floor((result.ability_scores[k] - 10) / 2)
  })

  // AC:, HP:, Speed: (abbreviated inline format)
  const acMatch = text.match(/AC:\s*(\d+)\s*(?:\(([^)]*)\))?/i)
  if (acMatch) {
    result.ac = parseInt(acMatch[1])
    result.ac_note = acMatch[2] ? clean(acMatch[2]) : ''
  }

  const hpMatch = text.match(/HP:\s*(\d+)\s*(?:\(([^)]*)\))?/i)
  if (hpMatch) {
    result.max_hp = parseInt(hpMatch[1])
    result.hit_dice = hpMatch[2] ? clean(hpMatch[2]) : ''
  }

  const speedMatch = text.match(/Speed:\s*(.+?)(?:\n|$)/i)
  if (speedMatch) result.speed = clean(speedMatch[1])

  // Optional fields (period-terminated labels)
  const savesMatch = text.match(/Saving Throws?\.?\s+(.+?)(?:\n|$)/i)
  if (savesMatch) {
    result.saving_throws = savesMatch[1].split(',').map(s => {
      const m = s.trim().match(/([A-Za-z]+)\s*([+-]\d+)/)
      return m ? { name: m[1].trim(), mod: parseInt(m[2]) } : null
    }).filter(Boolean)
  }

  const skillsMatch = text.match(/Skills?\.?\s+(.+?)(?:\n|$)/i)
  if (skillsMatch) {
    result.skills = skillsMatch[1].split(',').map(s => {
      const m = s.trim().match(/([A-Za-z\s]+?)\s*([+-]\d+)/)
      return m ? { name: m[1].trim(), mod: parseInt(m[2]) } : null
    }).filter(Boolean)
  }

  const resistMatch = text.match(/Damage Resistances?\.?\s+(.+?)(?:\n|$)/i)
  if (resistMatch) result.resistances = resistMatch[1].split(',').map(s => clean(s)).filter(Boolean)

  const condImmMatch = text.match(/Condition Immunities?\.?\s+(.+?)(?:\n|$)/i)
  if (condImmMatch) result.immunities.condition = condImmMatch[1].split(',').map(s => clean(s)).filter(Boolean)

  const dmgImmMatch = text.match(/Damage Immunities?\.?\s+(.+?)(?:\n|$)/i)
  if (dmgImmMatch) result.immunities.damage = dmgImmMatch[1].split(',').map(s => clean(s)).filter(Boolean)

  const sensesMatch = text.match(/Senses?\.?\s+(.+?)(?:\n|$)/i)
  if (sensesMatch) result.senses = clean(sensesMatch[1])

  // Section boundaries
  const actionsIdx = sbLines.findIndex(l => /^ACTIONS$/i.test(l))
  const promptsIdx = sbLines.findIndex(l => /^Combat Description Prompts$/i.test(l))

  // Find last known-field line to locate trait start
  const fieldPatterns = [
    /^AC:/i, /^HP:/i, /^Speed:/i,
    /^Saving Throws?\.?/i, /^Skills?\.?/i,
    /^Damage Resistances?\.?/i, /^Condition Immunities?\.?/i,
    /^Damage Immunities?\.?/i, /^Senses?\.?/i,
  ]
  let lastFieldIdx = abIdx >= 0 ? abIdx + 1 : 1
  for (let i = 0; i < sbLines.length; i++) {
    if (fieldPatterns.some(re => re.test(sbLines[i]))) lastFieldIdx = i
  }

  // Traits: ALL CAPS entries between last field and ACTIONS (or prompts / end)
  const traitsEnd = actionsIdx >= 0 ? actionsIdx : (promptsIdx >= 0 ? promptsIdx : sbLines.length)
  if (lastFieldIdx + 1 < traitsEnd) {
    result.traits = parseAllCapsEntries(sbLines.slice(lastFieldIdx + 1, traitsEnd).join('\n'))
  }

  // Actions: ALL CAPS entries between ACTIONS header and prompts (or end)
  if (actionsIdx >= 0) {
    const actEnd = promptsIdx >= 0 ? promptsIdx : sbLines.length
    result.actions = parseAllCapsEntries(sbLines.slice(actionsIdx + 1, actEnd).join('\n'))
  }

  // Combat Description Prompts: "On <trigger>: <text>"
  if (promptsIdx >= 0) {
    result.combat_prompts = sbLines.slice(promptsIdx + 1)
      .filter(l => /^On\s+/i.test(l))
      .map(l => {
        const m = l.match(/^On\s+(.+?):\s*(.+)$/i)
        if (!m) return null
        return {
          trigger: `On ${clean(m[1])}`,
          text: clean(m[2]).replace(/^["\u201C]|["\u201D]$/g, ''),
        }
      })
      .filter(Boolean)
  }

  result.slug = result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return result
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseSessionMarkdown(markdown) {
  if (markdown == null || typeof markdown !== 'string') {
    throw new TypeError('parseSessionMarkdown expects a non-null string')
  }

  const result = {
    sessionNumber: null,
    sessionTitle: '',
    chapterSubtitle: '',
    backgroundNotes: '',
    estimatedDuration: '',
    objectives: [],
    scenes: [],
    statBlocks: [],
  }

  // Normalise
  const md = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const allLines = md.split('\n')

  // ── Session number & title ────────────────────────────────────────────────

  for (let i = 0; i < Math.min(allLines.length, 40); i++) {
    const raw = allLines[i]
    const line = clean(raw)

    // "DM Guide · Session Three" or "DM Guide · Session 3" / "Session 12:"
    const sessMatch = line.match(/session\s+([a-z0-9-]+)/i)
    if (sessMatch && !result.sessionNumber) {
      result.sessionNumber = wordOrDigitToNum(sessMatch[1])
    }

    // "Chapter Three: The Thing That Was Held Back"
    const chapMatch = line.match(/Chapter\s+([a-z0-9-]+)\s*:\s*(.+)/i)
    if (chapMatch) {
      if (!result.sessionNumber) {
        result.sessionNumber = wordOrDigitToNum(chapMatch[1])
      }
      result.sessionTitle = clean(chapMatch[2])
      result.chapterSubtitle = line
    }

    // Fallback from slug-like references in docs, e.g. "s11-fork" / "S2-..."
    if (!result.sessionNumber) {
      const slugMatch = line.match(/\bs(\d+)-[a-z0-9-]+\b/i)
      if (slugMatch) {
        const sn = parseInt(slugMatch[1], 10)
        if (!Number.isNaN(sn)) result.sessionNumber = sn
      }
    }

    // Fallback from heading text, e.g. "# Session 12 — Something"
    if (!result.sessionNumber) {
      const headingSessionMatch = line.match(/^session\s+([a-z0-9-]+)/i)
      if (headingSessionMatch) {
        result.sessionNumber = wordOrDigitToNum(headingSessionMatch[1])
      }
    }
  }

  // ── Background section ────────────────────────────────────────────────────

  const bgMatch = md.match(/^#\s+.*background[^\n]*\n([\s\S]*?)(?=^#\s+)/im)
  if (bgMatch) {
    // Take first 4 paragraphs (not too long)
    const paras = bgMatch[1].split(/\n{2,}/).map(clean).filter(Boolean)
    result.backgroundNotes = paras.slice(0, 4).join(' ')
  }

  // ── Session overview table ────────────────────────────────────────────────

  const structHeadingRe = /^#\s+.*session structure/im
  const firstSceneRe = /^#{1,2}\s+.*Scene\s+\d/im
  const structPos = md.search(structHeadingRe)
  const firstScenePos = md.search(firstSceneRe)

  let overviewMap = {}
  if (structPos >= 0 && firstScenePos > structPos) {
    const tableBlock = md.slice(structPos, firstScenePos)
    overviewMap = parseOverviewTable(tableBlock)
  }

  // ── Split into scene blocks ───────────────────────────────────────────────

  // Scene headings: "# __Scene 1 — Title__" — h1 with optional bold markers
  const sceneHeadingRe = /^#{1,2}\s+(?:__)?Scene\s+(\d+[a-z]?)\s*[—–\-]+\s*(.+?)(?:__)?$/gm
  const sceneMatches = []
  let m
  while ((m = sceneHeadingRe.exec(md)) !== null) {
    sceneMatches.push({
      index: m.index,
      sceneNumber: m[1],
      title: clean(m[2]),
    })
  }

  if (sceneMatches.length === 0) {
    throw new Error('No scenes detected. Use markdown scene headings like "## Scene 1 — Title".')
  }

  const sceneBlocks = sceneMatches.map((sm, i) => {
    const lineEnd = md.indexOf('\n', sm.index)
    const start = lineEnd + 1
    const end = i + 1 < sceneMatches.length ? sceneMatches[i + 1].index : md.length
    return { ...sm, body: md.slice(start, end) }
  })

  // ── Order assignment ──────────────────────────────────────────────────────

  function sceneOrderNum(n) {
    const num = parseFloat(n.replace(/[a-z]$/, ''))
    const suffix = n.match(/[a-z]$/)?.[0]
    return num * 100 + (suffix ? suffix.charCodeAt(0) - 96 : 0)
  }

  const sortedSceneBlocks = [...sceneBlocks].sort(
    (a, b) => sceneOrderNum(a.sceneNumber) - sceneOrderNum(b.sceneNumber)
  )

  // ── Pre-pass: collect ALL stat blocks across all scenes ──────────────────
  // This ensures stat blocks are available for beat linking regardless of order.

  const statBlockHeadingRe = /^#{2,3}\s+(?:__)?Stat Block\s*[—–\-]\s*(.+?)(?:__)?$/gm
  let sbm
  while ((sbm = statBlockHeadingRe.exec(md)) !== null) {
    const sbName = clean(sbm[1])
    const bodyStart = md.indexOf('\n', sbm.index) + 1
    // Body ends at next heading or end of doc
    const nextHeading = /^#{2,3}\s+/gm
    nextHeading.lastIndex = bodyStart
    const nextMatch = nextHeading.exec(md)
    const bodyEnd = nextMatch ? nextMatch.index : md.length
    const rawText = `${sbName}\n${clean(md.slice(bodyStart, bodyEnd)).replace(/\n+/g, '\n')}`
    try {
      const parsed = parseStatBlock(rawText)
      if (!parsed.name) parsed.name = sbName
      parsed.slug = parsed.slug || sbName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      if (!result.statBlocks.find(s => s.name === parsed.name)) {
        result.statBlocks.push(parsed)
      }
    } catch (e) {
      console.warn('Stat block pre-pass failed:', sbName, e.message)
    }
  }

  // ── Process each scene ────────────────────────────────────────────────────

  sortedSceneBlocks.forEach((sb, orderIdx) => {
    const sceneNum = sb.sceneNumber
    const isBranching = /[a-z]$/.test(sceneNum)
    const sessionN = result.sessionNumber || 1

    // Get overview data
    const ovKey = sb.title.toLowerCase()
    const ov = overviewMap[ovKey]
      || Object.values(overviewMap).find(o =>
          o.purpose && sb.title.toLowerCase().includes(
            Object.keys(overviewMap).find(k => overviewMap[k] === o) || ''
          )
        )
      || {}

    const scene = {
      sceneNumber: sceneNum,
      title: sb.title,
      sceneType: 'narrative',
      order: orderIdx + 1,
      slug: `s${sessionN}-${sceneNum}`,
      purpose: ov.purpose || '',
      estimatedTime: ov.estimatedTime || '',
      fallbackNotes: ov.fallbackNotes || '',
      dmNotes: '',
      outcomes: [],
      isBranching,
      beats: [],
      branches: [],
    }

    // ── Split into beat blocks via ## headings ────────────────────────────

    // Beat headings: "## __Heading__" — h2 with optional bold markers
    const beatHeadingRe = /^#{2,3}\s+(?:__)?(.+?)(?:__)?$/gm
    const beatMatches = []
    let bm
    while ((bm = beatHeadingRe.exec(sb.body)) !== null) {
      beatMatches.push({ index: bm.index, heading: clean(bm[1]) })
    }

    const beatBlocks = beatMatches.map((bh, i) => {
      const lineEnd = sb.body.indexOf('\n', bh.index)
      const start = lineEnd + 1
      const end = i + 1 < beatMatches.length ? beatMatches[i + 1].index : sb.body.length
      return { heading: bh.heading, body: sb.body.slice(start, end) }
    })

    // Content before first ## → scene dmNotes
    if (beatMatches.length > 0 && beatMatches[0].index > 0) {
      const pre = clean(sb.body.slice(0, beatMatches[0].index).replace(/\n+/g, ' '))
      if (pre) scene.dmNotes = pre
    }

    // Check if any beat has a stat block → scene is combat
    if (beatBlocks.some(bb => /stat block/i.test(bb.heading))) {
      scene.sceneType = 'combat'
    }
    if (/combat|fight|battle/i.test(sb.title)) {
      scene.sceneType = 'combat'
    }

    // ── Process beat blocks ───────────────────────────────────────────────

    let beatOrder = 0
    let prevBeat = null

    for (const bb of beatBlocks) {
      const sectionType = detectBeatType(bb.heading)

      // ── Stat block ────────────────────────────────────────────────────
      if (sectionType === '__statblock__') {
        const sbName = clean(bb.heading.replace(/^stat block\s*[—–\-]\s*/i, ''))
        // Collect all text from this beat body
        const rawText = `${sbName}\n${clean(bb.body).replace(/\n+/g, '\n')}`
        try {
          const parsed = parseStatBlock(rawText)
          if (!parsed.name) parsed.name = sbName
          parsed.slug = parsed.slug || sbName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          // Don't add duplicates
          if (!result.statBlocks.find(s => s.name === parsed.name)) {
            result.statBlocks.push(parsed)
          }
        } catch (e) {
          console.warn('Stat block parse failed:', sbName, e.message)
        }
        continue
      }

      // ── DM note — append to previous beat ────────────────────────────
      if (sectionType === '__dmnote__') {
        if (prevBeat) {
          const noteText = cleanBodyText(bb.body)
          prevBeat.dmNotes = prevBeat.dmNotes
            ? `${prevBeat.dmNotes}\n${noteText}`
            : noteText
        }
        continue
      }

      // ── Regular beat ──────────────────────────────────────────────────
      const explicit = parseExplicitBeatHeading(bb.heading)
      if (!explicit) {
        throw new Error(
          `Invalid beat heading "${bb.heading}" in Scene ${sceneNum}. ` +
          `Use explicit beat type format: "[narrative|prompt|check|decision|combat|reveal|transition] Beat title"`
        )
      }
      const beatType = explicit.type
      const beatTitle = explicit.title
      beatOrder++

      // Parse body: separate content, dm notes, sub-beats (### headings)
      let content = ''
      let dmNotes = ''
      let mechanicalEffect = null
      let bodyForText = bb.body

      // Parse markdown pipe tables before paragraph cleaning so they don't get flattened into prose.
      if (beatType === 'check') {
        const parsedSkillChecks = parseMarkdownPipeTable(bodyForText, [
          'Trigger',
          'Skill / Save',
          'DC',
          'What They Learn',
        ])
        if (parsedSkillChecks) {
          const checks = parsedSkillChecks.rows.map(cols => {
            const rawDc = clean(cols[2] || '')
            const dcNum = parseInt(rawDc, 10)
            const dc = /^auto$/i.test(rawDc) ? 'Auto' : (Number.isNaN(dcNum) ? rawDc : dcNum)
            return {
              trigger: clean(cols[0] || ''),
              skill: clean(cols[1] || ''),
              dc,
              whatTheyLearn: clean(cols[3] || ''),
            }
          }).filter(r => r.trigger || r.skill || r.dc || r.whatTheyLearn)

          if (checks.length > 0) {
            mechanicalEffect = JSON.stringify(checks)
            bodyForText = parsedSkillChecks.bodyWithoutTable
          }
        }
      } else if (beatType === 'decision') {
        const parsedOutcomes = parseMarkdownPipeTable(bodyForText, [
          'Outcome',
          'Consequence',
        ])
        if (parsedOutcomes) {
          const outcomes = parsedOutcomes.rows.map(cols => ({
            outcome: clean(cols[0] || ''),
            consequence: clean(cols[1] || ''),
          })).filter(r => r.outcome || r.consequence)

          if (outcomes.length > 0) {
            mechanicalEffect = JSON.stringify(outcomes)
            bodyForText = parsedOutcomes.bodyWithoutTable
          }
        }
      }

      // For combat beats, extract inline stat blocks before paragraph processing
      let inlineStatBlock = null
      if (beatType === 'combat') {
        const extracted = extractInlineStatBlock(bodyForText)
        if (extracted) {
          inlineStatBlock = parseInlineStatBlock(extracted.statBlockLines)
          bodyForText = extracted.prose
          if (inlineStatBlock.name && !result.statBlocks.find(s => s.name === inlineStatBlock.name)) {
            result.statBlocks.push(inlineStatBlock)
          }
        }
      }

      // Check for sub-beat headings (### level)
      const subBeatRe = /^###\s+(?:__)?(.+?)(?:__)?$/gm
      const subBeatMatches = [...bodyForText.matchAll(subBeatRe)]

      if (subBeatMatches.length > 0) {
        // Combine all sub-beat content as the beat body
        content = cleanBodyText(bodyForText)
      } else {
        // Process paragraphs
        const paragraphs = bodyForText.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
        for (const para of paragraphs) {
          const stripped = clean(para)
          if (!stripped) continue

          if (isDmNote(stripped)) {
            const note = extractDmNoteText(stripped)
            if (note) dmNotes = dmNotes ? `${dmNotes}\n${note}` : note
            continue
          }

          // Flat inline table within beat body — store as dm note context
          if (/__/.test(para) && para.split('\n').filter(l => /__/.test(l)).length >= 2) {
            // It's a flat table (like "What They Notice / Effect")
            const tableLines = para.split('\n')
            const rows = parseFlatTable(tableLines)
            if (rows.length > 0) {
              // Check if it looks like a skill check table
              const hasSkillCols = Object.keys(rows[0]).some(k => /dc|skill|save/i.test(k))
              if (hasSkillCols) {
                mechanicalEffect = JSON.stringify(rows.map(r => {
                  const keys = Object.keys(r)
                  return {
                    trigger: r[keys[0]] || '',
                    skill: r[keys[1]] || '',
                    dc: parseInt(r[keys.find(k => /dc/i.test(k))] || '') || null,
                    result: r[keys[keys.length - 1]] || '',
                  }
                }))
              } else {
                // Store as dm notes
                const tableText = rows.map(r => Object.values(r).join(' → ')).join('\n')
                dmNotes = dmNotes ? `${dmNotes}\n${tableText}` : tableText
              }
              continue
            }
          }

          content = content ? `${content}\n\n${stripped}` : stripped
        }
      }

      const beat = {
        title: beatTitle,
        type: beatType,
        order: beatOrder,
        slug: `b-s${sessionN}-${sceneNum}-${beatOrder}`,
        triggerText: beatTitle,
        content: clean(content),
        playerText: clean(content),
        dmNotes: clean(dmNotes),
        mechanicalEffect,
        statBlockRef: null,
        statBlockSourceIndex: null,
        inlineStatBlock,
      }

      // Link beats to stat blocks — inline extraction gets priority
      if (inlineStatBlock?.name) {
        beat.statBlockRef = inlineStatBlock.name
        beat.statBlockSourceIndex = inlineStatBlock.slug || null
      } else {
        const sbRef = result.statBlocks.find(sb => {
          const sbLower = sb.name.toLowerCase()
          const headingLower = beatTitle.toLowerCase()
          return headingLower === sbLower ||
            headingLower.includes(sbLower) ||
            sbLower.includes(headingLower) ||
            content.toLowerCase().includes(sbLower)
        })
        if (sbRef) {
          beat.statBlockRef = sbRef.name
          beat.statBlockSourceIndex = sbRef.slug || sbRef.index || null
        }
      }

      scene.beats.push(beat)
      prevBeat = beat

      // "If Fails — COMBAT" split
      if (/if.*fails.*combat|if.*fail.*—.*combat/i.test(beatTitle)) {
        beatOrder++
        const combatBeat = {
          title: 'Combat — Failed Persuasion',
          type: 'combat',
          order: beatOrder,
          slug: `b-s${sessionN}-${sceneNum}-${beatOrder}`,
          triggerText: 'Combat — Failed Persuasion',
          content: '', playerText: '', dmNotes: '',
          mechanicalEffect: null, statBlockRef: null,
        }
        scene.beats.push(combatBeat)
        prevBeat = combatBeat
      }
    }

    result.scenes.push(scene)
  })

  // ── Wire up branches ──────────────────────────────────────────────────────

  result.scenes.filter(s => s.isBranching).forEach((bs, i) => {
    const intPart = bs.sceneNumber.replace(/[a-z]$/, '')
    const parent = result.scenes.find(s => s.sceneNumber === intPart && !s.isBranching)
    if (parent) {
      parent.branches.push({
        targetSceneNumber: bs.sceneNumber,
        label: bs.title,
        description: bs.fallbackNotes || '',
        conditionText: `Party takes the ${bs.title} path`,
        order: i + 1,
      })
    }
  })

  // Strict validation pass for markdown imports
  for (const scene of result.scenes) {
    if (!scene.title) {
      throw new Error(`Scene ${scene.sceneNumber} is missing a title.`)
    }
    for (const beat of scene.beats || []) {
      if (!ALLOWED_BEAT_TYPES.has(beat.type)) {
        throw new Error(`Scene ${scene.sceneNumber} beat "${beat.title}" has invalid type "${beat.type}".`)
      }
      if (!beat.title) {
        throw new Error(`Scene ${scene.sceneNumber} has a beat with no title.`)
      }
    }
  }

  return result
}

// Backward-compatible export name used by existing imports
export const parseDocxSession = parseSessionMarkdown

// ─── Helper: clean a beat body block into readable text ──────────────────────

function cleanBodyText(body) {
  return body
    .split('\n')
    .map(l => {
      // Skip sub-beat headings (### level) — include their content
      if (/^###/.test(l.trim())) {
        return clean(l.replace(/^###\s*/, '')) + ':'
      }
      return clean(l)
    })
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parsePipeRow(line) {
  const trimmed = (line || '').trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null
  return trimmed
    .slice(1, -1)
    .split('|')
    .map(c => clean(c))
}

function isPipeSeparator(line) {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test((line || '').trim())
}

function parseMarkdownPipeTable(body, expectedHeaders) {
  const lines = (body || '').split('\n')
  const expected = expectedHeaders.map(h => h.toLowerCase())

  for (let i = 0; i < lines.length - 1; i++) {
    const headerCells = parsePipeRow(lines[i])
    if (!headerCells || headerCells.length !== expected.length) continue
    const headerNorm = headerCells.map(h => h.toLowerCase())
    const sameHeaders = expected.every((h, idx) => headerNorm[idx] === h)
    if (!sameHeaders) continue
    if (!isPipeSeparator(lines[i + 1])) continue

    const rows = []
    let j = i + 2
    while (j < lines.length) {
      const rowCells = parsePipeRow(lines[j])
      if (!rowCells || rowCells.length < expected.length) break
      rows.push(rowCells.slice(0, expected.length))
      j += 1
    }

    if (rows.length === 0) continue

    const remainingLines = [...lines.slice(0, i), ...lines.slice(j)]
    return {
      rows,
      bodyWithoutTable: remainingLines.join('\n'),
    }
  }

  return null
}
