import { supabase } from '@shared/lib/supabase.js'
import { decodePlayerSavePrompt, decodePlayerSavePromptStrict, readPlayerSavePromptPayload } from '@shared/lib/combatRules.js'
import { qaHoldSavePromptChannelName } from '@shared/lib/qaDevChannels.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { shouldAcceptDmTargetForClient } from './helpers.js'
import { mergeCharacterStateIntoRuntimeRow } from '@shared/lib/partyRoster.js'

export const createRealtimeSlice = (set, get) => ({
  connected: false,
  lastUpdated: null,
  dmRoll: null,
  seenDmPromptIds: [],
  qaHoldSavePromptUntilDismissed: false,
  sessionChannel: null,
  charChannel: null,
  combatChannel: null,
  dmRollChannel: null,
  qaHoldChannel: null,
  savePromptPollId: null,

  clearDmRoll: () => set((state) => ({
    dmRoll: null,
    seenDmPromptIds: state.dmRoll?.eventId
      ? [state.dmRoll.eventId, ...(state.seenDmPromptIds || [])].slice(0, 100)
      : state.seenDmPromptIds,
  })),

  unsubscribe: () => {
    const {
      sessionChannel,
      charChannel,
      combatChannel,
      dmRollChannel,
      qaHoldChannel,
      savePromptPollId,
    } = get()
    if (sessionChannel) supabase.removeChannel(sessionChannel)
    if (charChannel) supabase.removeChannel(charChannel)
    if (combatChannel) supabase.removeChannel(combatChannel)
    if (dmRollChannel) supabase.removeChannel(dmRollChannel)
    if (qaHoldChannel) supabase.removeChannel(qaHoldChannel)
    if (savePromptPollId) clearInterval(savePromptPollId)
    set({
      sessionChannel: null,
      charChannel: null,
      combatChannel: null,
      dmRollChannel: null,
      qaHoldChannel: null,
      savePromptPollId: null,
      connected: false,
    })
  },

  subscribe: () => {
    get().unsubscribe()
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
          const { characters, companionSpellSlots } = get()
          const roster = Array.isArray(characters) ? characters : []
          const hasRuntimeRow = roster.some((c) => c.id === payload.new.id)
          if (!hasRuntimeRow) {
            if (payload.new.spell_slots && typeof payload.new.spell_slots === 'object') {
              set({
                companionSpellSlots: {
                  ...(companionSpellSlots || {}),
                  [payload.new.id]: payload.new.spell_slots,
                },
                lastUpdated: new Date(),
              })
            }
            return
          }
          const updated = roster.map((c) => {
            if (c.id !== payload.new.id) return c
            return mergeCharacterStateIntoRuntimeRow({ ...c }, payload.new)
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
          const decodedStrict = decodePlayerSavePromptStrict(payload.new.text)
          const decoded = readPlayerSavePromptPayload(payload.new) || (decodedStrict.ok ? decodedStrict.payload : decodePlayerSavePrompt(payload.new.text))
          if (!decodedStrict.ok && decoded == null) {
            warnFallback('Realtime save-prompt decode failed', {
              system: 'playerRealtime',
              reason: decodedStrict.reason || 'decode_failed',
            })
            set({
              dmRoll: {
                text: '[System] Save prompt decode failed. Ask DM to resend.',
                targetId: payload.new.target_id,
                timestamp: Date.now(),
                kind: 'save-prompt-error',
                eventId: payload.new.id,
              }
            })
            return
          }
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
        if (payload.new.type === 'rest' && payload.new.payload && typeof payload.new.payload === 'object') {
          const restType = payload.new.payload.restType
          const state = get()
          const roster = Array.isArray(state.characters) ? state.characters : []
          const editable = roster.filter((c) => state.canEditCharacterState(c.id))
          if (restType === 'short') {
            editable.forEach((c) => state.takeShortRest(c.id))
          } else if (restType === 'long') {
            editable.forEach((c) => state.takeLongRest(c.id))
          }
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
        const decodedStrict = decodePlayerSavePromptStrict(row.text)
        const decoded = readPlayerSavePromptPayload(row) || (decodedStrict.ok ? decodedStrict.payload : decodePlayerSavePrompt(row.text))
        if (!decodedStrict.ok && decoded == null) {
          warnFallback('Save-prompt poll decode failed', {
            system: 'playerRealtime',
            reason: decodedStrict.reason || 'decode_failed',
          })
          set((state) => ({
            dmRoll: {
              text: '[System] Save prompt decode failed. Ask DM to resend.',
              targetId: row.target_id,
              timestamp: Date.now(),
              kind: 'save-prompt-error',
              eventId: row.id,
            },
            seenDmPromptIds: [row.id, ...(state.seenDmPromptIds || [])].slice(0, 100),
          }))
          return
        }
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

    set({
      sessionChannel,
      charChannel,
      combatChannel,
      dmRollChannel,
      qaHoldChannel,
      savePromptPollId: savePromptPoll,
    })

    return () => {
      get().unsubscribe()
    }
  },
})
