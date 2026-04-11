/**
 * Normalizes DB session → DM runtime shape (MainPanel / LeftRail).
 * Canonical beat type is `combat` (matches DB and BEAT_TYPES).
 */

export function normalizeSceneForRuntime(scene) {
  return {
    ...scene,
    estimatedTime: scene.estimated_time || scene.estimatedTime,
    dmNote: scene.dm_notes || scene.dmNote,
    beats: (scene.beats || []).map(b => ({
      ...b,
      dmNote: b.dm_notes || b.dmNote,
      statBlockId: b.stat_block_id || b.statBlockId,
      inlineStatBlock: b.inline_stat_block || b.inlineStatBlock || null,
      type: b.type === 'combat trigger' ? 'combat' : (b.type || 'narrative'),
    })).sort((a, b) => (a.order || 0) - (b.order || 0)),
    branches: (scene.branches || []).map(br => ({
      ...br,
      targetId: br.target_slug || br.target_scene_id || br.targetId,
    })).sort((a, b) => (a.order || 0) - (b.order || 0)),
  }
}

export function normalizeSessionsFromDb(dbSessions) {
  if (!dbSessions || dbSessions.length === 0) return []
  return dbSessions
    .map(dbSession => ({
      id: dbSession.id,
      title: dbSession.title,
      subtitle: dbSession.subtitle,
      session_number: dbSession.session_number || dbSession.order,
      scenes: (dbSession.scenes || [])
        .map(normalizeSceneForRuntime)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    }))
    .sort((a, b) => (a.session_number || 0) - (b.session_number || 0))
}

/**
 * Player SceneDisplay: slim scenes (no DM notes). Subtitle prefers player_description.
 * Phase 2F: optional beats with player_text only (never dm_notes).
 */
export function toPlayerNarrativeSession(dbSession) {
  if (!dbSession) return null
  return {
    id: dbSession.id,
    title: dbSession.title,
    subtitle: dbSession.subtitle || '',
    scenes: (dbSession.scenes || []).map(s => ({
      id: s.id,
      order: s.order || 0,
      title: s.title,
      subtitle: s.player_description || s.subtitle || s.summary || '',
      image_url: s.image_url || '',
      beats: (s.beats || [])
        .map(b => ({
          id: b.id,
          order: b.order || 0,
          title: b.title || '',
          type: b.type,
          playerText: String(b.player_text || b.playerText || '').trim(),
          flavour_text: String(b.flavour_text || b.flavourText || '').trim(),
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    })).sort((a, b) => a.order - b.order),
  }
}
