import { supabase } from '@shared/lib/supabase.js'
import { ensureActionEconomy } from '@shared/lib/combatRules.js'
import { getRulesetContext, getSessionRunId, setRulesetContext } from '@shared/lib/runtimeContext.js'
import { parseCombatantsArray } from '@shared/lib/validation/storeBoundaries.js'
import { normalizeCombatantConditions } from '@shared/lib/rules/conditionHydration.js'
import { debugCombatTelemetry, warnFallback } from '@shared/lib/fallbackTelemetry.js'

export const createStateSlice = (set, get) => ({
  active: false,
  round: 1,
  activeCombatantIndex: 0,
  combatants: [],
  initiativePhase: false,
  includedPlayerIds: [],

  ilyaAssignedTo: null,

  /** Latest applied combat_state.updated_at (ms); ignores stale HTTP/realtime payloads */
  _combatStateSyncedAt: null,
  combatStateChannel: null,
  knownConditions: [],
  combatStateDiagnostics: {
    lastUpdatedAt: null,
    staleDrops: 0,
    lateEvents: 0,
  },

  setIlyaAssignment: async (charId) => {
    set({ ilyaAssignedTo: charId || null })
    await get().syncCombatState()
  },

  setIncludedPlayerIds: (ids) => {
    set({ includedPlayerIds: Array.from(new Set((ids || []).filter(Boolean))) })
  },

  toggleIncludedPlayerId: (id) => {
    set((s) => {
      const cur = Array.isArray(s.includedPlayerIds) ? s.includedPlayerIds : []
      if (cur.includes(id)) return { includedPlayerIds: cur.filter((x) => x !== id) }
      return { includedPlayerIds: [...cur, id] }
    })
  },

  applyCombatStateRow: (row) => {
    if (!row) return
    if (row.ruleset_context && typeof row.ruleset_context === 'object') {
      setRulesetContext(row.ruleset_context)
    } else if (typeof get().pushFeedEvent === 'function') {
      get().pushFeedEvent('[System] Missing ruleset_context in combat_state; using local runtime flags.', 'system', false)
    }
    let incomingTs = row.updated_at ? Date.parse(row.updated_at) : null
    if (incomingTs != null && Number.isNaN(incomingTs)) incomingTs = null
    const lastApplied = get()._combatStateSyncedAt
    if (incomingTs != null && lastApplied != null && incomingTs < lastApplied) {
      set((state) => ({
        combatStateDiagnostics: {
          ...(state.combatStateDiagnostics || {}),
          staleDrops: ((state.combatStateDiagnostics?.staleDrops) || 0) + 1,
          lateEvents: ((state.combatStateDiagnostics?.lateEvents) || 0) + 1,
          lastUpdatedAt: row.updated_at || state.combatStateDiagnostics?.lastUpdatedAt || null,
        },
      }))
      debugCombatTelemetry('dm.combat_state.stale_drop', {
        incomingUpdatedAt: row.updated_at,
        lastApplied,
      })
      return
    }

    const prevCombatants = get().combatants || []
    const combatants = parseCombatantsArray(row.combatants, 'dm.applyCombatStateRow')
      .map((c) => normalizeCombatantConditions({ ...c, actionEconomy: ensureActionEconomy(c) }))

    if ((row.active ?? false) && combatants.length === 0 && prevCombatants.length > 0) {
      warnFallback('Skipped combat_state: active combat with empty combatants (rejecting corrupt/race payload)', {
        system: 'dmCombat',
        had: prevCombatants.length,
      })
      return
    }

    const n = combatants.length
    let activeIdx = row.active_combatant_index ?? 0
    if (n > 0) activeIdx = Math.max(0, Math.min(activeIdx, n - 1))
    else activeIdx = 0

    let nextLast = lastApplied ?? null
    if (incomingTs != null) {
      nextLast = nextLast != null ? Math.max(nextLast, incomingTs) : incomingTs
    }

    set({
      active: row.active ?? false,
      round: row.round ?? 1,
      activeCombatantIndex: activeIdx,
      combatants,
      ilyaAssignedTo: row.ilya_assigned_to ?? null,
      initiativePhase: row.initiative_phase ?? false,
      _combatStateSyncedAt: nextLast,
      combatStateDiagnostics: {
        ...get().combatStateDiagnostics,
        lastUpdatedAt: row.updated_at || get().combatStateDiagnostics?.lastUpdatedAt || null,
      },
    })
  },

  loadCombatStateFromDb: async () => {
    const { sessionRunId } = get()
    try {
      const { data } = await supabase
        .from('combat_state')
        .select('*')
        .eq('id', sessionRunId)
        .maybeSingle()
      if (data) get().applyCombatStateRow(data)
    } catch (e) {
      console.error('Combat state load error:', e)
    }
  },

  subscribeToCombatStateRemote: () => {
    const existing = get().combatStateChannel
    if (existing) return

    const { sessionRunId } = get()
    const channel = supabase
      .channel('combat-state-dm-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'combat_state',
        filter: `id=eq.${sessionRunId}`
      }, (payload) => {
        if (payload.new) get().applyCombatStateRow(payload.new)
      })
      .subscribe()

    set({ combatStateChannel: channel })
  },

  syncCombatState: async () => {
    const { active, round, activeCombatantIndex, combatants, ilyaAssignedTo, initiativePhase, sessionRunId } = get()
    const rulesetContext = getRulesetContext()
    const ts = new Date().toISOString()
    const tsMs = Date.parse(ts)
    try {
      await supabase.from('combat_state').upsert({
        id: sessionRunId,
        session_run_id: sessionRunId,
        active,
        round,
        active_combatant_index: activeCombatantIndex,
        combatants: combatants,
        ilya_assigned_to: ilyaAssignedTo,
        initiative_phase: initiativePhase,
        ruleset_context: rulesetContext,
        updated_at: ts
      })
      if (!Number.isNaN(tsMs)) {
        set(s => ({
          _combatStateSyncedAt:
            s._combatStateSyncedAt != null ? Math.max(s._combatStateSyncedAt, tsMs) : tsMs
        }))
      }
    } catch (e) {
      console.error('Combat sync error:', e)
    }
  },
})
