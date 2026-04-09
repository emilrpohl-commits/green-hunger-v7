/**
 * parseDocxSession(markdown)
 *
 * Parses mammoth-generated markdown from a Green Hunger DM session DOCX.
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

// ─── Beat type detection ──────────────────────────────────────────────────────

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

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseDocxSession(markdown) {
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

  const bgHeadingRe = /^#\s+.*background/im
  const bgMatch = md.match(/^#\s+.*background[^\n]*\n([\s\S]*?)(?=^#\s+)/im)
  if (bgMatch) {
    // Take first 4 paragraphs (not too long)
    const paras = bgMatch[1].split(/\n{2,}/).map(clean).filter(Boolean)
    result.backgroundNotes = paras.slice(0, 4).join(' ')
  }

  // ── Session overview table ────────────────────────────────────────────────

  const structHeadingRe = /^#\s+.*session structure/im
  const firstSceneRe = /^#\s+.*Scene\s+\d/im
  const structPos = md.search(structHeadingRe)
  const firstScenePos = md.search(firstSceneRe)

  let overviewMap = {}
  if (structPos >= 0 && firstScenePos > structPos) {
    const tableBlock = md.slice(structPos, firstScenePos)
    overviewMap = parseOverviewTable(tableBlock)
  }

  // ── Split into scene blocks ───────────────────────────────────────────────

  // Scene headings: "# __Scene 1 — Title__" — h1 with optional bold markers
  const sceneHeadingRe = /^#\s+(?:__)?Scene\s+(\d+[a-z]?)\s*[—–\-]+\s*(.+?)(?:__)?$/gm
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
    throw new Error('No scenes detected. Make sure the document has "# Scene N — Title" headings.')
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

  const statBlockHeadingRe = /^##\s+(?:__)?Stat Block\s*[—–\-]\s*(.+?)(?:__)?$/gm
  let sbm
  while ((sbm = statBlockHeadingRe.exec(md)) !== null) {
    const sbName = clean(sbm[1])
    const bodyStart = md.indexOf('\n', sbm.index) + 1
    // Body ends at next ## heading or end of doc
    const nextHeading = /^##\s+/gm
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
    const beatHeadingRe = /^##\s+(?:__)?(.+?)(?:__)?$/gm
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
      const beatType = detectBeatType(bb.heading)

      // ── Stat block ────────────────────────────────────────────────────
      if (beatType === '__statblock__') {
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
      if (beatType === '__dmnote__') {
        if (prevBeat) {
          const noteText = cleanBodyText(bb.body)
          prevBeat.dmNotes = prevBeat.dmNotes
            ? `${prevBeat.dmNotes}\n${noteText}`
            : noteText
        }
        continue
      }

      // ── Regular beat ──────────────────────────────────────────────────
      beatOrder++

      // Parse body: separate content, dm notes, sub-beats (### headings)
      let content = ''
      let dmNotes = ''
      let mechanicalEffect = null

      // Check for sub-beat headings (### level)
      const subBeatRe = /^###\s+(?:__)?(.+?)(?:__)?$/gm
      const subBeatMatches = [...bb.body.matchAll(subBeatRe)]

      if (subBeatMatches.length > 0) {
        // Combine all sub-beat content as the beat body
        content = cleanBodyText(bb.body)
      } else {
        // Process paragraphs
        const paragraphs = bb.body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
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
        title: bb.heading,
        type: beatType,
        order: beatOrder,
        slug: `b-s${sessionN}-${sceneNum}-${beatOrder}`,
        triggerText: bb.heading,
        content: clean(content),
        playerText: clean(content),
        dmNotes: clean(dmNotes),
        mechanicalEffect,
        statBlockRef: null,
      }

      // Link beats to stat blocks: check heading and content against any known stat block name
      const sbRef = result.statBlocks.find(sb => {
        const sbLower = sb.name.toLowerCase()
        const headingLower = bb.heading.toLowerCase()
        return headingLower === sbLower ||
          headingLower.includes(sbLower) ||
          sbLower.includes(headingLower) ||
          content.toLowerCase().includes(sbLower)
      })
      if (sbRef) {
        beat.statBlockRef = sbRef.name
        // Upgrade type to combat if not already a more specific type
        if (beatType === 'narrative' || beatType === 'prompt') {
          beat.type = 'combat'
        }
      }

      scene.beats.push(beat)
      prevBeat = beat

      // "If Fails — COMBAT" split
      if (/if.*fails.*combat|if.*fail.*—.*combat/i.test(bb.heading)) {
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

  return result
}

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
