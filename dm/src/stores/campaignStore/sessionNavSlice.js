import { supabase } from '@shared/lib/supabase.js'
import { loadSessionContentTree } from '@shared/lib/sessionTreeLoader.js'

/**
 * Session tree navigation and CRUD (split from dataSlice for maintainability).
 */
export function createSessionNavSlice(set, get) {
  return {
    loadSessionContent: async (session) => loadSessionContentTree(supabase, session),

    refreshSession: async (sessionId) => {
      const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (!session) return
      const refreshed = await get().loadSessionContent(session)
      const { sessions } = get()
      set({ sessions: sessions.map(s => s.id === sessionId ? refreshed : s) })
    },

    getSceneMap: () => {
      const map = {}
      get().sessions.forEach(session => {
        session.scenes?.forEach(scene => {
          map[scene.id] = scene
          if (scene.slug) map[scene.slug] = scene
        })
      })
      return map
    },

    getAllScenes: () => get().sessions.flatMap(s => s.scenes || []),

    createSession: async (title) => {
      const { adventureId, sessions } = get()
      if (!adventureId) return { error: 'No adventure loaded — run migration first' }

      const nextNumber = (sessions.length > 0
        ? Math.max(...sessions.map(s => s.session_number || s.order || 0)) + 1
        : 1)

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          adventure_id: adventureId,
          order: nextNumber,
          session_number: nextNumber,
          title: title || `Session ${nextNumber}`,
        })
        .select()
        .single()

      if (error) return { error: error.message }

      const refreshed = await get().loadSessionContent(data)
      set({ sessions: [...get().sessions, refreshed] })
      return { data: refreshed }
    },
  }
}
