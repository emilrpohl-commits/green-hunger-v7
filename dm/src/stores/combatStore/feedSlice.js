import { supabase } from '@shared/lib/supabase.js'
import { decodeSavePrompt, decodeSavePromptStrict, readSavePromptPayload } from '@shared/lib/combatRules.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'

function sortFeedEventsDesc(events) {
  const ts = (event) => {
    const parsed = Date.parse(event?.timestamp || '')
    return Number.isNaN(parsed) ? 0 : parsed
  }
  const idNum = (event) => {
    const n = Number(event?.id)
    return Number.isFinite(n) ? n : 0
  }
  return [...events].sort((a, b) => {
    const tsDiff = ts(b) - ts(a)
    if (tsDiff !== 0) return tsDiff
    return idNum(b) - idNum(a)
  })
}

export const createFeedSlice = (set, get) => ({
  feed: [],
  playerRolls: [],
  rollFeedChannel: null,
  feedChannel: null,

  pushFeedEvent: async (text, type = 'action', shared = false, metadata = null) => {
    const { feed, round, sessionRunId } = get()
    const event = {
      id: Date.now(),
      round,
      text,
      type,
      shared,
      timestamp: new Date().toISOString(),
      ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
    }
    set({ feed: [event, ...feed].slice(0, 50) })

    try {
      const row = {
        session_id: sessionRunId,
        round,
        text,
        type,
        shared,
        timestamp: event.timestamp,
      }
      if (metadata && typeof metadata === 'object') row.metadata = metadata
      await supabase.from('combat_feed').insert(row)
    } catch (e) {
      console.error('Feed sync error:', e)
    }
  },

  loadFeed: async () => {
    const { sessionRunId } = get()
    try {
      const { data } = await supabase
        .from('combat_feed')
        .select('*')
        .eq('session_id', sessionRunId)
        .order('timestamp', { ascending: false })
        .limit(50)

      if (data) {
        const decodeErrors = []
        const feed = data
          .filter(d => d.type !== 'player-save-prompt')
          .map(d => ({
            id: d.id, round: d.round, text: d.text, type: d.type, shared: d.shared,
            payload: d.payload && typeof d.payload === 'object' ? d.payload : undefined,
            metadata: d.metadata && typeof d.metadata === 'object' ? d.metadata : undefined,
          }))
        const savePrompts = data
          .filter(d => d.type === 'save-prompt')
          .map(d => {
            const payload = readSavePromptPayload(d)
            const strict = decodeSavePromptStrict(d.text)
            if (payload && typeof payload === 'object') return { ...payload, eventId: d.id, resolved: false }
            if (strict.ok) return { ...strict.payload, eventId: d.id, resolved: false }
            const loose = decodeSavePrompt(d.text)
            if (loose) return { ...loose, eventId: d.id, resolved: false }
            decodeErrors.push(d.id)
            return null
          })
          .filter(Boolean)
          .filter(p => p.promptId)
        if (decodeErrors.length > 0) {
          const text = `[System] Save prompt decode failed for event(s): ${decodeErrors.join(', ')}`
          feed.unshift({
            id: `save-decode-${Date.now()}`,
            round: 0,
            text,
            type: 'system',
            shared: false,
          })
          console.error(text)
        }
        set({ feed, savePrompts })
      }
    } catch (e) {
      warnFallback('loadFeed failed', { system: 'combatFeed', reason: String(e?.message || e) })
    }
  },

  clearFeed: async () => {
    const { sessionRunId } = get()
    set({ feed: [] })
    try {
      await supabase.from('combat_feed').delete().eq('session_id', sessionRunId)
    } catch (e) {
      warnFallback('clearFeed delete failed', { system: 'combatFeed', reason: String(e?.message || e) })
    }
  },

  subscribeToRolls: () => {
    const existing = get().rollFeedChannel
    if (existing) return

    const { sessionRunId } = get()
    const channel = supabase
      .channel('player-roll-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'combat_feed',
        filter: `session_id=eq.${sessionRunId}`
      }, (payload) => {
        if (payload.new && payload.new.type === 'roll') {
          const entry = {
            id: payload.new.id || Date.now(),
            text: payload.new.text,
            round: payload.new.round,
            timestamp: payload.new.timestamp
          }
          set(state => ({ playerRolls: [entry, ...state.playerRolls].slice(0, 80) }))
        }
      })
      .subscribe()

    set({ rollFeedChannel: channel })
  },

  subscribeToFeed: () => {
    const existing = get().feedChannel
    if (existing) return
    const { sessionRunId } = get()
    const channel = supabase
      .channel('combat-feed-dm')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'combat_feed',
        filter: `session_id=eq.${sessionRunId}`
      }, (payload) => {
        const row = payload.new
        if (!row) return
        if (row.type === 'player-save-prompt') return
        const event = {
          id: row.id || Date.now(),
          round: row.round,
          text: row.text,
          type: row.type,
          shared: row.shared,
          timestamp: row.timestamp,
          metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : undefined,
          payload: row.payload && typeof row.payload === 'object' ? row.payload : undefined,
        }
        set((state) => {
          const deduped = [event, ...state.feed.filter((existing) => String(existing.id) !== String(event.id))]
          return { feed: sortFeedEventsDesc(deduped).slice(0, 80) }
        })
        if (row.type === 'save-prompt') {
          const strict = decodeSavePromptStrict(row.text)
          const prompt = readSavePromptPayload(row) || (strict.ok ? strict.payload : decodeSavePrompt(row.text))
          if (!prompt) return
          set(state => ({
            savePrompts: [
              { ...prompt, eventId: row.id || Date.now(), resolved: false },
              ...state.savePrompts.filter(p => p.promptId !== prompt.promptId)
            ].slice(0, 30)
          }))
        }
        if (row.type === 'save-prompt-resolved') {
          const strict = decodeSavePromptStrict(row.text)
          const resolvedPrompt = readSavePromptPayload(row) || (strict.ok ? strict.payload : decodeSavePrompt(row.text))
          const promptId = resolvedPrompt?.promptId
          if (!promptId) return
          set(state => ({ savePrompts: state.savePrompts.map(p => p.promptId === promptId ? { ...p, resolved: true } : p) }))
        }
      })
      .subscribe()
    set({ feedChannel: channel })
  },

  loadPlayerRolls: async () => {
    const { sessionRunId } = get()
    try {
      const { data } = await supabase
        .from('combat_feed')
        .select('*')
        .eq('session_id', sessionRunId)
        .eq('type', 'roll')
        .order('timestamp', { ascending: false })
        .limit(80)

      if (data) {
        set({ playerRolls: data.map(d => ({ id: d.id, text: d.text, round: d.round, timestamp: d.timestamp })) })
      }
    } catch (e) {}
  },

  clearPlayerRolls: async () => {
    const { sessionRunId } = get()
    set({ playerRolls: [] })
    try {
      await supabase.from('combat_feed').delete().eq('session_id', sessionRunId).eq('type', 'roll')
    } catch (e) {}
  },
})
