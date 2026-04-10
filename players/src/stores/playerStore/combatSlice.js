import { supabase } from '@shared/lib/supabase.js'
import { consumeActionEconomy, ensureActionEconomy, encodeSavePrompt, makeSavePromptEnvelope } from '@shared/lib/combatRules.js'
import { getRulesetContext } from '@shared/lib/runtimeContext.js'
import { logCombatResolutionEvent } from '@shared/lib/logCombatResolution.js'
import { parseCombatantsArray } from '@shared/lib/validation/storeBoundaries.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { sanitizeCombatantForPlayer } from './helpers.js'

export const createCombatSlice = (set, get) => ({
  combatActive: false,
  combatRound: 1,
  combatCombatants: [],
  combatActiveCombatantIndex: 0,
  ilyaAssignedTo: null,
  initiativePhase: false,
  companionSpellSlots: {},

  _combatStateSyncedAt: null,

  activeBuffs: {},
  bardicInspirationUses: 4,

  bumpCombatStateSyncedFromWrite: (isoString) => {
    const ms = Date.parse(isoString)
    if (!Number.isNaN(ms)) {
      set(s => ({
        _combatStateSyncedAt:
          s._combatStateSyncedAt != null ? Math.max(s._combatStateSyncedAt, ms) : ms
      }))
    }
  },

  applyCombatStateRow: (row) => {
    if (!row) return
    let incomingTs = row.updated_at ? Date.parse(row.updated_at) : null
    if (incomingTs != null && Number.isNaN(incomingTs)) incomingTs = null
    const lastApplied = get()._combatStateSyncedAt
    if (incomingTs != null && lastApplied != null && incomingTs < lastApplied) return

    const combatants = parseCombatantsArray(row.combatants, 'applyCombatStateRow.combatants')
      .map(c => ({ ...c, actionEconomy: ensureActionEconomy(c) }))
      .map(sanitizeCombatantForPlayer)

    let nextLast = lastApplied ?? null
    if (incomingTs != null) {
      nextLast = nextLast != null ? Math.max(nextLast, incomingTs) : incomingTs
    }

    set({
      combatActive: row.active ?? false,
      combatRound: row.round ?? 1,
      combatCombatants: combatants,
      combatActiveCombatantIndex: row.active_combatant_index ?? 0,
      ilyaAssignedTo: row.ilya_assigned_to ?? null,
      initiativePhase: row.initiative_phase ?? false,
      _combatStateSyncedAt: nextLast,
    })
  },

  fetchCombatantsForWrite: async () => {
    const { sessionRunId } = get()
    try {
      const { data } = await supabase
        .from('combat_state')
        .select('combatants')
        .eq('id', sessionRunId)
        .maybeSingle()
      let list = get().combatCombatants
      if (data?.combatants != null) {
        list = parseCombatantsArray(data.combatants, 'fetchCombatantsForWrite')
      }
      return list
    } catch (e) {
      warnFallback('fetchCombatantsForWrite failed; using in-memory combatants', {
        system: 'playerCombat',
        reason: String(e?.message || e),
      })
      return get().combatCombatants
    }
  },

  applyDamageToEnemy: async (combatantId, damage, attackerName, weaponName) => {
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo, sessionRunId } = get()
    const rulesetContext = getRulesetContext()
    const combatCombatants = await get().fetchCombatantsForWrite()
    const target = combatCombatants.find(c => c.id === combatantId)
    if (!target) return

    let tempHp = target.tempHp || 0
    let curHp = target.curHp
    let remaining = damage
    if (tempHp > 0) {
      const absorbed = Math.min(tempHp, remaining)
      tempHp -= absorbed
      remaining -= absorbed
    }
    curHp = Math.max(0, curHp - remaining)

    const updatedCombatants = combatCombatants.map(c =>
      c.id === combatantId ? { ...c, curHp, tempHp } : c
    )
    set({ combatCombatants: updatedCombatants })

    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updatedCombatants, initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo, ruleset_context: rulesetContext,
        updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)

      const msg = curHp === 0
        ? `${attackerName} → ${target.name} takes ${damage} and goes DOWN!`
        : `${attackerName} hits ${target.name} with ${weaponName} for ${damage} (${curHp}/${target.maxHp} HP)`
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: msg, type: 'damage', shared: true, timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to apply damage:', e)
    }
  },

  applyConditionToEnemy: async (combatantId, condition, casterName) => {
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo, sessionRunId } = get()
    const rulesetContext = getRulesetContext()
    const combatCombatants = await get().fetchCombatantsForWrite()
    const updatedCombatants = combatCombatants.map(c =>
      c.id === combatantId && !c.conditions?.includes(condition)
        ? { ...c, conditions: [...(c.conditions || []), condition] }
        : c
    )
    set({ combatCombatants: updatedCombatants })
    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updatedCombatants, initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo, ruleset_context: rulesetContext,
        updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)
      const target = combatCombatants.find(c => c.id === combatantId)
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: `${casterName} → ${target?.name ?? combatantId} is now ${condition} (−1d4 to attacks & saves)`,
        type: 'damage', shared: true, timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to apply condition:', e)
    }
  },

  applyHealingToCharacter: async (targetId, amount, healerName, spellName) => {
    const { characters, combatActive, combatRound, sessionRunId } = get()
    const target = characters.find(c => c.id === targetId)
    const staticChar = get().playerCharacters[targetId]
    if (!target && !staticChar) return
    if (!target && staticChar) {
      warnFallback('Healing applied using static player sheet (runtime row missing)', {
        system: 'playerCombat',
        id: targetId,
        source: 'static',
      })
    }
    const maxHp = staticChar?.stats?.maxHp || target?.maxHp || 0
    const currentHp = target?.curHp ?? maxHp
    const newHp = Math.min(maxHp, currentHp + amount)

    const updated = target
      ? characters.map(c => (c.id === targetId ? { ...c, curHp: newHp } : c))
      : characters
    set({ characters: updated })

    try {
      await supabase.from('character_states').upsert({
        id: targetId, cur_hp: newHp, updated_at: new Date().toISOString()
      })
      const msg = `${healerName} uses ${spellName} on ${staticChar?.name || targetId} for ${amount} HP (${newHp}/${maxHp})`
      if (combatActive) {
        await supabase.from('combat_feed').insert({
          session_id: sessionRunId, round: combatRound,
          text: msg, type: 'heal', shared: true, timestamp: new Date().toISOString()
        })
        const list = await get().fetchCombatantsForWrite()
        const updatedCombatants = list.map(c =>
          c.id === targetId ? { ...c, curHp: newHp } : c
        )
        if (updatedCombatants.some(c => c.id === targetId)) {
          set({ combatCombatants: updatedCombatants })
          const ts = new Date().toISOString()
          const { initiativePhase, ilyaAssignedTo } = get()
          await supabase.from('combat_state').upsert({
            id: sessionRunId, session_run_id: sessionRunId,
            active: combatActive, round: combatRound,
            combatants: updatedCombatants, initiative_phase: initiativePhase,
            ilya_assigned_to: ilyaAssignedTo, updated_at: ts
          })
          get().bumpCombatStateSyncedFromWrite(ts)
        }
      }
    } catch (e) {
      console.error('Failed to apply healing:', e)
    }
  },

  applyDamageToCharacter: async (targetId, amount, sourceName, label, damageType = null) => {
    if (!targetId || !amount || amount <= 0) return
    const {
      characters, combatActive, combatRound, sessionRunId,
      combatActiveCombatantIndex, initiativePhase, ilyaAssignedTo,
    } = get()
    const rulesetContext = getRulesetContext()
    const target = characters.find(c => c.id === targetId)
    const staticChar = get().playerCharacters[targetId]
    if (!target && !staticChar) return
    if (!target && staticChar) {
      warnFallback('Damage applied using static player sheet (runtime row missing)', {
        system: 'playerCombat',
        id: targetId,
        source: 'static',
      })
    }
    const maxHp = staticChar?.stats?.maxHp || target?.maxHp || 0
    const currentHp = target?.curHp ?? maxHp
    const list = await get().fetchCombatantsForWrite()
    const combatRow = list.find(c => c.id === targetId)
    let tempHp = combatRow?.tempHp || 0
    let remaining = amount
    if (tempHp > 0) {
      const absorbed = Math.min(tempHp, remaining)
      tempHp -= absorbed
      remaining -= absorbed
    }
    const newHp = Math.max(0, currentHp - remaining)

    const updatedChars = target
      ? characters.map(c => (c.id === targetId ? { ...c, curHp: newHp } : c))
      : characters
    set({ characters: updatedChars })

    const typeStr = damageType ? ` ${damageType}` : ''
    const displayName = staticChar?.name || target?.name || targetId

    try {
      await supabase.from('character_states').upsert({
        id: targetId, cur_hp: newHp, updated_at: new Date().toISOString(),
      })
      if (combatActive) {
        const msg = `${sourceName}'s ${label}:${typeStr} ${amount} → ${displayName} (${newHp}/${maxHp} HP)`
        await supabase.from('combat_feed').insert({
          session_id: sessionRunId, round: combatRound,
          text: msg, type: 'damage', shared: true, timestamp: new Date().toISOString(),
        })
        const updatedCombatants = list.map(c => {
          if (c.id !== targetId) return c
          return { ...c, curHp: newHp, tempHp }
        })
        if (updatedCombatants.some(c => c.id === targetId)) {
          set({ combatCombatants: updatedCombatants })
          const ts = new Date().toISOString()
          await supabase.from('combat_state').upsert({
            id: sessionRunId, session_run_id: sessionRunId,
            active: combatActive, round: combatRound,
            combatants: updatedCombatants, active_combatant_index: combatActiveCombatantIndex,
            initiative_phase: initiativePhase, ilya_assigned_to: ilyaAssignedTo,
            ruleset_context: rulesetContext, updated_at: ts,
          })
          get().bumpCombatStateSyncedFromWrite(ts)
        }
      }
    } catch (e) {
      console.error('Failed to apply damage to character:', e)
    }
  },

  grantBardicInspiration: (targetId, fromCharId) => {
    const { activeBuffs, bardicInspirationUses } = get()
    if (bardicInspirationUses <= 0) return false
    const existing = activeBuffs[targetId] || []
    const buff = { id: Date.now(), type: 'bardic', die: 6, from: fromCharId }
    set({
      activeBuffs: { ...activeBuffs, [targetId]: [...existing, buff] },
      bardicInspirationUses: bardicInspirationUses - 1
    })
    return true
  },

  consumeBuff: (targetId, buffType) => {
    const { activeBuffs } = get()
    const buffs = activeBuffs[targetId] || []
    const idx = buffs.findIndex(b => b.type === buffType)
    if (idx === -1) return null
    const buff = buffs[idx]
    const newBuffs = [...buffs.slice(0, idx), ...buffs.slice(idx + 1)]
    set({ activeBuffs: { ...activeBuffs, [targetId]: newBuffs } })
    return buff
  },

  resetBardicInspiration: () => set({ bardicInspirationUses: 4 }),

  useSpellSlot: async (characterId, slotLevel) => {
    const { characters, playerCharacters, companionSpellSlots } = get()
    const char = characters.find(c => c.id === characterId)
    const staticChar = playerCharacters[characterId]
    const slotsSource = char?.spellSlots || companionSpellSlots[characterId] || staticChar?.spellSlots
    if (!char?.spellSlots && staticChar?.spellSlots) {
      warnFallback('Spell slots read from static player sheet', {
        system: 'playerCombat',
        id: characterId,
        source: 'static',
      })
    }
    if (!slotsSource) return false
    const slots = slotsSource ?? {}
    const slot = slots[slotLevel]
    if (!slot || slot.used >= slot.max) return false
    const newSlots = { ...slots, [slotLevel]: { ...slot, used: slot.used + 1 } }
    if (char) {
      const updated = characters.map(c => c.id === characterId ? { ...c, spellSlots: newSlots } : c)
      set({ characters: updated })
    } else {
      set({ companionSpellSlots: { ...companionSpellSlots, [characterId]: newSlots } })
    }
    try {
      await supabase.from('character_states').upsert({
        id: characterId, spell_slots: newSlots, updated_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to update spell slots:', e)
    }
    return true
  },

  submitInitiative: async (characterId, value) => {
    const { combatActive, combatRound, ilyaAssignedTo, initiativePhase, sessionRunId } = get()
    const combatCombatants = await get().fetchCombatantsForWrite()
    const updated = combatCombatants.map(c =>
      c.id === characterId ? { ...c, initiative: value, initiativeSet: true } : c
    )
    set({ combatCombatants: updated })
    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updated, ilya_assigned_to: ilyaAssignedTo,
        initiative_phase: initiativePhase, updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)
    } catch (e) {
      console.error('Failed to submit initiative:', e)
    }
  },

  tryUseCombatActionType: async (characterId, actionType, context = 'action') => {
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo, combatActiveCombatantIndex, sessionRunId } = get()
    if (!combatActive || !actionType || actionType === 'special') return { ok: true, reason: null }
    const combatCombatants = await get().fetchCombatantsForWrite()
    const idx = combatCombatants.findIndex(c => c.id === characterId)
    if (idx === -1) return { ok: true, reason: null }
    if (combatActiveCombatantIndex !== idx) return { ok: false, reason: 'not_your_turn' }
    const actor = combatCombatants[idx]
    const consumed = consumeActionEconomy(actor, actionType)
    if (!consumed.ok) return { ok: false, reason: `${actionType}_unavailable` }
    const updatedCombatants = combatCombatants.map((c, i) => (
      i === idx ? { ...c, actionEconomy: consumed.actionEconomy } : c
    ))
    set({ combatCombatants: updatedCombatants })
    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updatedCombatants, active_combatant_index: combatActiveCombatantIndex,
        initiative_phase: initiativePhase, ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)
      const readable = actionType === 'bonus_action' ? 'bonus action' : actionType
      await get().pushRoll(`${context}: spent ${readable}`, characterId)
      return { ok: true, reason: null }
    } catch (e) {
      console.error('Failed to spend action economy:', e)
      return { ok: true, reason: null }
    }
  },

  getCombatantActionEconomy: (characterId) => {
    const c = get().combatCombatants.find(x => x.id === characterId)
    return ensureActionEconomy(c || {})
  },

  pushRoll: async (text, charName) => {
    const { combatRound, sessionRunId } = get()
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: `[${charName}] ${text}`, type: 'roll', shared: true,
        timestamp: new Date().toISOString()
      })
    } catch (e) { /* Non-critical */ }
  },

  pushSavePrompt: async (payload) => {
    const { combatRound, sessionRunId } = get()
    try {
      const envelope = makeSavePromptEnvelope(payload)
      const metadata = {
        prompt_id: envelope.promptId,
        spell_name: envelope.spellName,
        save_ability: envelope.saveAbility,
        save_dc: envelope.saveDc,
        effect_kinds: envelope.effect_kinds || payload.effect_kinds,
        resolution_path: envelope.resolution_path || payload.resolution_path,
      }
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: encodeSavePrompt(envelope), type: 'save-prompt', shared: false,
        visibility: 'targeted', prompt_status: 'pending', metadata,
        timestamp: new Date().toISOString()
      })
      await logCombatResolutionEvent(supabase, {
        sessionRunId, round: combatRound, kind: 'save_prompt', payload: metadata,
      })
    } catch (e) { /* Non-critical */ }
  },
})
