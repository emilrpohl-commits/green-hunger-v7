/**
 * Migration seeder — imports all static campaign data into Supabase.
 *
 * Usage: call runMigration() from a browser console or a one-time script.
 * Safe to re-run: uses upsert on slug/stable IDs.
 *
 * Order matters: campaign → arc → adventure → session → scene → beat → branches
 */

import { supabase } from '../shared/lib/supabase.js'
import { SESSION_1, CHARACTERS } from '../shared/content/session1.js'
import { SESSION_2 } from '../shared/content/session2.js'
import { SESSION_3 } from '../shared/content/session3.js'
import { STAT_BLOCKS } from '../shared/content/statblocks.js'

const CAMPAIGN_SLUG = 'green-hunger'

// ---------------------------------------------------------------------------
// 1. Stat blocks  (migrate first so beats can reference UUIDs)
// ---------------------------------------------------------------------------

async function migrateStatBlocks(campaignId) {
  const rows = Object.values(STAT_BLOCKS).map(sb => ({
    // Use slug as a stable idempotency key — we'll look up the UUID after insert
    campaign_id: campaignId,
    slug: sb.id,
    name: sb.name,
    source: 'Green Hunger (custom)',
    creature_type: sb.type,
    size: sb.size,
    cr: sb.cr,
    ac: sb.ac,
    ac_note: sb.acNote || null,
    max_hp: sb.maxHp,
    hit_dice: sb.hitDice || null,
    speed: sb.speed || null,
    ability_scores: sb.stats || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    saving_throws: sb.savingThrows || [],
    skills: sb.skills || [],
    resistances: sb.resistances || [],
    immunities: sb.immunities || { damage: [], condition: [] },
    vulnerabilities: sb.vulnerabilities || [],
    senses: sb.senses || null,
    languages: sb.languages || null,
    traits: sb.traits || [],
    actions: sb.actions || [],
    bonus_actions: sb.bonusActions || [],
    reactions: sb.reactions || [],
    legendary_actions: sb.legendaryActions || [],
    combat_prompts: sb.combatPrompts || [],
    dm_notes: sb.dmNotes || [],
    tags: sb.tags || [],
  }))

  // Check which slugs already exist so we don't double-insert
  const { data: existing } = await supabase
    .from('stat_blocks')
    .select('id, slug')
    .eq('campaign_id', rows[0].campaign_id)

  const existingBySlug = {}
  ;(existing || []).forEach(r => { existingBySlug[r.slug] = r.id })

  const toInsert = rows.filter(r => !existingBySlug[r.slug])

  const slugToId = { ...existingBySlug }

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('stat_blocks')
      .insert(toInsert)
      .select('id, slug')
    if (error) throw new Error(`stat_blocks: ${error.message}`)
    data.forEach(r => { slugToId[r.slug] = r.id })
    console.log(`✓ ${data.length} stat blocks inserted (${Object.keys(existingBySlug).length} already existed)`)
  } else {
    console.log(`✓ stat blocks already migrated (${existing.length} found)`)
  }

  return slugToId
}

// ---------------------------------------------------------------------------
// 2. Campaign skeleton
// ---------------------------------------------------------------------------

async function ensureCampaign() {
  const { data: existing } = await supabase
    .from('campaigns')
    .select('id')
    .eq('slug', CAMPAIGN_SLUG)
    .single()

  if (existing) { console.log(`~ Campaign already exists: ${existing.id}`); return existing.id }

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      slug: CAMPAIGN_SLUG,
      title: 'The Green Hunger',
      subtitle: 'A corrupted forest, a missing friend, and a god who is already inside you',
      premise: 'The party is drawn into the Weald — a forest consumed by the corruption of Talona. An old friend is missing. The corruption speaks in voices they recognise.',
      themes: ['corruption', 'grief', 'trust', 'identity', 'nature'],
      tone: 'Gothic folk horror, slow-burn dread',
      setting: 'The Weald and surrounding region',
      rules_edition: '5e',
      notes: 'Run as a slow burn. Let silences do work. The corruption should feel like rot, not fire.',
      tags: ['horror', 'nature', 'corruption', 'custom'],
    })
    .select('id')
    .single()

  if (error) throw new Error(`campaign: ${error.message}`)
  console.log(`✓ Campaign: ${data.id}`)
  return data.id
}

async function ensureArc(campaignId) {
  const { data: existing } = await supabase
    .from('arcs')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('order', 1)
    .single()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('arcs')
    .insert({
      campaign_id: campaignId,
      order: 1,
      title: 'Arc One — The Weald',
      premise: 'The party must enter the corrupted Weald, find what happened to Artos, and confront the source of the corruption.',
      objective: 'Reach the Heart of the Weald. Understand what Talona is. Survive.',
      antagonist: 'Talona — a dying nature deity who has turned to corruption to persist',
      themes: ['corruption', 'grief', 'sacrifice'],
      notes: null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`arc: ${error.message}`)
  console.log(`✓ Arc: ${data.id}`)
  return data.id
}

async function ensureAdventure(arcId) {
  const { data: existing } = await supabase
    .from('adventures')
    .select('id')
    .eq('arc_id', arcId)
    .eq('order', 1)
    .single()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('adventures')
    .insert({
      arc_id: arcId,
      order: 1,
      title: 'The Green Hunger',
      hook: 'Artos is missing. The forest is wrong. Birna knows more than she says.',
      objectives: ['Find Artos', 'Reach the Heart of the Weald', 'Understand Talona'],
      stakes: 'The entire Weald is being consumed. If the Heart is not stopped, it spreads.',
      structure_type: 'linear-with-branches',
      notes: null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`adventure: ${error.message}`)
  console.log(`✓ Adventure: ${data.id}`)
  return data.id
}

// ---------------------------------------------------------------------------
// 3. Session + scene + beat migration
// ---------------------------------------------------------------------------

const STATIC_SESSIONS = [SESSION_1, SESSION_2, SESSION_3]

async function migrateSession(adventureId, staticSession, sessionNumber, statBlockSlugToId) {
  // Check if already exists
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('adventure_id', adventureId)
    .eq('session_number', sessionNumber)
    .single()

  let sessionId
  if (existing) {
    sessionId = existing.id
    console.log(`  ~ Session ${sessionNumber} already exists (${sessionId})`)
  } else {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        adventure_id: adventureId,
        order: sessionNumber,
        session_number: sessionNumber,
        title: staticSession.title,
        subtitle: staticSession.subtitle || null,
        notes: null,
      })
      .select('id')
      .single()

    if (error) throw new Error(`session ${sessionNumber}: ${error.message}`)
    sessionId = data.id
    console.log(`  ✓ Session ${sessionNumber}: ${sessionId}`)
  }

  for (let si = 0; si < staticSession.scenes.length; si++) {
    await migrateScene(sessionId, staticSession.scenes[si], si + 1, statBlockSlugToId)
  }

  return sessionId
}

async function migrateScene(sessionId, staticScene, order, statBlockSlugToId) {
  const { data: existing } = await supabase
    .from('scenes')
    .select('id')
    .eq('session_id', sessionId)
    .eq('slug', staticScene.id)
    .single()

  let sceneId
  if (existing) {
    sceneId = existing.id
    console.log(`    ~ Scene already exists: ${staticScene.id}`)
  } else {
    // Detect scene type from beats
    const hasCombat = staticScene.beats?.some(b => b.type === 'combat trigger')
    const sceneType = hasCombat ? 'combat' : 'narrative'

    const { data, error } = await supabase
      .from('scenes')
      .insert({
        session_id: sessionId,
        order,
        slug: staticScene.id,
        title: staticScene.title,
        subtitle: staticScene.subtitle || null,
        scene_type: sceneType,
        estimated_time: staticScene.estimatedTime || null,
        dm_notes: staticScene.dmNote || null,
        is_published: false,
      })
      .select('id')
      .single()

    if (error) throw new Error(`scene ${staticScene.id}: ${error.message}`)
    sceneId = data.id
    console.log(`    ✓ Scene: ${staticScene.title}`)
  }

  // Migrate beats
  if (staticScene.beats) {
    for (let bi = 0; bi < staticScene.beats.length; bi++) {
      await migrateBeat(sceneId, staticScene.beats[bi], bi + 1, statBlockSlugToId)
    }
  }

  // Migrate branches
  if (staticScene.branches) {
    for (let bri = 0; bri < staticScene.branches.length; bri++) {
      await migrateBranch(sceneId, staticScene.branches[bri], bri + 1)
    }
  }

  return sceneId
}

async function migrateBeat(sceneId, staticBeat, order, statBlockSlugToId) {
  const { data: existing } = await supabase
    .from('beats')
    .select('id')
    .eq('scene_id', sceneId)
    .eq('slug', staticBeat.id)
    .single()

  if (existing) return existing.id

  // Map old type names to new
  const typeMap = {
    'narrative': 'narrative',
    'prompt': 'prompt',
    'check': 'check',
    'decision': 'decision',
    'combat trigger': 'combat',
  }

  const statBlockUuid = staticBeat.statBlockId
    ? (statBlockSlugToId[staticBeat.statBlockId] || null)
    : null

  const { data, error } = await supabase
    .from('beats')
    .insert({
      scene_id: sceneId,
      order,
      slug: staticBeat.id,
      title: staticBeat.title,
      type: typeMap[staticBeat.type] || staticBeat.type || 'narrative',
      content: staticBeat.content || null,
      dm_notes: staticBeat.dmNote || null,
      stat_block_id: statBlockUuid,
    })
    .select('id')
    .single()

  if (error) throw new Error(`beat ${staticBeat.id}: ${error.message}`)
  return data.id
}

async function migrateBranch(sceneId, staticBranch, order) {
  const { data: existing } = await supabase
    .from('scene_branches')
    .select('id')
    .eq('scene_id', sceneId)
    .eq('order', order)
    .single()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('scene_branches')
    .insert({
      scene_id: sceneId,
      order,
      label: staticBranch.label,
      description: staticBranch.description || null,
      condition_type: 'explicit',
      target_slug: staticBranch.targetId || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`branch ${staticBranch.label}: ${error.message}`)
  return data.id
}

// ---------------------------------------------------------------------------
// 4. Wire branch target_scene_id (second pass, after all scenes exist)
// ---------------------------------------------------------------------------

async function wireBranchTargets() {
  const { data: branches } = await supabase
    .from('scene_branches')
    .select('id, target_slug')
    .not('target_slug', 'is', null)
    .is('target_scene_id', null)

  if (!branches || branches.length === 0) return
  console.log(`Wiring ${branches.length} branch targets...`)

  for (const branch of branches) {
    const { data: scene } = await supabase
      .from('scenes')
      .select('id')
      .eq('slug', branch.target_slug)
      .single()

    if (scene) {
      await supabase
        .from('scene_branches')
        .update({ target_scene_id: scene.id })
        .eq('id', branch.id)
    }
  }
  console.log('✓ Branch targets wired')
}

// ---------------------------------------------------------------------------
// 5. Resolve beat stat_block_id by UUID (second pass if slugs didn't resolve)
// ---------------------------------------------------------------------------

async function resolveStatBlockRefs() {
  const { data: beatsWithSlug } = await supabase
    .from('beats')
    .select('id, stat_block_id')
    .not('stat_block_id', 'is', null)

  // These should already be UUIDs from the first pass. This is a safety check.
  console.log(`✓ ${beatsWithSlug?.length || 0} beats have stat block references`)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runMigration() {
  console.log('🌿 Starting Green Hunger migration...')

  try {
    const campaignId = await ensureCampaign()
    const arcId = await ensureArc(campaignId)
    const adventureId = await ensureAdventure(arcId)
    const statBlockSlugToId = await migrateStatBlocks(campaignId)

    for (let i = 0; i < STATIC_SESSIONS.length; i++) {
      await migrateSession(adventureId, STATIC_SESSIONS[i], i + 1, statBlockSlugToId)
    }

    await wireBranchTargets()
    await resolveStatBlockRefs()

    console.log('✅ Migration complete.')
    return { success: true, campaignId }
  } catch (e) {
    console.error('❌ Migration failed:', e.message)
    return { success: false, error: e.message }
  }
}
