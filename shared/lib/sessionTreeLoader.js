import { filterValidBeatRows } from './validation/storeBoundaries.js'

/**
 * Load scenes, beats, branches for one session row (same shape as campaignStore).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 */
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

  const scenesWithContent = await Promise.all(
    (scenes || []).map(async (scene) => {
      const [beatsRes, branchesRes] = await Promise.all([
        client.from('beats').select('*').eq('scene_id', scene.id).order('order'),
        client.from('scene_branches').select('*').eq('scene_id', scene.id).order('order'),
      ])
      return {
        ...scene,
        beats: filterValidBeatRows(beatsRes.data || []),
        branches: branchesRes.data || [],
      }
    })
  )

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
