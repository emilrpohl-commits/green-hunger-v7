#!/usr/bin/env node
/**
 * Upsert one stat block from a JSON file (must include slug + name).
 *
 *   node tools/importStatBlockJson.mjs path/to/block.json --dry-run
 *   node tools/importStatBlockJson.mjs path/to/block.json --write-db
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')))
const dryRun = flags.has('--dry-run')
const writeDb = flags.has('--write-db') && !dryRun

async function main() {
  const filePath = args[0] ? path.resolve(process.cwd(), args[0]) : null
  if (!filePath) {
    console.error('Usage: node tools/importStatBlockJson.mjs <file.json> [--dry-run|--write-db]')
    process.exit(1)
  }
  const raw = JSON.parse(await fs.readFile(filePath, 'utf8'))
  if (!raw.slug || !raw.name) {
    console.error('JSON must include slug and name')
    process.exit(1)
  }
  const row = {
    slug: raw.slug,
    name: raw.name,
    campaign_id: raw.campaign_id ?? null,
    source: raw.source ?? null,
    creature_type: raw.creature_type ?? null,
    size: raw.size ?? 'Medium',
    alignment: raw.alignment ?? null,
    cr: raw.cr ?? null,
    proficiency_bonus: raw.proficiency_bonus ?? null,
    ac: raw.ac ?? 10,
    ac_note: raw.ac_note ?? null,
    max_hp: raw.max_hp ?? raw.maxHp ?? 10,
    hit_dice: raw.hit_dice ?? null,
    speed: raw.speed ?? '30 ft.',
    ability_scores: raw.ability_scores || {},
    saving_throws: raw.saving_throws || [],
    skills: raw.skills || [],
    resistances: raw.resistances || [],
    immunities: raw.immunities || { damage: [], condition: [] },
    vulnerabilities: raw.vulnerabilities || [],
    senses: raw.senses ?? null,
    languages: raw.languages ?? null,
    traits: raw.traits || [],
    actions: raw.actions || [],
    bonus_actions: raw.bonus_actions || [],
    reactions: raw.reactions || [],
    legendary_actions: raw.legendary_actions || [],
    lair_actions: raw.lair_actions || [],
    spellcasting: raw.spellcasting || {},
    combat_prompts: raw.combat_prompts || [],
    dm_notes: raw.dm_notes || [],
    tags: raw.tags || [],
    portrait_url: raw.portrait_url ?? null,
    token_url: raw.token_url ?? null,
    updated_at: new Date().toISOString(),
  }

  if (dryRun) {
    console.log(JSON.stringify(row, null, 2))
    return
  }
  if (!writeDb) {
    console.log('Add --write-db to upsert to Supabase.')
    return
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  const find = await fetch(
    `${SUPABASE_URL}/rest/v1/stat_blocks?slug=eq.${encodeURIComponent(row.slug)}&select=id&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const existing = find.ok ? await find.json() : []
  const url = `${SUPABASE_URL}/rest/v1/stat_blocks`
  let res
  if (existing?.[0]?.id) {
    res = await fetch(`${url}?id=eq.${existing[0].id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(row),
    })
  } else {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([row]),
    })
  }
  if (!res.ok) {
    console.error(await res.text())
    process.exit(1)
  }
  const data = await res.json()
  console.log('Saved stat_blocks:', Array.isArray(data) ? data[0]?.slug : data)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
