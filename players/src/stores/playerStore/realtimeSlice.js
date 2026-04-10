import { supabase } from '@shared/lib/supabase.js'
import { decodePlayerSavePrompt } from '@shared/lib/combatRules.js'
import { qaHoldSavePromptChannelName } from '@shared/lib/qaDevChannels.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { shouldAcceptDmTargetForClient } from './helpers.js'

export const createRealtimeSlice = (set, get) => ({
  connected: false,
  lastUpdated: null,
  dmRoll: null,
  seenDmPromptIds: [],
  qaHoldSavePromptUntilDismissed: false,

  clearDmRoll: () => set((state) => ({
    dmRoll: null,
    seenDmPromptIds: state.dmRoll?.eventId
      ? [state.dmRoll.eventId, ...(state.seenDmPromptIds || [])].slice(0, 100)
      : state.seenDmPromptIds,
  })),

  subscribe: () => {
    const { sessionRunId } = get()
    get().loadInitialState()

    const sessionChannel = supabase
      .channel('session-state-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'session_state',
        filter: `id=eq.${sessionRunId}`
      }, (payload) => {
        if (payload.new) {
          set({
            currentSceneIndex: payload.new.current_scene_index || 0,
            currentBeatIndex: payload.new.current_beat_index || 0,
            lastUpdated: new Date()
          })
          const prevU = payload.old?.active_session_uuid
          const nextU = payload.new.active_session_uuid
          if (prevU !== nextU) {
            get().hydratePlayerSessionFromUuid(nextU ?? null).catch((e) => {
              warnFallback('Realtime active_session_uuid hydrate failed', {
                system: 'playerRealtime',
                reason: String(e?.message || e),
              })
            })
          }
        }
      })
      .subscribe((status) => {
        set({ connected: status === 'SUBSCRIBED' })
      })

    const charChannel = supabase
      .channel('character-state-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'character_states'
      }, (payload) => {
        if (payload.new) {
          const { characters } = get()
          const updated = characters.map(c => {
            if (c.id !== payload.new.id) return c
            return {
              ...c,
              curHp: payload.new.cur_hp ?? c.curHp,
              tempHp: payload.new.temp_hp ?? c.tempHp,
              concentration: payload.new.concentration ?? c.concentration,
              spellSlots: payload.new.spell_slots ?? c.spellSlots,
              deathSaves: payload.new.death_saves ?? c.deathSaves,
              conditions: payload.new.conditions ?? c.conditions
            }
          })
          set({ characters: updated, lastUpdated: new Date() })
        }
      })
      .subscribe()

    const combatChannel = supabase
      .channel('combat-state-changes-player')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'combat_state',
        filter: `id=eq.${sessionRunId}`
      }, (payload) => {
        if (payload.new) get().applyCombatStateRow(payload.new)
      })
      .subscribe()

    const dmRollChannel = supabase
      .channel('dm-roll-feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'combat_feed'
      }, (payload) => {
        if (!payload.new) return
        const rowSession = payload.new.session_run_id || payload.new.session_id
        if (rowSession !== sessionRunId) return
        if (payload.new.type === 'dm-roll') {
          if (!shouldAcceptDmTargetForClient(payload.new.target_id, null, get().ilyaAssignedTo)) return
          set({
            dmRoll: {
              text: payload.new.text, targetId: payload.new.target_id,
              timestamp: Date.now(), kind: 'roll', eventId: payload.new.id,
            }
          })
        }
        if (payload.new.type === 'player-save-prompt') {
          const decoded = decodePlayerSavePrompt(payload.new.text)
          if (!shouldAcceptDmTargetForClient(payload.new.target_id, decoded?.targetId, get().ilyaAssignedTo)) return
          if (!decoded) {
            set({
              dmRoll: {
                text: payload.new.text, targetId: payload.new.target_id,
                timestamp: Date.now(), kind: 'save-prompt', eventId: payload.new.id,
              }
            })
            return
          }
          set({
            dmRoll: {
              text: `${decoded.sourceName} uses ${decoded.actionName}. Make a ${decoded.saveAbility} save vs DC ${decoded.saveDc}.`,
              targetId: payload.new.target_id || decoded.targetId || 'all',
              timestamp: Date.now(), kind: 'save-prompt',
              savePrompt: decoded, eventId: payload.new.id,
            }
          })
        }
      })
      .subscribe()

    const savePromptPoll = setInterval(async () => {
      try {
        const { seenDmPromptIds } = get()
        const { data } = await supabase
          .from('combat_feed')
          .select('id,session_id,session_run_id,type,text,target_id,timestamp')
          .or(`session_id.eq.${sessionRunId},session_run_id.eq.${sessionRunId}`)
          .eq('type', 'player-save-prompt')
          .order('timestamp', { ascending: false })
          .limit(1)
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null
        if (!row || seenDmPromptIds.includes(row.id)) return
        const decoded = decodePlayerSavePrompt(row.text)
        if (!shouldAcceptDmTargetForClient(row.target_id, decoded?.targetId, get().ilyaAssignedTo)) {
          set((state) => ({
            seenDmPromptIds: [row.id, ...(state.seenDmPromptIds || [])].slice(0, 100),
          }))
          return
        }
        set((state) => ({
          dmRoll: decoded
            ? {
                text: `${decoded.sourceName} uses ${decoded.actionName}. Make a ${decoded.saveAbility} save vs DC ${decoded.saveDc}.`,
                targetId: row.target_id || decoded.targetId || 'all',
                timestamp: Date.now(), kind: 'save-prompt',
                savePrompt: decoded, eventId: row.id,
              }
            : {
                text: row.text, targetId: row.target_id,
                timestamp: Date.now(), kind: 'save-prompt', eventId: row.id,
              },
          seenDmPromptIds: [row.id, ...(state.seenDmPromptIds || [])].slice(0, 100),
        }))
      } catch (e) {
        warnFallback('Save-prompt polling path failed', {
          system: 'playerRealtime',
          reason: String(e?.message || e),
        })
      }
    }, 2000)

    let qaHoldChannel = null
    if (import.meta.env.DEV) {
      const qaPresenceKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `player-qa-${crypto.randomUUID()}`
          : `player-qa-${Date.now()}`
      const qaCh = supabase
        .channel(qaHoldSavePromptChannelName(sessionRunId), {
          config: { presence: { key: qaPresenceKey } },
        })
        .on('presence', { event: 'sync' }, () => {
          const st = qaCh.presenceState()
          let hold = false
          for (const entries of Object.values(st)) {
            for (const e of entries || []) {
              if (e?.role === 'dm-qa-hold-save-prompt' && e?.holdSavePrompt === true) {
                hold = true
                break
              }
            }
            if (hold) break
          }
          set({ qaHoldSavePromptUntilDismissed: hold })
        })
      qaCh.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await qaCh.track({ role: 'player-qa-observer' })
        }
      })
      qaHoldChannel = qaCh
    }

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(charChannel)
      supabase.removeChannel(combatChannel)
      supabase.removeChannel(dmRollChannel)
      clearInterval(savePromptPoll)
      if (qaHoldChannel) supabase.removeChannel(qaHoldChannel)
    }
  },
})
