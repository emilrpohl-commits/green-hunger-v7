import { supabase } from '@shared/lib/supabase.js'
import { decodeSavePrompt } from '@shared/lib/combatRules.js'

export const createFeedSlice = (set, get) => ({
  feed: [],
  playerRolls: [],
  rollFeedChannel: null,
  feedChannel: null,

  pushFeedEvent: async (text, type = 'action', shared = false) => {
    const { feed, round, sessionRunId } = get()
    const event = {
      id: Date.now(),
      round,
      text,
      type,
      shared,
      timestamp: new Date().toISOString()
    }
    set({ feed: [event, ...feed].slice(0, 50) })

    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        round,
        text,
        type,
        shared,
        timestamp: event.timestamp
      })
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
        const feed = data
          .filter(d => d.type !== 'player-save-prompt')
          .map(d => ({ id: d.id, round: d.round, text: d.text, type: d.type, shared: d.shared }))
        const savePrompts = data
          .filter(d => d.type === 'save-prompt')
          .map(d => ({ ...(decodeSavePrompt(d.text) || {}), eventId: d.id, resolved: false }))
          .filter(p => p.promptId)
        set({ feed, savePrompts })
      }
    } catch (e) {
      console.log('No combat feed found.')
    }
  },

  clearFeed: async () => {
    const { sessionRunId } = get()
    set({ feed: [] })
    try {
      await supabase.from('combat_feed').delete().eq('session_id', sessionRunId)
    } catch (e) {}
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
        const event = { id: row.id || Date.now(), round: row.round, text: row.text, type: row.type, shared: row.shared, timestamp: row.timestamp }
        set(state => ({ feed: [event, ...state.feed].slice(0, 80) }))
        if (row.type === 'save-prompt') {
          const prompt = decodeSavePrompt(row.text)
          if (!prompt) return
          set(state => ({
            savePrompts: [
              { ...prompt, eventId: row.id || Date.now(), resolved: false },
              ...state.savePrompts.filter(p => p.promptId !== prompt.promptId)
            ].slice(0, 30)
          }))
        }
        if (row.type === 'save-prompt-resolved') {
          const resolvedPrompt = decodeSavePrompt(row.text)
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
