import { create } from 'zustand'
import { supabase } from '@shared/lib/supabase.js'
import { CHARACTERS } from '@shared/content/session1.js'
import { fetchPartyRosterForCombat, mergeCharacterStateIntoRuntimeRow } from '@shared/lib/partyRoster.js'
import { getSessionRunId, getRulesetContext } from '@shared/lib/runtimeContext.js'
import { normalizeSessionsFromDb } from '@shared/lib/sessionContentNormalize.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'

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

  /** Phase 2B: set when active_session_uuid does not resolve to a loaded session */
  activeSessionResolveError: null, // null | 'no_active_session' | 'active_session_not_found'

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
      completedBeats: new Set(),
      activeSessionResolveError: null,
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
      set({ sessions: [], session: null, activeSessionResolveError: 'no_active_session' })
      return
    }

    const normalized = normalizeSessionsFromDb(dbSessions)

    const { activeSessionId } = get()
    let activeSession = null
    let activeSessionResolveError = null
    if (activeSessionId) {
      activeSession = normalized.find(s => s.id === activeSessionId) || null
      if (!activeSession) activeSessionResolveError = 'active_session_not_found'
    } else {
      activeSessionResolveError = 'no_active_session'
    }

    set({
      sessions: normalized,
      session: activeSession,
      activeSessionId,
      activeSessionResolveError,
    })
  },

  // Character updates
  updateCharacterHp: async (characterId, newHp) => {
    const { characters } = get()
    const updated = characters.map(c =>
      c.id === characterId
        ? {
            ...c,
            curHp: Math.max(0, Math.min(c.maxHp, newHp)),
            deathSaves: Math.max(0, Math.min(c.maxHp, newHp)) > 0
              ? { successes: 0, failures: 0 }
              : (c.deathSaves || { successes: 0, failures: 0 }),
          }
        : c
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
      const current = c.deathSaves && typeof c.deathSaves === 'object'
        ? c.deathSaves
        : { successes: 0, failures: 0 }
      const delta = Number(value)
      const safeDelta = Number.isFinite(delta) ? delta : 0
      const nextValue = Math.max(0, Math.min(3, Number(current[type] || 0) + safeDelta))
      const saves = { ...current, [type]: nextValue }
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
        green_marks: Math.max(0, Math.floor(Number(char.greenMarks) || 0)),
        tactical_json: char.tacticalJson && typeof char.tacticalJson === 'object' ? char.tacticalJson : {},
        updated_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Sync error:', e)
    }
  },

  /** Merge tactical_json fields (concentrationSpell, inspiration, classResources, actionEconomy). */
  patchCharacterTacticalJson: async (characterId, partial) => {
    const { characters } = get()
    const updated = characters.map((c) => {
      if (c.id !== characterId) return c
      const prev = c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}
      return { ...c, tacticalJson: { ...prev, ...partial } }
    })
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  /** Adjust Green Mark count (clamped by greenMarkCap, default 10). */
  adjustCharacterGreenMarks: async (characterId, delta) => {
    const d = Number(delta)
    if (!Number.isFinite(d) || d === 0) return
    const { characters } = get()
    const c = characters.find((x) => x.id === characterId)
    if (!c) return
    const cap = c.greenMarkCap != null ? Number(c.greenMarkCap) : 10
    const safeCap = Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : 10
    const cur = Math.max(0, Math.floor(Number(c.greenMarks) || 0))
    const next = Math.max(0, Math.min(safeCap, cur + Math.trunc(d)))
    const updated = characters.map((ch) =>
      ch.id === characterId ? { ...ch, greenMarks: next } : ch
    )
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  /** Record last DM-triggered Green Mark effect (stored in tactical_json.greenMarksState). */
  touchGreenMarkTriggered: async (characterId) => {
    const { characters } = get()
    const c = characters.find((x) => x.id === characterId)
    if (!c) return
    const prev = c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}
    const prevGm = prev.greenMarksState && typeof prev.greenMarksState === 'object' ? prev.greenMarksState : {}
    await get().patchCharacterTacticalJson(characterId, {
      greenMarksState: {
        ...prevGm,
        lastTriggeredAt: new Date().toISOString(),
      },
    })
  },

  setCharacterConcentration: async (characterId, active, spellName = null) => {
    const { characters } = get()
    const updated = characters.map((c) => {
      if (c.id !== characterId) return c
      const prev = c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}
      const tacticalJson = {
        ...prev,
        concentrationSpell: active ? (spellName || prev.concentrationSpell || '') : null,
      }
      return { ...c, concentration: !!active, tacticalJson }
    })
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  setCharacterConditions: async (characterId, conditions) => {
    const { characters } = get()
    const lowered = new Set((Array.isArray(conditions) ? conditions : []).map((c) => String(c || '').toLowerCase()))
    const dropsConcentration = lowered.has('incapacitated') || lowered.has('unconscious')
    const updated = characters.map((c) =>
      c.id === characterId
        ? {
            ...c,
            conditions: Array.isArray(conditions) ? conditions : [],
            ...(dropsConcentration ? {
              concentration: false,
              tacticalJson: {
                ...(c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}),
                concentrationSpell: null,
              },
            } : {}),
          }
        : c
    )
    set({ characters: updated })
    await get().syncCharacterState(characterId)
  },

  // Load state from Supabase on mount
  loadFromSupabase: async () => {
    const { sessionRunId } = get()
    try {
      const { roster, source: rosterSource } = await fetchPartyRosterForCombat(supabase)
      if (rosterSource === 'fallback') {
        warnFallback('DM session store: character roster from static bundle', {
          system: 'dmSessionStore',
          source: 'static',
        })
      }
      set({ characters: roster })

      const { data: sessionData } = await supabase
        .from('session_state')
        .select('*')
        .eq('id', sessionRunId)
        .single()

      if (sessionData) {
        set({
          currentSceneIndex: sessionData.current_scene_index || 0,
          currentBeatIndex: sessionData.current_beat_index || 0,
          activeSessionId: sessionData.active_session_uuid || null,
        })
      }

      const { data: charData } = await supabase
        .from('character_states')
        .select('*')

      if (charData && charData.length > 0) {
        const { characters } = get()
        const updated = characters.map((c) => {
          const saved = charData.find((d) => d.id === c.id)
          if (!saved) return c
          return mergeCharacterStateIntoRuntimeRow({ ...c }, saved)
        })
        set({ characters: updated })
      }
    } catch (e) {
      warnFallback('loadFromSupabase failed; roster/scene indices may be stale', {
        system: 'dmSessionStore',
        reason: String(e?.message || e),
      })
    }
  }
}))
