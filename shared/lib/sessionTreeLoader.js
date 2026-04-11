import { filterValidBeatRows } from './validation/storeBoundaries.js'

/**
 * Load scenes, beats, branches for one session row (same shape as campaignStore).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 */
function sortByOrder(rows) {
  return [...(rows || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function loadSessionContentTree(client, session) {
  const { data: scenes, error: sce } = await client
    .from('scenes')
    .select('*')
    .eq('session_id', session.id)
    .order('order')
  if (sce) {
    console.warn('scenes error:', sce.message)
    return { ...session, scenes: [] }
  }

  const sceneList = scenes || []
  if (sceneList.length === 0) {
    return { ...session, scenes: [] }
  }

  const sceneIds = sceneList.map((s) => s.id)
  const [beatsRes, branchesRes] = await Promise.all([
    client.from('beats').select('*').in('scene_id', sceneIds),
    client.from('scene_branches').select('*').in('scene_id', sceneIds),
  ])
  if (beatsRes.error) {
    console.warn('beats error:', beatsRes.error.message)
  }
  if (branchesRes.error) {
    console.warn('scene_branches error:', branchesRes.error.message)
  }

  const beatsByScene = new Map()
  for (const row of beatsRes.data || []) {
    const sid = row.scene_id
    if (!beatsByScene.has(sid)) beatsByScene.set(sid, [])
    beatsByScene.get(sid).push(row)
  }
  const branchesByScene = new Map()
  for (const row of branchesRes.data || []) {
    const sid = row.scene_id
    if (!branchesByScene.has(sid)) branchesByScene.set(sid, [])
    branchesByScene.get(sid).push(row)
  }

  const scenesWithContent = sceneList.map((scene) => ({
    ...scene,
    beats: filterValidBeatRows(sortByOrder(beatsByScene.get(scene.id))),
    branches: sortByOrder(branchesByScene.get(scene.id)),
  }))

  return { ...session, scenes: scenesWithContent }
}

/**
 * All non-archived sessions (deduped by session_number), with nested content.
 * Mirrors campaignStore session loading without requiring a campaign row.
 */
/**
 * Load one session by UUID with scenes/beats (Phase 2B: player hydrates only active_session_uuid).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} sessionUuid
 */
export async function fetchSessionWithContentById(client, sessionUuid) {
  if (!sessionUuid) return null
  const { data: session, error } = await client
    .from('sessions')
    .select('*')
    .eq('id', sessionUuid)
    .maybeSingle()
  if (error || !session) return null
  if (session.archived_at) return null
  return loadSessionContentTree(client, session)
}

export async function fetchActiveSessionsWithContent(client) {
  const { data: sessionsRaw, error: se } = await client
    .from('sessions')
    .select('*')
    .order('session_number, order, created_at')
  if (se) throw new Error(`sessions: ${se.message}`)

  const seen = new Set()
  const sessions = (sessionsRaw || []).filter((s) => {
    const key = s.session_number ?? s.order
    if (s.archived_at) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return Promise.all(sessions.map((s) => loadSessionContentTree(client, s)))
}
