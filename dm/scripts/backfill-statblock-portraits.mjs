#!/usr/bin/env node
/**
 * Backfill portrait_url on campaign stat blocks copied from reference monsters.
 *
 * Usage:
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/backfill-statblock-portraits.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { srdMonsterToStatBlockDraft } from '../../shared/lib/reference/srdMonsterToStatBlock.js'
import { DEFAULT_STATBLOCK_PORTRAIT_URL } from '../../shared/lib/portraitDefaults.js'

const url = process.env.SUPABASE_URL || 'https://bounfmozhwltyalocduv.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_KEY
  || 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

const sb = createClient(url, key)

async function main() {
  const { data: statBlocks, error: statErr } = await sb
    .from('stat_blocks')
    .select('id,name,cloned_from_reference_id,portrait_url')
    .is('portrait_url', null)
    .not('cloned_from_reference_id', 'is', null)

  if (statErr) throw new Error(`stat_blocks query failed: ${statErr.message}`)
  const candidates = statBlocks || []
  if (candidates.length === 0) {
    console.log('No stat blocks need portrait backfill.')
    return
  }

  const refIds = Array.from(new Set(candidates.map((s) => s.cloned_from_reference_id).filter(Boolean)))
  const { data: refs, error: refErr } = await sb
    .from('reference_monsters')
    .select('id,raw_json')
    .in('id', refIds)
  if (refErr) throw new Error(`reference_monsters query failed: ${refErr.message}`)

  const refMap = new Map((refs || []).map((r) => [r.id, r]))
  const updates = []
  let fallbackCount = 0
  for (const row of candidates) {
    const ref = refMap.get(row.cloned_from_reference_id)
    if (!ref?.raw_json || typeof ref.raw_json !== 'object') {
      updates.push({ id: row.id, portrait_url: DEFAULT_STATBLOCK_PORTRAIT_URL })
      fallbackCount += 1
      continue
    }
    const draft = srdMonsterToStatBlockDraft(ref.raw_json)
    updates.push({ id: row.id, portrait_url: draft.portrait_url || DEFAULT_STATBLOCK_PORTRAIT_URL })
    if (!draft.portrait_url || draft.portrait_url === DEFAULT_STATBLOCK_PORTRAIT_URL) fallbackCount += 1
  }

  if (updates.length === 0) {
    console.log(`No resolvable portrait_url values found for ${candidates.length} candidates.`)
    return
  }

  let updated = 0
  for (const u of updates) {
    const { error } = await sb
      .from('stat_blocks')
      .update({ portrait_url: u.portrait_url, updated_at: new Date().toISOString() })
      .eq('id', u.id)
    if (error) {
      console.warn(`Failed update for ${u.id}: ${error.message}`)
      continue
    }
    updated += 1
  }

  console.log(`Backfill complete: ${updated}/${updates.length} rows updated (${candidates.length} candidates checked, ${fallbackCount} used placeholder).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

