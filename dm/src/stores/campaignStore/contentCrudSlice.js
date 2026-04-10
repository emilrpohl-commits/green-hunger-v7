import { supabase } from '@shared/lib/supabase.js'

export function createContentCrudSlice(set, get) {
  return {
    saveScene: async (scene) => {
      const { beats: _b, branches: _br, ...rest } = scene
      const payload = { ...rest, updated_at: new Date().toISOString() }
      let result
      if (scene.id) {
        result = await supabase.from('scenes').update(payload).eq('id', scene.id).select().single()
      } else {
        result = await supabase.from('scenes').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }

      await get().refreshSession(result.data.session_id)
      return { data: result.data }
    },

    deleteScene: async (id) => {
      const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', id).single()
      const { error } = await supabase.from('scenes').delete().eq('id', id)
      if (error) return { error: error.message }
      if (scene) await get().refreshSession(scene.session_id)
      return { success: true }
    },

    saveBeat: async (beat) => {
      const payload = { ...beat, updated_at: new Date().toISOString() }
      let result
      if (beat.id) {
        result = await supabase.from('beats').update(payload).eq('id', beat.id).select().single()
      } else {
        result = await supabase.from('beats').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }

      const { data: sceneRow } = await supabase.from('scenes').select('session_id').eq('id', result.data.scene_id).single()
      if (sceneRow) await get().refreshSession(sceneRow.session_id)
      return { data: result.data }
    },

    deleteBeat: async (id) => {
      const { data: beat } = await supabase.from('beats').select('scene_id').eq('id', id).single()
      const { error } = await supabase.from('beats').delete().eq('id', id)
      if (error) return { error: error.message }
      if (beat) {
        const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', beat.scene_id).single()
        if (scene) await get().refreshSession(scene.session_id)
      }
      return { success: true }
    },

    reorderBeats: async (sceneId, orderedIds) => {
      const updates = orderedIds.map((id, i) =>
        supabase.from('beats').update({ order: i + 1 }).eq('id', id)
      )
      await Promise.all(updates)
      const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', sceneId).single()
      if (scene) await get().refreshSession(scene.session_id)
    },

    saveBranch: async (branch) => {
      const payload = { ...branch }
      let result
      if (branch.id) {
        result = await supabase.from('scene_branches').update(payload).eq('id', branch.id).select().single()
      } else {
        result = await supabase.from('scene_branches').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }

      const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', result.data.scene_id).single()
      if (scene) await get().refreshSession(scene.session_id)
      return { data: result.data }
    },

    deleteBranch: async (id) => {
      const { data: branch } = await supabase.from('scene_branches').select('scene_id').eq('id', id).single()
      const { error } = await supabase.from('scene_branches').delete().eq('id', id)
      if (error) return { error: error.message }
      if (branch) {
        const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', branch.scene_id).single()
        if (scene) await get().refreshSession(scene.session_id)
      }
      return { success: true }
    },

    deleteSession: async (id) => {
      const { error } = await supabase
        .from('sessions')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        return { error: `Archive failed: ${error.message}. Ensure archived_at column exists on sessions.` }
      }
      const removed = get().sessions.find(s => s.id === id)
      set({
        sessions: get().sessions.filter(s => s.id !== id),
        archivedSessions: removed ? [{ ...removed, archived_at: new Date().toISOString() }, ...get().archivedSessions] : get().archivedSessions,
      })
      return { success: true }
    },

    restoreSession: async (id) => {
      const { error } = await supabase
        .from('sessions')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) return { error: error.message }
      await get().loadCampaign()
      return { success: true }
    },

    saveSession: async (session) => {
      const payload = { ...session, updated_at: new Date().toISOString() }
      let result
      if (session.id) {
        result = await supabase.from('sessions').update(payload).eq('id', session.id).select().single()
      } else {
        result = await supabase.from('sessions').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }
      await get().refreshSession(result.data.id)
      return { data: result.data }
    },
  }
}
