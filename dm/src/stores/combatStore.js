import { create } from 'zustand'
import { supabase } from '@shared/lib/supabase.js'
import { CHARACTERS } from '@shared/content/session1.js'
import { SESSION_2_ENEMIES } from '@shared/content/session2.js'
import { useSessionStore } from './sessionStore.js'
import { makeActionEconomy, ensureActionEconomy, consumeActionEconomy, sortCombatantsByInitiative, decodeSavePrompt, applyDeterministicRollModifiers, encodeSavePrompt, normalizeEffectRecord } from '@shared/lib/combatRules.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { getMonsterCombatant } from '@shared/lib/engine/rulesService.js'
import { getRulesetContext, getSessionRunId } from '@shared/lib/runtimeContext.js'

const CORRUPTED_WOLF = {
  id: 'corrupted-wolf',
  name: 'Corrupted Wolf',
  ac: 13,
  maxHp: 13,
  initiative: 20,
  type: 'enemy'
}

export const useCombatStore = create((set, get) => ({
  sessionRunId: getSessionRunId(),
  // Combat state
  active: false,
  round: 1,
  activeCombatantIndex: 0,
  combatants: [],
  feed: [],
  initiativePhase: false,

  // Ilya companion assignment (null = not assigned, or a character id like 'dorothea')
  ilyaAssignedTo: null,

  /** Latest applied combat_state.updated_at (ms); ignores stale HTTP/realtime payloads */
  _combatStateSyncedAt: null,
  setIlyaAssignment: async (charId) => {
    set({ ilyaAssignedTo: charId || null })
    await get().syncCombatState()
  },

  // Player roll feed (type='roll' entries from combat_feed)
  playerRolls: [],
  rollFeedChannel: null,
  feedChannel: null,
  combatStateChannel: null,
  savePrompts: [],
  knownConditions: [],

  // Hydrate DM store from a combat_state row (DB is updated by player clients too)
  applyCombatStateRow: (row) => {
    if (!row) return
    let incomingTs = row.updated_at ? Date.parse(row.updated_at) : null
    if (incomingTs != null && Number.isNaN(incomingTs)) incomingTs = null
    const lastApplied = get()._combatStateSyncedAt
    if (incomingTs != null && lastApplied != null && incomingTs < lastApplied) return

    let combatants = row.combatants
    if (typeof combatants === 'string') {
      try {
        combatants = JSON.parse(combatants)
      } catch {
        combatants = []
      }
    }
    if (!Array.isArray(combatants)) combatants = []
    combatants = combatants.map(c => ({ ...c, actionEconomy: ensureActionEconomy(c) }))

    let nextLast = lastApplied ?? null
    if (incomingTs != null) {
      nextLast = nextLast != null ? Math.max(nextLast, incomingTs) : incomingTs
    }

    set({
      active: row.active ?? false,
      round: row.round ?? 1,
      activeCombatantIndex: row.active_combatant_index ?? 0,
      combatants,
      ilyaAssignedTo: row.ilya_assigned_to ?? null,
      initiativePhase: row.initiative_phase ?? false,
      _combatStateSyncedAt: nextLast,
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

  // Subscribe to player rolls in real-time
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

  // Load recent player rolls from Supabase
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

  // Clear player roll feed
  clearPlayerRolls: async () => {
    const { sessionRunId } = get()
    set({ playerRolls: [] })
    try {
      await supabase.from('combat_feed').delete().eq('session_id', sessionRunId).eq('type', 'roll')
    } catch (e) {}
  },

  resolveSavePrompt: async ({ prompt, targetId, mode = 'roll', manualTotal = null }) => {
    if (!prompt || !targetId) return
    const { combatants } = get()
    const target = combatants.find(c => c.id === targetId)
    if (!target) return
    const baseD20 = Math.floor(Math.random() * 20) + 1
    const saveBonus = Array.isArray(target.savingThrows)
      ? (target.savingThrows.find(s => String(s.name || '').toUpperCase() === String(prompt.saveAbility || '').toUpperCase())?.mod || 0)
      : 0
    const rolled = applyDeterministicRollModifiers({
      combatant: target,
      baseRoll: baseD20 + saveBonus,
      rollType: 'save'
    })
    const total = mode === 'manual' ? (parseInt(manualTotal, 10) || 0) : rolled.total
    const success = total >= (prompt.saveDc || 10)
    const dmg = prompt.damage?.amount || 0
    const applyDmg = success ? (prompt.damage?.halfOnSuccess ? Math.floor(dmg / 2) : 0) : dmg

    if (applyDmg > 0) await get().damageCombatant(targetId, applyDmg)
    if (!success && prompt.effect?.name) {
      await get().addEffect(targetId, {
        name: prompt.effect.name,
        mechanic: prompt.effect.mechanic || '',
        source: prompt.casterName || null,
        colour: '#a060c0',
      })
    }
    const resolutionText = `${target.name} ${prompt.saveAbility} save vs ${prompt.spellName} DC ${prompt.saveDc}: ${total} (${success ? 'SUCCESS' : 'FAIL'})${applyDmg > 0 ? `, damage ${applyDmg}` : ''}`
    const { feed, round } = get()
    const event = { id: Date.now(), round, text: resolutionText, type: 'save-prompt-resolved', shared: true, timestamp: new Date().toISOString() }
    set({ feed: [event, ...feed].slice(0, 80) })
    const { sessionRunId } = get()
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        round,
        text: encodeSavePrompt({ promptId: prompt.promptId, resolutionText }),
        type: 'save-prompt-resolved',
        shared: true,
        visibility: 'player_visible',
        prompt_status: 'resolved',
        timestamp: event.timestamp
      })
    } catch (e) {}
    set(state => ({ savePrompts: state.savePrompts.map(p => p.promptId === prompt.promptId ? { ...p, resolved: true } : p) }))
  },

  // Add/remove a spell effect on a combatant
  addEffect: async (combatantId, effect) => {
    const { combatants } = get()
    const normalizedEffect = normalizeEffectRecord(effect)
    const updated = combatants.map(c => {
      if (c.id !== combatantId) return c
      const effects = c.effects || []
      if (effects.find(e => e.name === normalizedEffect.name)) return c // already applied
      return { ...c, effects: [...effects, normalizedEffect] }
    })
    set({ combatants: updated })
    const target = combatants.find(c => c.id === combatantId)
    await get().pushFeedEvent(`${target?.name} is affected by ${normalizedEffect.name}${normalizedEffect.source ? ` (from ${normalizedEffect.source})` : ''}.`, 'system', false)
    await get().syncCombatState()
  },

  removeEffect: async (combatantId, effectName) => {
    const { combatants } = get()
    const updated = combatants.map(c => {
      if (c.id !== combatantId) return c
      return { ...c, effects: (c.effects || []).filter(e => e.name !== effectName) }
    })
    set({ combatants: updated })
    await get().syncCombatState()
  },

  // Start a new encounter
  startEncounter: async (encounterName, enemies) => {
    // Fetch latest stat blocks from Supabase to pick up any builder changes.
    // If these lookups fail, we still start combat using local fallback data.
    const slugs = [...new Set((enemies || []).map(e => e.id).filter(Boolean))]
    let statBlocks = null
    try {
      const { data, error } = await supabase
        .from('stat_blocks')
        .select('slug, ac, max_hp, portrait_url, actions, bonus_actions, reactions, ability_scores, saving_throws')
        .in('slug', slugs)
      if (error) {
        console.warn('startEncounter stat_blocks lookup failed:', error)
      } else {
        statBlocks = data
      }
    } catch (e) {
      console.warn('startEncounter stat_blocks lookup threw:', e)
    }
    const sbMap = {}
    if (statBlocks) statBlocks.forEach(sb => { sbMap[sb.slug] = sb })

    const pcIds = CHARACTERS.map(c => c.id).filter(Boolean)
    let charStates = null
    try {
      const { data, error } = await supabase
        .from('character_states')
        .select('id, cur_hp, temp_hp')
        .in('id', pcIds)
      if (error) {
        console.warn('startEncounter character_states lookup failed:', error)
      } else {
        charStates = data
      }
    } catch (e) {
      console.warn('startEncounter character_states lookup threw:', e)
    }
    const stateMap = {}
    if (charStates) charStates.forEach(s => { stateMap[s.id] = s })

    // Build combatant list from players + enemies
    const playerCombatants = CHARACTERS.map(c => {
      const saved = stateMap[c.id]
      return {
        id: c.id,
        name: c.name,
        type: 'player',
        ac: c.ac,
        maxHp: c.maxHp,
        curHp: saved != null && saved.cur_hp != null ? saved.cur_hp : c.curHp,
        tempHp: saved != null && saved.temp_hp != null ? saved.temp_hp : (c.tempHp || 0),
        initiative: 0, // DM sets manually
        initiativeSet: false,
        conditions: [],
        effects: [],
        concentration: false,
        image: c.image || null,
        actionEconomy: makeActionEconomy(),
      }
    })

    const enemyCombatants = await Promise.all(enemies.map(async (e, i) => {
      const sb = sbMap[e.id]
      const ac = sb?.ac ?? e.ac
      const maxHp = sb?.max_hp ?? e.maxHp
      let engineMonster = null
      if (featureFlags.use5eEngine && featureFlags.engineMonsters && !sb) {
        try {
          engineMonster = await getMonsterCombatant(e.id, i + 1)
        } catch {
          engineMonster = null
        }
      }
      if (engineMonster) {
        return {
          ...engineMonster,
          id: `${e.id}-${i + 1}`,
          name: enemies.length > 1 ? `${engineMonster.name} ${i + 1}` : engineMonster.name,
          initiative: e.initiative || engineMonster.initiative || 0,
          initiativeSet: true,
          actionEconomy: makeActionEconomy(),
        }
      }
      return {
        id: `${e.id}-${i + 1}`,
        name: enemies.length > 1 ? `${e.name} ${i + 1}` : e.name,
        type: 'enemy',
        ac,
        maxHp,
        curHp: maxHp,
        tempHp: 0,
        initiative: e.initiative || 0,
        initiativeSet: true,
        conditions: [],
        effects: [],
        concentration: false,
        image: sb?.portrait_url || e.portrait_url || null,
        actionEconomy: makeActionEconomy(),
        abilityScores: sb?.ability_scores || {},
        savingThrows: sb?.saving_throws || [],
        actionOptions: [
          ...((sb?.actions || []).map(a => ({ ...a, actionType: 'action' }))),
          ...((sb?.bonus_actions || []).map(a => ({ ...a, actionType: 'bonus_action' }))),
          ...((sb?.reactions || []).map(a => ({ ...a, actionType: 'reaction' }))),
          ...((e.actions || []).map(a => ({ ...a, actionType: a.actionType || 'action', source: 'normalized' }))),
          ...((e.bonus_actions || []).map(a => ({ ...a, actionType: 'bonus_action', source: 'normalized' }))),
          ...((e.reactions || []).map(a => ({ ...a, actionType: 'reaction', source: 'normalized' }))),
        ],
        actionSource: sb ? 'stat_block' : ((e.actions || e.bonus_actions || e.reactions) ? 'normalized' : 'fallback'),
      }
    }))

    // Final fallback action if no statblock/normalized actions were available.
    const withFallbackActions = enemyCombatants.map((c) => {
      if (Array.isArray(c.actionOptions) && c.actionOptions.length > 0) return c
      return {
        ...c,
        actionOptions: [{
          name: 'Basic Attack (Manual Fallback)',
          desc: 'No structured action data available. DM adjudicates outcome manually.',
          actionType: 'action',
          type: 'special',
          source: 'fallback',
        }],
        actionSource: 'fallback',
      }
    })

    const allCombatants = [...playerCombatants, ...withFallbackActions]

    set({
      active: true,
      round: 1,
      activeCombatantIndex: 0,
      combatants: allCombatants,
      initiativePhase: true,
      feed: [{
        id: Date.now(),
        round: 1,
        text: `⚔️ ${encounterName} begins — rolling initiative.`,
        type: 'system',
        shared: true
      }]
    })

    await get().syncCombatState()
    await get().pushFeedEvent(`⚔️ ${encounterName} begins — rolling initiative.`, 'system', true)
  },

  // End combat
  endCombat: async () => {
    const { combatants } = get()
    const pcs = combatants.filter(c => c.type === 'player')
    for (const pc of pcs) {
      try {
        await useSessionStore.getState().updateCharacterHp(pc.id, pc.curHp)
        await useSessionStore.getState().updateCharacterTempHp(pc.id, pc.tempHp ?? 0)
      } catch (e) {
        console.error('endCombat character sync:', e)
      }
    }
    await get().pushFeedEvent('Combat ends.', 'system', true)
    set({ active: false, combatants: [], round: 1, activeCombatantIndex: 0, initiativePhase: false })
    await get().syncCombatState()
  },

  // Sort initiative order and end initiative phase
  sortInitiative: async () => {
    const { combatants } = get()
    const sorted = sortCombatantsByInitiative(combatants)
    set({ combatants: sorted, activeCombatantIndex: 0, initiativePhase: false })
    await get().syncCombatState()
  },

  // Set initiative for a combatant
  setInitiative: async (combatantId, value) => {
    const { combatants } = get()
    const updated = combatants.map(c =>
      c.id === combatantId ? { ...c, initiative: parseInt(value) || 0, initiativeSet: true } : c
    )
    set({ combatants: updated })
    await get().syncCombatState()
  },

  // Next turn (skip dead enemies; PCs still take turns at 0 HP)
  nextTurn: async () => {
    const { combatants, activeCombatantIndex, round } = get()
    const n = combatants.length
    if (n === 0) return
    const eligible = (c) => c.type === 'player' || (c.type === 'enemy' && c.curHp > 0)
    let idx = activeCombatantIndex
    let newRound = round
    for (let i = 0; i < n; i++) {
      const prevIdx = idx
      idx = (idx + 1) % n
      if (prevIdx === n - 1 && idx === 0) {
        newRound = round + 1
        await get().pushFeedEvent(`— Round ${newRound} —`, 'round', true)
      }
      if (eligible(combatants[idx])) break
    }
    const updatedCombatants = combatants.map((c, i) => {
      if (i === idx) return { ...c, actionEconomy: makeActionEconomy() }
      return c
    })
    set({ activeCombatantIndex: idx, round: newRound, combatants: updatedCombatants })
    await get().pushFeedEvent(`${combatants[idx]?.name}'s turn.`, 'turn', false)
    await get().syncCombatState()
  },

  // Previous turn (same eligibility as nextTurn)
  prevTurn: async () => {
    const { combatants, activeCombatantIndex, round } = get()
    const n = combatants.length
    if (n === 0) return
    const eligible = (c) => c.type === 'player' || (c.type === 'enemy' && c.curHp > 0)
    let idx = activeCombatantIndex
    let newRound = round
    for (let i = 0; i < n; i++) {
      const prevIdx = idx
      idx = (idx - 1 + n) % n
      if (prevIdx === 0 && idx === n - 1) {
        newRound = Math.max(1, round - 1)
      }
      if (eligible(combatants[idx])) break
    }
    set({ activeCombatantIndex: idx, round: newRound })
    await get().syncCombatState()
  },

  // Damage a combatant
  damageCombatant: async (combatantId, amount) => {
    const { combatants } = get()
    const combatant = combatants.find(c => c.id === combatantId)
    if (!combatant) return

    const actualAmount = parseInt(amount) || 0
    let newTempHp = combatant.tempHp
    let newHp = combatant.curHp
    let remaining = actualAmount

    // Temp HP absorbs first
    if (newTempHp > 0) {
      const absorbed = Math.min(newTempHp, remaining)
      newTempHp -= absorbed
      remaining -= absorbed
    }
    newHp = Math.max(0, newHp - remaining)

    const updated = combatants.map(c =>
      c.id === combatantId ? { ...c, curHp: newHp, tempHp: newTempHp } : c
    )
    set({ combatants: updated })

    const isShared = combatant.type === 'player'
    const msg = newHp === 0
      ? `${combatant.name} is DOWN (0 HP).`
      : `${combatant.name} takes ${actualAmount} damage. (${newHp}/${combatant.maxHp} HP)`
    await get().pushFeedEvent(msg, 'damage', isShared)
    await get().syncCombatState()
  },

  // Heal a combatant
  healCombatant: async (combatantId, amount) => {
    const { combatants } = get()
    const combatant = combatants.find(c => c.id === combatantId)
    if (!combatant) return

    const actualAmount = parseInt(amount) || 0
    const newHp = Math.min(combatant.maxHp, combatant.curHp + actualAmount)
    const updated = combatants.map(c =>
      c.id === combatantId ? { ...c, curHp: newHp } : c
    )
    set({ combatants: updated })

    const isShared = combatant.type === 'player'
    await get().pushFeedEvent(
      `${combatant.name} heals ${actualAmount}. (${newHp}/${combatant.maxHp} HP)`,
      'heal', isShared
    )
    await get().syncCombatState()
  },

  // Add/remove condition
  toggleCondition: async (combatantId, condition) => {
    const { combatants } = get()
    let conditionName = condition
    if (featureFlags.use5eEngine && featureFlags.engineConditions) {
      const rulesetContext = getRulesetContext()
      const selectedRuleset = rulesetContext.active_ruleset === 'custom' ? '2024' : rulesetContext.active_ruleset
      try {
        const { data } = await supabase
          .from('rules_entities')
          .select('name,source_index')
          .eq('entity_type', 'conditions')
          .eq('ruleset', selectedRuleset)
        if (Array.isArray(data) && data.length > 0) {
          const lookup = data.find((c) =>
            String(c.name || '').toLowerCase() === String(condition || '').toLowerCase()
            || String(c.source_index || '').toLowerCase() === String(condition || '').toLowerCase()
          )
          if (lookup?.name) conditionName = lookup.name
          set({
            knownConditions: data.map((c) => ({
              index: c.source_index,
              name: c.name,
            })),
          })
        }
      } catch {
        // Keep manual condition flow if catalog query fails.
      }
    }
    const updated = combatants.map(c => {
      if (c.id !== combatantId) return c
      const has = c.conditions.includes(conditionName)
      return {
        ...c,
        conditions: has
          ? c.conditions.filter(x => x !== conditionName)
          : [...c.conditions, conditionName]
      }
    })
    set({ combatants: updated })
    await get().syncCombatState()
  },

  useCombatantActionType: async (combatantId, actionType, label = null) => {
    if (!combatantId || !actionType || actionType === 'special') return true
    const { combatants } = get()
    const idx = combatants.findIndex(c => c.id === combatantId)
    if (idx === -1) return false
    const actor = combatants[idx]
    const consumed = consumeActionEconomy(actor, actionType)
    if (!consumed.ok) return false
    const updated = combatants.map((c, i) => (
      i === idx ? { ...c, actionEconomy: consumed.actionEconomy } : c
    ))
    set({ combatants: updated })
    if (label) {
      const readable = actionType === 'bonus_action' ? 'bonus action' : actionType
      await get().pushFeedEvent(`${actor.name} uses ${readable}: ${label}`, 'action', false)
    }
    await get().syncCombatState()
    return true
  },

  // Push a feed event
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
    set({ feed: [event, ...feed].slice(0, 50) }) // keep last 50

    // Push to Supabase
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

  // Sync full combat state to Supabase
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

  // Load feed from Supabase
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
        const feed = data.map(d => ({ id: d.id, round: d.round, text: d.text, type: d.type, shared: d.shared }))
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

  // Clear feed (new encounter)
  clearFeed: async () => {
    const { sessionRunId } = get()
    set({ feed: [] })
    try {
      await supabase.from('combat_feed').delete().eq('session_id', sessionRunId)
    } catch (e) {}
  },

  // Prebuilt encounter launchers
  launchCorruptedHunt: async () => {
    await get().clearFeed()
    await get().startEncounter('Corrupted Hunt', [
      { ...CORRUPTED_WOLF, id: 'corrupted-wolf', initiative: 20 },
      { ...CORRUPTED_WOLF, id: 'corrupted-wolf', initiative: 20 }
    ])
  },

  launchDarcy: async () => {
    await get().clearFeed()
    await get().startEncounter('Darcy, Recombined', [
      { ...SESSION_2_ENEMIES['darcy-recombined'], initiative: 15 }
    ])
  },

  launchRottingBlooms: async () => {
    await get().clearFeed()
    await get().startEncounter('Rotting Bloom Encounter', [
      { ...SESSION_2_ENEMIES['rotting-bloom'], id: 'rotting-bloom', initiative: 8 },
      { ...SESSION_2_ENEMIES['rotting-bloom'], id: 'rotting-bloom', initiative: 8 },
      { ...SESSION_2_ENEMIES['rotting-bloom'], id: 'rotting-bloom', initiative: 8 }
    ])
  },

  launchDamir: async () => {
    await get().clearFeed()
    await get().startEncounter('Damir, the Woven Grief', [
      { ...SESSION_2_ENEMIES['damir-woven-grief'], initiative: 18 }
    ])
  },

  // Launch encounter by beat-linked stat block id
  launchEncounterByStatBlockId: async (statBlockId) => {
    if (!statBlockId) return
    if (statBlockId === 'corrupted-wolf') return get().launchCorruptedHunt()
    if (statBlockId === 'darcy-recombined') return get().launchDarcy()
    if (statBlockId === 'rotting-bloom') return get().launchRottingBlooms()
    if (statBlockId === 'damir-woven-grief') return get().launchDamir()
  }
}))
