#!/usr/bin/env node
/**
 * Backfill compact combat beat stat text into linked stat_blocks.
 *
 * Usage:
 *   node tools/backfillCompactBeatStatblocks.mjs --dry-run
 *   node tools/backfillCompactBeatStatblocks.mjs --apply
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const dryRun = flags.has('--dry-run') || !flags.has('--apply')
const apply = flags.has('--apply') && !dryRun

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

function slugify(s) {
  return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function hasCompactMarkers(text) {
  return /\bCR\s*[0-9]+(?:\/[0-9]+)?\b/i.test(text)
    && /\bSTR\b.*\bDEX\b.*\bCON\b.*\bINT\b.*\bWIS\b.*\bCHA\b/i.test(text)
    && /(?:\bAC\b\s*:?\s*\d+|\bHP\b\s*:?\s*(?:shared\s+pool\s*)?\d+)/i.test(text)
}

function parseCompactStatblock(text, beatTitle = '') {
  const rawOriginal = String(text || '')
  const raw = clean(rawOriginal)
  if (!hasCompactMarkers(raw)) return null

  const beforeCr = (raw.split(/\bCR\s*[0-9]+(?:\/[0-9]+)?\b/i)[0] || '').trim()
  const baseName = clean(
    beforeCr
      .split(/[—–-]/)[0]
      .replace(/\b(?:Linked Encounter|Combat Encounter)\b/ig, '')
  ) || clean(beatTitle) || 'Imported Compact Encounter'

  const crMatch = raw.match(/\bCR\s*([0-9]+(?:\/[0-9]+)?)\b/i)
  /** Prefer last AC/HP match so duplicate “CR … AC … HP …” fragments in prose don’t win. */
  const acMatches = [...raw.matchAll(/\bAC\b\s*:?\s*(\d+)/gi)]
  const hpMatches = [...raw.matchAll(/\bHP\b\s*:?\s*(?:shared\s+pool\s*)?(\d+)/gi)]
  const cr = crMatch ? crMatch[1] : '1'
  const ac = acMatches.length ? Number(acMatches[acMatches.length - 1][1]) : 10
  const hp = hpMatches.length ? Number(hpMatches[hpMatches.length - 1][1]) : 10

  const abilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  const withMods = raw.match(/STR\s*(\d+)\s*\([^)]+\)\s*DEX\s*(\d+)\s*\([^)]+\)\s*CON\s*(\d+)\s*\([^)]+\)\s*INT\s*(\d+)\s*\([^)]+\)\s*WIS\s*(\d+)\s*\([^)]+\)\s*CHA\s*(\d+)\s*\([^)]+\)/i)
  if (withMods) {
    ;['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((k, i) => { abilityScores[k] = Number(withMods[i + 1]) || 10 })
  } else {
    const plain = raw.match(/STR\s*(\d+)\s*DEX\s*(\d+)\s*CON\s*(\d+)\s*INT\s*(\d+)\s*WIS\s*(\d+)\s*CHA\s*(\d+)/i)
    if (plain) {
      ;['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((k, i) => { abilityScores[k] = Number(plain[i + 1]) || 10 })
    }
  }

  const crParts = String(cr).split('/')
  const crNum = crParts.length === 2
    ? Number(crParts[0]) / Number(crParts[1])
    : (Number(cr) || 1)
  const proficiency_bonus = Math.max(2, Math.ceil(1 + crNum / 4))

  const between = (source, startRe, endRe) => {
    const m = source.match(startRe)
    if (!m) return ''
    const start = m.index + m[0].length
    const tail = source.slice(start)
    if (!endRe) return clean(tail)
    const e = tail.match(endRe)
    if (!e) return clean(tail)
    return clean(tail.slice(0, e.index))
  }

  const speed = clean(
    (raw.match(/Speed:\s*(.+?)(?=\s+(?:Damage Resistances|Condition Immunities|LINKED DECAY|UNFINISHED CONTAINMENT|FRACTURED CONSCIOUSNESS|ACTIONS|Combat Description Prompts)\b|$)/i)?.[1])
      || '30 ft.'
  )
  const resistancesRaw = between(raw, /Damage Resistances\.?\s*/i, /\s+Condition Immunities\.?/i)
  const conditionImmRaw = between(raw, /Condition Immunities\.?\s*/i, /\s+(?:LINKED DECAY|UNFINISHED CONTAINMENT|FRACTURED CONSCIOUSNESS|ACTIONS|Combat Description Prompts)\b/i)
  const resistances = resistancesRaw
    ? resistancesRaw.split(',').map((v) => clean(v)).filter(Boolean)
    : []
  const conditionImmunities = conditionImmRaw
    ? conditionImmRaw.split(',').map((v) => clean(v)).filter(Boolean)
    : []

  const linkedDecay = between(raw, /LINKED DECAY\.?\s*/i, /\s+UNFINISHED CONTAINMENT\.?/i)
  const unfinishedContainment = between(raw, /UNFINISHED CONTAINMENT\.?\s*/i, /\s+FRACTURED CONSCIOUSNESS\.?/i)
  const fracturedConsciousness = between(raw, /FRACTURED CONSCIOUSNESS\.?\s*/i, /\s+ACTIONS\b/i)

  const actionsText = between(raw, /ACTIONS\b\s*/i, /\s+Combat Description Prompts\b/i)
  const promptsText = between(raw, /Combat Description Prompts\b\s*/i, /$/i)

  const actions = []
  const grasp = actionsText.match(/Grasping Tendril\.\s*(.+?)(?=\s+Spore Burst|$)/i)
  if (grasp) {
    actions.push({ name: 'Grasping Tendril', type: 'special', desc: clean(grasp[1]) })
  }
  const spore = actionsText.match(/Spore Burst\s*\(Recharge\s*5-6\)\.\s*(.+)$/i)
  if (spore) {
    actions.push({ name: 'Spore Burst (Recharge 5-6)', type: 'special', desc: clean(spore[1]) })
  }

  const combat_prompts = []
  const promptPairs = [...promptsText.matchAll(/On\s+([^:]+):\s*"([^"]+)"/gi)]
  promptPairs.forEach((m) => {
    combat_prompts.push({
      trigger: `On ${clean(m[1])}`,
      text: clean(m[2]),
    })
  })

  return {
    slug: slugify(baseName),
    name: baseName,
    source: 'Imported (compact beat backfill)',
    creature_type: 'Unknown',
    size: 'Medium',
    alignment: 'Unknown',
    cr: String(cr),
    proficiency_bonus,
    ac,
    ac_note: /shared\s+pool/i.test(raw) ? 'Imported compact format' : '',
    max_hp: hp,
    hit_dice: /shared\s+pool/i.test(raw) ? 'shared pool' : '',
    speed,
    ability_scores: abilityScores,
    saving_throws: [],
    skills: [],
    resistances,
    immunities: { damage: [], condition: conditionImmunities },
    vulnerabilities: [],
    senses: '',
    languages: '',
    traits: [
      ...(linkedDecay ? [{ name: 'Linked Decay', desc: linkedDecay }] : []),
      ...(unfinishedContainment ? [{ name: 'Unfinished Containment', desc: unfinishedContainment }] : []),
      ...(fracturedConsciousness ? [{ name: 'Fractured Consciousness', desc: fracturedConsciousness }] : []),
    ],
    actions,
    bonus_actions: [],
    reactions: [],
    legendary_actions: [],
    combat_prompts,
    dm_notes: [`Recovered from compact beat text: ${raw.slice(0, 300)}`],
    tags: ['compact-backfill'],
    updated_at: new Date().toISOString(),
  }
}

async function request(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${init.method || 'GET'} ${path} failed: ${body}`)
  }
  return res.json()
}

async function main() {
  const beats = await request('/rest/v1/beats?select=id,title,content,dm_notes,stat_block_id,type&type=eq.combat')
  const candidates = []
  for (const beat of beats || []) {
    const combined = clean(`${beat.title || ''}\n${beat.content || ''}\n${beat.dm_notes || ''}`)
    const parsed = parseCompactStatblock(combined, beat.title)
    if (parsed) candidates.push({ beat, parsed })
  }

  console.log(`Found ${candidates.length} compact candidates out of ${beats.length} combat beats.`)
  if (dryRun) {
    candidates.slice(0, 20).forEach(({ beat, parsed }) => {
      console.log(`[DRY] beat=${beat.id} title="${beat.title}" -> slug=${parsed.slug}`)
    })
    return
  }

  let linked = 0
  for (const { beat, parsed } of candidates) {
    let statBlockId = beat.stat_block_id || null
    if (!statBlockId) {
      const existing = await request(`/rest/v1/stat_blocks?select=id,slug&slug=eq.${encodeURIComponent(parsed.slug)}&limit=1`)
      statBlockId = existing?.[0]?.id || null
    }
    if (!statBlockId) {
      const created = await request('/rest/v1/stat_blocks', {
        method: 'POST',
        body: JSON.stringify([parsed]),
      })
      statBlockId = created?.[0]?.id || null
    }
    if (!statBlockId) continue
    await request(`/rest/v1/stat_blocks?id=eq.${encodeURIComponent(statBlockId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...parsed, updated_at: new Date().toISOString() }),
    })

    await request(`/rest/v1/beats?id=eq.${encodeURIComponent(beat.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ stat_block_id: statBlockId, updated_at: new Date().toISOString() }),
    })
    linked += 1
    console.log(`[APPLY] beat=${beat.id} linked stat_block=${statBlockId} (${parsed.slug})`)
  }

  console.log(`Completed: linked ${linked} beats.`)
}

main().catch((e) => {
  console.error(e?.stack || e?.message || e)
  process.exit(1)
})
