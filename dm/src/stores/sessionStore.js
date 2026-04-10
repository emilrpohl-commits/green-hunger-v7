import { create } from 'zustand'
import { supabase } from '@shared/lib/supabase.js'
import { CHARACTERS } from '@shared/content/session1.js'
import { fetchPartyRosterForCombat } from '@shared/lib/partyRoster.js'
import { getSessionRunId, getRulesetContext } from '@shared/lib/runtimeContext.js'
import { normalizeSessionsFromDb } from '@shared/lib/sessionContentNormalize.js'

export const useSessionStore = create((set, get) => ({
  // Session state
  sessionRunId: getSessionRunId(),
  sessions: [],
  activeSessionId: null,
  session: null,
  currentSceneIndex: 0,
  currentBeatIndex: 0,
  completedBeats: new Set(),

  // Characters
  characters: CHARACTERS,

  // Sync status
  syncStatus: 'idle', // idle | syncing | synced | error

  // Derived helpers
  getCurrentScene: () => {
    const { session, currentSceneIndex } = get()
    if (!session) return null
    return session.scenes[currentSceneIndex] || null
  },

  getCurrentBeat: () => {
    const { session, currentSceneIndex, currentBeatIndex } = get()
    if (!session) return null
    const scene = session.scenes[currentSceneIndex]
    return scene?.beats[currentBeatIndex] || null
  },

  // Switch session
  switchSession: async (sessionId) => {
    const { sessions } = get()
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    set({
      activeSessionId: sessionId,
      session,
      currentSceneIndex: 0,
      currentBeatIndex: 0,
      completedBeats: new Set()
    })
    await get().syncSessionState()
  },

  // Navigation
  nextBeat: async () => {
    const { session, currentSceneIndex, currentBeatIndex, completedBeats, getCurrentBeat } = get()
    if (!session) return
    const currentBeat = getCurrentBeat()
    if (currentBeat) {
      completedBeats.add(currentBeat.id)
    }

    const scene = session.scenes[currentSceneIndex]
    if (currentBeatIndex < scene.beats.length - 1) {
      set({ currentBeatIndex: currentBeatIndex + 1, completedBeats: new Set(completedBeats) })
    } else if (currentSceneIndex < session.scenes.length - 1) {
      set({
        currentSceneIndex: currentSceneIndex + 1,
        currentBeatIndex: 0,
        completedBeats: new Set(completedBeats)
      })
    }
    await get().syncSessionState()
  },

  prevBeat: async () => {
    const { session, currentSceneIndex, currentBeatIndex } = get()
    if (!session) return
    if (currentBeatIndex > 0) {
      set({ currentBeatIndex: currentBeatIndex - 1 })
    } else if (currentSceneIndex > 0) {
      const prevScene = get().session.scenes[currentSceneIndex - 1]
      set({
        currentSceneIndex: currentSceneIndex - 1,
        currentBeatIndex: prevScene.beats.length - 1
      })
    }
    await get().syncSessionState()
  },

  jumpToScene: async (sceneIndex) => {
    set({ currentSceneIndex: sceneIndex, currentBeatIndex: 0 })
    await get().syncSessionState()
  },

  jumpToBeat: async (beatIndex) => {
    set({ currentBeatIndex: beatIndex })
    await get().syncSessionState()
  },

  jumpToSceneById: async (sceneId) => {
    const { session } = get()
    if (!session) return
    // Match by UUID id OR by slug (branches from DB use target_slug)
    const idx = session.scenes.findIndex(s => s.id === sceneId || s.slug === sceneId)
    if (idx === -1) return
    set({ currentSceneIndex: idx, currentBeatIndex: 0 })
    await get().syncSessionState()
  },

  // Sync content from campaign store (DB) into run mode sessions.
  // Normalises DB field names to match what MainPanel/LeftRail expect.
  // Replaces sessions array entirely from DB — no static fallback.
  syncContentFromDb: (dbSessions) => {
    if (!dbSessions || dbSessions.length === 0) {
      set({ sessions: [], session: null })
      return
    }

    const normalized = normalizeSessionsFromDb(dbSessions)

    const { activeSessionId } = get()
    const activeSession =
      normalized.find(s => s.id === activeSessionId) || normalized[0] || null

    set({
      sessions: normalized,
      session: activeSession,
      activeSessionId: activeSession?.id || null,
    })
  },

  // Character updates
  updateCharacterHp: async (characterId, newHp) => {
    const { characters } = get()
    const updated = characters.map(c =>
      c.id === characterId ? { ...c, curHp: Math.max(0, Math.min(c.maxHp, newHp)) } : c
    )
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  updateCharacterTempHp: async (characterId, tempHp) => {
    const { characters } = get()
    const updated = characters.map(c =>
      c.id === characterId ? { ...c, tempHp: Math.max(0, tempHp) } : c
    )
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  toggleConcentration: async (characterId) => {
    const { characters } = get()
    const updated = characters.map(c =>
      c.id === characterId ? { ...c, concentration: !c.concentration } : c
    )
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  useSpellSlot: async (characterId, level) => {
    const { characters } = get()
    const updated = characters.map(c => {
      if (c.id !== characterId) return c
      const slots = { ...c.spellSlots }
      if (slots[level] && slots[level].used < slots[level].max) {
        slots[level] = { ...slots[level], used: slots[level].used + 1 }
      }
      return { ...c, spellSlots: slots }
    })
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  restoreSpellSlot: async (characterId, level) => {
    const { characters } = get()
    const updated = characters.map(c => {
      if (c.id !== characterId) return c
      const slots = { ...c.spellSlots }
      if (slots[level] && slots[level].used > 0) {
        slots[level] = { ...slots[level], used: slots[level].used - 1 }
      }
      return { ...c, spellSlots: slots }
    })
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  markDeathSave: async (characterId, type, value) => {
    const { characters } = get()
    const updated = characters.map(c => {
      if (c.id !== characterId) return c
      const saves = { ...c.deathSaves, [type]: Math.min(3, c.deathSaves[type] + (value ? 1 : -1)) }
      return { ...c, deathSaves: saves }
    })
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  // Supabase sync
  syncSessionState: async () => {
    const { currentSceneIndex, currentBeatIndex, sessionRunId, activeSessionId } = get()
    const rulesetContext = getRulesetContext()
    set({ syncStatus: 'syncing' })
    try {
      await supabase.from('session_state').upsert({
        id: sessionRunId,
        session_run_id: sessionRunId,
        active_session_uuid: activeSessionId,
        active_ruleset: rulesetContext.active_ruleset,
        fallback_allowed: rulesetContext.fallback_allowed,
        source_of_truth: rulesetContext.source_of_truth,
        current_scene_index: currentSceneIndex,
        current_beat_index: currentBeatIndex,
        updated_at: new Date().toISOString()
      })
      set({ syncStatus: 'synced' })
    } catch (e) {
      set({ syncStatus: 'error' })
    }
  },

  syncCharacterState: async (characterId) => {
    const { characters } = get()
    const char = characters.find(c => c.id === characterId)
    if (!char) return
    try {
      await supabase.from('character_states').upsert({
        id: characterId,
        cur_hp: char.curHp,
        temp_hp: char.tempHp,
        concentration: char.concentration,
        spell_slots: char.spellSlots,
        death_saves: char.deathSaves,
        conditions: char.conditions,
        updated_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Sync error:', e)
    }
  },

  // Load state from Supabase on mount
  loadFromSupabase: async () => {
    const { sessionRunId } = get()
    try {
      const { roster } = await fetchPartyRosterForCombat(supabase)
      set({ characters: roster })

      const { data: sessionData } = await supabase
        .from('session_state')
        .select('*')
        .eq('id', sessionRunId)
        .single()

      if (sessionData) {
        set({
          currentSceneIndex: sessionData.current_scene_index || 0,
          currentBeatIndex: sessionData.current_beat_index || 0
        })
      }

      const { data: charData } = await supabase
        .from('character_states')
        .select('*')

      if (charData && charData.length > 0) {
        const { characters } = get()
        const updated = characters.map(c => {
          const saved = charData.find(d => d.id === c.id)
          if (!saved) return c
          return {
            ...c,
            curHp: saved.cur_hp ?? c.curHp,
            tempHp: saved.temp_hp ?? c.tempHp,
            concentration: saved.concentration ?? c.concentration,
            spellSlots: saved.spell_slots ?? c.spellSlots,
            deathSaves: saved.death_saves ?? c.deathSaves,
            conditions: saved.conditions ?? c.conditions
          }
        })
        set({ characters: updated })
      }
    } catch (e) {
      console.log('No saved state found, starting fresh.')
    }
  }
}))
