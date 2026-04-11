/**
 * Deterministic cleanup + mapping from monsters-srd-5.2.1.json entries → stat_blocks row shape.
 * @module shared/lib/srdMonsters/cleanAndMap
 */

import { normalizeStatBlockActions } from '../statBlockActions.js'

export const SRD_SLUG_PREFIX = 'srd521-'
export const SRD_DATASET = 'monsters-srd-5.2.1.json'
export const SRD_SOURCE_LABEL = 'SRD 5.2.1'

/** Standalone line headers (exact trim match). */
const SECTION_HEADERS_STANDALONE = new Set([
  'Traits',
  'Actions',
  'Bonus Actions',
  'Reactions',
  'Legendary Actions',
  'Lair Actions',
  'Habitat',
  'Treasure',
  'Gear',
])

/**
 * SRD PDF often uses "Skills Perception +5" / "CR 10 (XP…)" on one line — not a lone "Skills" line.
 */
const SECTION_LINE_START_RE =
  /^\s*(Skills|Senses|Languages|CR|Vulnerabilities|Resistances|Immunities)\s+(.*)$/

const DAMAGE_TYPE_LOWER = new Set([
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
])

const CONDITION_LOWER = new Set([
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
])

const BLEED_LINE_RE = /\n(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+[^,\n]+,\s*[^\n]+\nAC\s+\d+/m

const ABILITY_KEYS = [
  ['str', 'STR'],
  ['dex', 'DEX'],
  ['con', 'CON'],
  ['int', 'INT'],
  ['wis', 'WIS'],
  ['cha', 'CHA'],
]

/**
 * @param {string} monsterId from JSON `id`
 */
export function srdStatBlockSlug(monsterId) {
  const id = String(monsterId || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `${SRD_SLUG_PREFIX}${id || 'unknown'}`
}

/**
 * @param {string[]} warnings
 */
export function sanitizeMonsterText(text, _warnings) {
  if (text == null || text === '') return ''
  let t = String(text)
  t = t.replace(/\s*\b\d{3}\s+System Reference Document\s*5\.2\.1\b/gi, ' ')
  t = t.replace(/\bSystem Reference Document\s*5\.2\.1\b/gi, ' ')
  t = t.replace(/(?:^|\n)\s*\d{3}\s*(?=\n|$)/g, '\n')
  t = t.replace(/(\w+)-\s+(\w+)/g, '$1$2')
  t = t.replace(/\s{2,}/g, ' ')
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

/**
 * @param {string} text
 * @param {string[]} warnings
 */
export function truncateNextMonsterBleed(text, warnings) {
  if (!text) return text
  const m = text.match(BLEED_LINE_RE)
  if (m && m.index != null && m.index > 0) {
    warnings.push('truncated_next_monster_bleed')
    return text.slice(0, m.index).trim()
  }
  const loose = text.match(/\n(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+[^,\n]+,\s*[^\n]+/m)
  if (loose && loose.index != null && loose.index > 40) {
    warnings.push('truncated_next_monster_bleed')
    return text.slice(0, loose.index).trim()
  }
  return text
}

/**
 * Split rawBlock into section label → body (trimmed, includes following lines until next header).
 */
export function splitRawBlockSections(rawBlock) {
  if (!rawBlock) return {}
  const lines = String(rawBlock).split('\n')
  /** @type {Record<string, string>} */
  const sections = {}
  let current = null
  const buf = []

  const flush = () => {
    if (current != null) {
      sections[current] = buf.join('\n').trim()
    }
    buf.length = 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const inline = trimmed.match(SECTION_LINE_START_RE)
    if (inline) {
      flush()
      current = inline[1]
      const rest = (inline[2] || '').trim()
      if (rest) buf.push(rest)
      continue
    }
    if (SECTION_HEADERS_STANDALONE.has(trimmed)) {
      flush()
      current = trimmed
      continue
    }
    if (current != null) buf.push(line)
  }
  flush()
  return sections
}

/**
 * @param {string} inside CR parentheses e.g. "XP 5,900, or 7 ,200 in lair; PB +4"
 */
export function parseCrParenthetical(inside) {
  let xp = null
  const xpM = inside.match(/XP\s*([\d,]+)/i) || inside.match(/([\d,]+)\s*XP/i)
  if (xpM) {
    xp = parseInt(xpM[1].replace(/,/g, ''), 10)
    if (!Number.isFinite(xp)) xp = null
  }
  let pb = null
  const pbM = inside.match(/PB\s*([+\-]?\d+)/i)
  if (pbM) pb = parseInt(pbM[1], 10)
  if (!Number.isFinite(pb)) pb = null
  return { xp, pb }
}

/**
 * Full line after "CR " e.g. "10 (XP 5,900, or 7 ,200 in lair; PB +4)"
 */
export function parseCrLine(crLine) {
  if (!crLine) return { cr: null, xp: null, pb: null }
  let s = String(crLine).trim()
  if (!/^CR\s+/i.test(s)) s = `CR ${s}`
  const m = s.match(/^CR\s+([\d/]+)\s*\(([^)]+)\)/i)
  if (!m) return { cr: null, xp: null, pb: null }
  const inner = parseCrParenthetical(m[2])
  return { cr: m[1].trim(), xp: inner.xp, pb: inner.pb }
}

/** Approximate proficiency bonus from challenge rating text (5e-style). */
export function proficiencyBonusFromCr(crText) {
  if (!crText || crText === '—') return 2
  const t = String(crText).trim()
  const table = {
    '0': 2,
    '1/8': 2,
    '1/4': 2,
    '1/2': 2,
    '1': 2,
    '2': 2,
    '3': 2,
    '4': 2,
    '5': 3,
    '6': 3,
    '7': 3,
    '8': 3,
    '9': 4,
    '10': 4,
    '11': 4,
    '12': 4,
    '13': 5,
    '14': 5,
    '15': 5,
    '16': 5,
    '17': 6,
    '18': 6,
    '19': 6,
    '20': 6,
    '21': 7,
    '22': 7,
    '23': 7,
    '24': 7,
    '25': 8,
    '26': 8,
    '27': 8,
    '28': 8,
    '29': 9,
    '30': 9,
  }
  return table[t] ?? 2
}

export function parseSkillsLine(skillsText) {
  if (!skillsText?.trim()) return []
  const text = skillsText.replace(/\n/g, ' ').trim()
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
  /** @type {{ name: string, mod: number }[]} */
  const out = []
  for (const part of parts) {
    const mm = part.match(/^(.+?)\s+([+\-]\d+)$/)
    if (mm) {
      out.push({ name: mm[1].trim(), mod: parseInt(mm[2], 10) })
    }
  }
  return out
}

export function parsePassivePerception(sensesText) {
  if (!sensesText) return null
  const m = String(sensesText).match(/Passive\s+Perception\s+(\d+)/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

export function parseLanguagesBlock(langText) {
  if (!langText?.trim()) return { languages: '', telepathy: null }
  const flat = langText.replace(/\n/g, ' ').trim()
  let telepathy = null
  const parts = flat.split(';').map((p) => p.trim()).filter(Boolean)
  const langParts = []
  for (const p of parts) {
    if (/^telepathy/i.test(p)) telepathy = p
    else langParts.push(p)
  }
  let languages = langParts.join('; ').trim()
  if (telepathy) {
    languages = languages ? `${languages}; ${telepathy}` : telepathy
  }
  return { languages: languages || '—', telepathy }
}

/**
 * Classify comma/semicolon lists into damage vs conditions for immunities-style lines.
 */
export function splitDamageAndConditions(blob) {
  if (!blob?.trim()) return { damage: [], condition: [] }
  const damage = []
  const condition = []
  const segments = blob.split(';').map((s) => s.trim()).filter(Boolean)
  for (const seg of segments) {
    const items = seg.split(',').map((x) => x.trim()).filter(Boolean)
    for (const item of items) {
      const key = item.toLowerCase()
      if (CONDITION_LOWER.has(key)) condition.push(item)
      else if (DAMAGE_TYPE_LOWER.has(key)) damage.push(item)
      else if (/^exhaustion$/i.test(item)) condition.push(item)
      else damage.push(item)
    }
  }
  return { damage, condition }
}

export function parseCommaList(line) {
  if (!line?.trim()) return []
  return line
    .replace(/\n/g, ' ')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Parse "Name. Body" entries (trait/action style).
 * @param {string} sectionText
 * @param {string[]} warnings
 */
export function parseTitledEntries(sectionText, warnings) {
  if (!sectionText?.trim()) return []
  const text = sectionText.trim()
  const titleRe = /(^|\n)([A-Z][A-Za-z0-9'’\-\(\)\/, ]+)\.\s+/g
  const matches = []
  let m
  while ((m = titleRe.exec(text)) !== null) {
    matches.push({
      title: m[2].trim(),
      bodyStart: m.index + m[0].length,
      titleStart: m.index,
    })
  }
  if (matches.length === 0) return []

  /** @type {{ name: string, desc: string }[]} */
  const entries = []
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].titleStart : text.length
    let body = text.slice(matches[i].bodyStart, end).trim().replace(/\s+/g, ' ')
    body = sanitizeMonsterText(body, warnings)
    body = truncateNextMonsterBleed(body, warnings)
    entries.push({ name: matches[i].title, desc: body })
  }
  return entries
}

/**
 * @param {{ name?: string, desc?: string, description?: string }[]} entries
 * @param {string[]} warnings
 */
export function repairLegendaryActions(entries, _warnings) {
  if (!Array.isArray(entries) || entries.length === 0) return entries
  const e = entries.map((x) => ({
    name: x.name,
    desc: x.desc ?? x.description ?? '',
  }))
  if (/^lair\)\s*$/i.test((e[0].name || '').trim())) {
    const extra = e[0].desc || ''
    e.shift()
    if (e.length && extra) {
      e[0] = { ...e[0], desc: `${extra.trim()} ${e[0].desc}`.trim() }
    }
  }
  return e
}

/**
 * @param {{ name?: string, desc?: string, description?: string }[]} entries
 * @param {string[]} warnings
 */
export function repairSplitMultiattack(entries, _warnings) {
  if (!Array.isArray(entries) || entries.length < 2) return entries
  const out = []
  for (let i = 0; i < entries.length; i++) {
    const cur = entries[i]
    const next = entries[i + 1]
    const cname = (cur.name || '').trim()
    const cdesc = (cur.desc ?? cur.description ?? '').trim()
    const nname = (next?.name || '').trim()
    if (
      next &&
      /^multiattack$/i.test(cname) &&
      !/[.!?]\s*$/.test(cdesc) &&
      /\battacks?\s*$/i.test(nname)
    ) {
      const ndesc = (next.desc ?? next.description ?? '').trim()
      const merged = `${cdesc} ${nname}. ${ndesc}`.trim()
      out.push({ name: cur.name, desc: merged })
      i++
      continue
    }
    out.push({
      name: cur.name,
      desc: cur.desc ?? cur.description ?? '',
    })
  }
  return out
}

/**
 * @param {{ name?: string, description?: string, desc?: string }[]} list
 * @param {string[]} warnings
 */
export function mapNamedListToDesc(list, warnings) {
  if (!Array.isArray(list)) return []
  return list.map((item) => {
    let desc = item.desc ?? item.description ?? ''
    desc = sanitizeMonsterText(desc, warnings)
    desc = truncateNextMonsterBleed(desc, warnings)
    return { name: (item.name || '').trim(), desc }
  })
}

function parseAc(acStr) {
  const m = String(acStr || '').match(/\d+/)
  return m ? parseInt(m[0], 10) : 10
}

function speedObjectToString(speed) {
  if (!speed || typeof speed !== 'object') return '30 ft.'
  const parts = []
  const order = ['walk', 'burrow', 'climb', 'fly', 'swim']
  for (const k of order) {
    if (speed[k]) {
      const label = k === 'walk' ? 'Walk' : k.charAt(0).toUpperCase() + k.slice(1)
      parts.push(`${label} ${speed[k]}`)
    }
  }
  for (const [k, v] of Object.entries(speed)) {
    if (!order.includes(k) && v) parts.push(`${k} ${v}`)
  }
  return parts.length ? parts.join(', ') : '30 ft.'
}

function abilityScoresFromJson(abilities) {
  /** @type {Record<string, number>} */
  const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  if (!abilities || typeof abilities !== 'object') return scores
  for (const [key, abbr] of ABILITY_KEYS) {
    const row = abilities[key]
    if (row && typeof row.score === 'number') scores[abbr] = row.score
  }
  return scores
}

function savingThrowsFromAbilities(abilities) {
  if (!abilities || typeof abilities !== 'object') return []
  /** @type {{ name: string, mod: number }[]} */
  const out = []
  for (const [key, abbr] of ABILITY_KEYS) {
    const row = abilities[key]
    if (row && typeof row.mod === 'number' && typeof row.save === 'number' && row.save !== row.mod) {
      out.push({ name: abbr, mod: row.save })
    }
  }
  return out
}

function parseSignedInt(value) {
  if (value == null) return null
  const n = parseInt(String(value).trim(), 10)
  return Number.isFinite(n) ? n : null
}

function parseAbilitiesFromRawBlock(rawBlock) {
  if (!rawBlock) return null
  const lines = String(rawBlock).split('\n')
  const joined = lines.join(' ')
  const m = joined.match(
    /Str\s+(\d+)\s+([+\-]?\d+)\s+([+\-]?\d+)\s+Dex\s+(\d+)\s+([+\-]?\d+)\s+([+\-]?\d+)\s+Con\s+(\d+)\s+([+\-]?\d+)\s+([+\-]?\d+)\s+Int\s+(\d+)\s+([+\-]?\d+)\s+([+\-]?\d+)\s+WIS\s+(\d+)\s+([+\-]?\d+)\s+([+\-]?\d+)\s+Cha\s+(\d+)\s+([+\-]?\d+)\s+([+\-]?\d+)/i
  )
  if (!m) return null
  return {
    str: { score: parseInt(m[1], 10), mod: parseSignedInt(m[2]) ?? 0, save: parseSignedInt(m[3]) ?? 0 },
    dex: { score: parseInt(m[4], 10), mod: parseSignedInt(m[5]) ?? 0, save: parseSignedInt(m[6]) ?? 0 },
    con: { score: parseInt(m[7], 10), mod: parseSignedInt(m[8]) ?? 0, save: parseSignedInt(m[9]) ?? 0 },
    int: { score: parseInt(m[10], 10), mod: parseSignedInt(m[11]) ?? 0, save: parseSignedInt(m[12]) ?? 0 },
    wis: { score: parseInt(m[13], 10), mod: parseSignedInt(m[14]) ?? 0, save: parseSignedInt(m[15]) ?? 0 },
    cha: { score: parseInt(m[16], 10), mod: parseSignedInt(m[17]) ?? 0, save: parseSignedInt(m[18]) ?? 0 },
  }
}

/**
 * @param {Record<string, any>} monster - one element from monsters array
 * @returns {{ payload: Record<string, any>, warnings: string[], parse_quality: 'high'|'medium'|'low', slug: string }}
 */
export function buildSrdStatBlockPayload(monster) {
  const warnings = []
  const rawBlockOriginal = monster.rawBlock != null ? String(monster.rawBlock) : ''
  const sections = splitRawBlockSections(rawBlockOriginal)

  const crLine = sections.CR || ''
  const parsedCr = parseCrLine(crLine)
  const cr = parsedCr.cr || (monster.cr != null ? String(monster.cr) : null)
  const xp = parsedCr.xp ?? monster.xp ?? null
  const pb = parsedCr.pb ?? monster.pb ?? null

  const skillsParsed = parseSkillsLine(sections.Skills || '')
  const sensesRaw = (sections.Senses || '').replace(/\n/g, ' ').trim()
  const passivePerception = parsePassivePerception(sensesRaw)
  const langParsed = parseLanguagesBlock(sections.Languages || '')

  const vuln = parseCommaList(sections.Vulnerabilities || '')
  const res = parseCommaList(sections.Resistances || '')
  const immRaw = sections.Immunities || ''
  const immSplit = splitDamageAndConditions(immRaw.replace(/\n/g, ' '))

  let traits = mapNamedListToDesc(monster.traits || [], warnings)
  let actions = mapNamedListToDesc(monster.actions || [], warnings)
  let bonusActions = mapNamedListToDesc(monster.bonusActions || [], warnings)
  let reactions = mapNamedListToDesc(monster.reactions || [], warnings)
  let legendary = mapNamedListToDesc(monster.legendaryActions || [], warnings)
  let lair = mapNamedListToDesc(monster.lairActions || [], warnings)

  if (sections.Traits?.trim()) {
    const fromRaw = parseTitledEntries(sections.Traits, warnings)
    if (fromRaw.length >= traits.length) traits = fromRaw
  }
  if (sections.Actions?.trim()) {
    const fromRaw = parseTitledEntries(sections.Actions, warnings)
    if (fromRaw.length >= actions.length) actions = fromRaw
  }
  if (sections['Bonus Actions']?.trim()) {
    const fromRaw = parseTitledEntries(sections['Bonus Actions'], warnings)
    if (fromRaw.length > bonusActions.length) bonusActions = fromRaw
  }
  if (sections.Reactions?.trim()) {
    const fromRaw = parseTitledEntries(sections.Reactions, warnings)
    if (fromRaw.length > reactions.length) reactions = fromRaw
  }
  if (sections['Legendary Actions']?.trim()) {
    const fromRaw = parseTitledEntries(sections['Legendary Actions'], warnings)
    if (fromRaw.length >= legendary.length) legendary = fromRaw
  }
  if (sections['Lair Actions']?.trim()) {
    const fromRaw = parseTitledEntries(sections['Lair Actions'], warnings)
    if (fromRaw.length > lair.length) lair = fromRaw
  }

  actions = repairSplitMultiattack(actions, warnings)
  legendary = repairLegendaryActions(legendary, warnings)

  const abilities = monster.abilities || parseAbilitiesFromRawBlock(rawBlockOriginal)
  const ability_scores = abilityScoresFromJson(abilities)
  const saving_throws = savingThrowsFromAbilities(abilities)

  const skills =
    skillsParsed.length > 0
      ? skillsParsed
      : Object.entries(monster.skills && typeof monster.skills === 'object' ? monster.skills : {}).map(([name, mod]) => ({
          name,
          mod: typeof mod === 'number' ? mod : parseInt(mod, 10) || 0,
        }))

  const senses = sensesRaw || null
  const languages =
    langParsed.languages ||
    (Array.isArray(monster.languages) && monster.languages.length
      ? monster.languages.join('; ')
      : monster.telepathy
        ? String(monster.telepathy)
        : '—')

  const slug = srdStatBlockSlug(monster.id)

  const resolvedCr = cr || '—'
  const resolvedPb = pb != null ? pb : proficiencyBonusFromCr(parsedCr.cr || cr)

  /** @type {'high'|'medium'|'low'} */
  let parse_quality = 'high'
  if (!abilities) {
    parse_quality = 'low'
    warnings.push('abilities_missing')
  }
  if (!parsedCr.cr) {
    if (parse_quality === 'high') parse_quality = 'medium'
    warnings.push('cr_parse_failed')
  }
  if (!senses && !passivePerception) {
    if (parse_quality === 'high') parse_quality = 'medium'
    warnings.push('senses_missing')
  }
  const hasCombatText =
    traits.length > 0 ||
    actions.length > 0 ||
    bonusActions.length > 0 ||
    reactions.length > 0 ||
    legendary.length > 0 ||
    lair.length > 0
  if (!hasCombatText) {
    parse_quality = 'low'
    warnings.push('empty_traits_and_actions')
  }

  const mediumSignals = [
    'truncated_next_monster_bleed',
    'cr_parse_failed',
    'senses_missing',
  ]
  if (parse_quality === 'high' && mediumSignals.some((s) => warnings.includes(s))) {
    parse_quality = 'medium'
  }
  if (parse_quality === 'medium' && (warnings.includes('abilities_missing') || warnings.includes('empty_traits_and_actions'))) {
    parse_quality = 'low'
  }

  const qualityTag = `parse-quality-${parse_quality}`

  const import_metadata = {
    srd: {
      dataset: SRD_DATASET,
      monster_id: monster.id,
      parse_quality,
      warnings: [...new Set(warnings)],
      xp,
      passive_perception: passivePerception,
      abilities_source: monster.abilities ? 'json' : (abilities ? 'raw_fallback' : 'missing'),
      raw_block: rawBlockOriginal,
    },
  }

  /** @type {Record<string, any>} */
  const payload = {
    slug,
    name: monster.name || slug,
    source: SRD_SOURCE_LABEL,
    creature_type: monster.type || null,
    size: monster.size || 'Medium',
    alignment: monster.alignment || null,
    cr: resolvedCr,
    proficiency_bonus: resolvedPb,
    ac: parseAc(monster.ac),
    ac_note: null,
    max_hp: monster.hp?.average != null ? monster.hp.average : 1,
    hit_dice: monster.hp?.formula || null,
    speed: speedObjectToString(monster.speed),
    ability_scores,
    saving_throws,
    skills,
    resistances: res.length ? res : [],
    immunities: {
      damage: immSplit.damage.length ? immSplit.damage : [],
      condition: immSplit.condition.length ? immSplit.condition : [],
    },
    vulnerabilities: vuln.length ? vuln : [],
    senses: senses || '—',
    languages,
    traits,
    actions,
    bonus_actions: bonusActions,
    reactions,
    legendary_actions: legendary,
    lair_actions: lair,
    spellcasting: {},
    combat_prompts: [],
    dm_notes: [],
    tags: ['srd-import', 'srd-5.2.1', qualityTag],
    import_metadata,
    cloned_from_reference_id: null,
  }

  const normalized = normalizeStatBlockActions(payload)

  return {
    payload: normalized,
    warnings: [...new Set(warnings)],
    parse_quality,
    slug,
  }
}
