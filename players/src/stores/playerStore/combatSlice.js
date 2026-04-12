import { supabase } from '@shared/lib/supabase.js'
import { consumeActionEconomy, ensureActionEconomy, encodeSavePrompt, makeSavePromptEnvelope } from '@shared/lib/combatRules.js'
import { getRulesetContext } from '@shared/lib/runtimeContext.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { applyDamageComponentsBundle } from '@shared/lib/rules/damagePipeline.js'
import { appendDamagePipelineDetail } from '@shared/lib/combat/combatFeedFormat.js'
import { formatDcWithLabel } from '@shared/lib/rules/dcDisplay.js'
import { concentrationSaveDc } from '@shared/lib/rules/spellcastingRules.js'
import { logCombatResolutionEvent } from '@shared/lib/logCombatResolution.js'
import { parseCombatantsArray } from '@shared/lib/validation/storeBoundaries.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { sanitizeCombatantForPlayer } from './helpers.js'
import { normalizeCombatantConditions } from '@shared/lib/rules/conditionHydration.js'

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

    const prevCombatants = get().combatCombatants || []
    const combatants = parseCombatantsArray(row.combatants, 'applyCombatStateRow.combatants')
      .map((c) => normalizeCombatantConditions({ ...c, actionEconomy: ensureActionEconomy(c) }))
      .map(sanitizeCombatantForPlayer)

    if ((row.active ?? false) && combatants.length === 0 && prevCombatants.length > 0) {
      warnFallback('Skipped combat_state: active combat with empty combatants (rejecting corrupt/race payload)', {
        system: 'playerCombat',
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

    const ilyaAssign = row.ilya_assigned_to ?? null
    set((state) => ({
      combatActive: row.active ?? false,
      combatRound: row.round ?? 1,
      combatCombatants: combatants,
      combatActiveCombatantIndex: activeIdx,
      ilyaAssignedTo: ilyaAssign,
      initiativePhase: row.initiative_phase ?? false,
      _combatStateSyncedAt: nextLast,
      characters: (Array.isArray(state.characters) ? state.characters : []).map((c) =>
        c.id === 'ilya' ? { ...c, assignedPcId: ilyaAssign } : c
      ),
    }))
  },

  fetchCombatantsForWrite: async () => {
    const { sessionRunId } = get()
    try {
      const { data } = await supabase
        .from('combat_state')
        .select('combatants')
        .eq('id', sessionRunId)
        .maybeSingle()
      const inMemory = get().combatCombatants
      let list = inMemory
      if (data?.combatants != null) {
        const parsed = parseCombatantsArray(data.combatants, 'fetchCombatantsForWrite')
        const active = get().combatActive
        if (parsed.length > 0) {
          list = parsed
        } else if (active && Array.isArray(inMemory) && inMemory.length > 0) {
          warnFallback('fetchCombatantsForWrite: DB returned empty list during active combat; using in-memory roster', {
            system: 'playerCombat',
          })
          list = inMemory
        } else {
          list = parsed
        }
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

  applyDamageToEnemy: async (combatantId, damage, attackerName, weaponName, damageType = null, options = {}) => {
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo, sessionRunId } = get()
    const rulesetContext = getRulesetContext()
    const combatCombatants = await get().fetchCombatantsForWrite()
    const target = combatCombatants.find(c => c.id === combatantId)
    if (!target) return

    const components = Array.isArray(options.components) && options.components.length > 0
      ? options.components
      : [{ amount: Math.max(0, Math.floor(Number(damage) || 0)), type: damageType }]

    const bundle = applyDamageComponentsBundle(components, {
      resistances: target.resistances,
      vulnerabilities: target.vulnerabilities,
      immunities: target.immunities,
    }, { usePipeline: featureFlags.rulesDamagePipeline })

    const hpLoss = bundle.totalFinal

    let tempHp = target.tempHp || 0
    let curHp = target.curHp
    let remaining = hpLoss
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

      const core = curHp === 0
        ? `${attackerName} → ${target.name} takes ${hpLoss} and goes DOWN!`
        : `${attackerName} hits ${target.name} with ${weaponName} for ${hpLoss} (${curHp}/${target.maxHp} HP)`
      const msg = appendDamagePipelineDetail(core, bundle.lines)
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: msg, type: 'damage', shared: true, timestamp: new Date().toISOString(),
        metadata: { kind: 'damage', target_id: combatantId },
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
        text: `${casterName} → ${target?.name ?? combatantId} is now ${condition}`,
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
    const components = [{ amount: Math.max(0, Math.floor(Number(amount) || 0)), type: damageType }]
    const bundle = applyDamageComponentsBundle(components, {
      resistances: combatRow?.resistances,
      vulnerabilities: combatRow?.vulnerabilities,
      immunities: combatRow?.immunities,
    }, { usePipeline: featureFlags.rulesDamagePipeline })
    const hpLoss = bundle.totalFinal
    let tempHp = combatRow?.tempHp || 0
    let remaining = hpLoss
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

    const typeStr = damageType ? ` [${damageType}]` : ''
    const displayName = staticChar?.name || target?.name || targetId

    try {
      await supabase.from('character_states').upsert({
        id: targetId, cur_hp: newHp, updated_at: new Date().toISOString(),
      })
      if (combatActive) {
        const core = `${sourceName}'s ${label}:${typeStr} ${hpLoss} → ${displayName} (${newHp}/${maxHp} HP)`
        const msg = appendDamagePipelineDetail(core, bundle.lines)
        await supabase.from('combat_feed').insert({
          session_id: sessionRunId, round: combatRound,
          text: msg, type: 'damage', shared: true, timestamp: new Date().toISOString(),
          metadata: { kind: 'damage', target_id: targetId },
        })
        const dmgToHp = remaining
        if (dmgToHp > 0 && target?.concentration) {
          const concDc = concentrationSaveDc(dmgToHp)
          const dcLine = formatDcWithLabel(concDc)
          await supabase.from('combat_feed').insert({
            session_id: sessionRunId, round: combatRound,
            text: `${displayName} is concentrating — CON save ${dcLine || `DC ${concDc}`} to maintain (lost ${dmgToHp} HP).`,
            type: 'system', shared: true, timestamp: new Date().toISOString(),
          })
        }
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

  /** Manual toggle while it's your turn (table correction / undo). */
  toggleMyActionEconomyField: async (characterId, field) => {
    const {
      combatActive, combatRound, combatActiveCombatantIndex, initiativePhase,
      ilyaAssignedTo, sessionRunId,
    } = get()
    if (!combatActive) return
    const list = await get().fetchCombatantsForWrite()
    const idx = list.findIndex((c) => c.id === characterId)
    if (idx < 0 || idx !== combatActiveCombatantIndex) return
    const keyMap = {
      action: 'actionAvailable',
      bonusAction: 'bonusActionAvailable',
      reaction: 'reactionAvailable',
    }
    const aeKey = keyMap[field]
    if (!aeKey) return
    const actor = list[idx]
    const ae = ensureActionEconomy(actor)
    const nextAe = { ...ae, [aeKey]: !ae[aeKey] }
    const updated = list.map((c, i) => (i === idx ? { ...c, actionEconomy: nextAe } : c))
    set({ combatCombatants: updated })
    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_state').upsert({
        id: sessionRunId,
        session_run_id: sessionRunId,
        active: combatActive,
        round: combatRound,
        combatants: updated,
        active_combatant_index: combatActiveCombatantIndex,
        initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts,
      })
      get().bumpCombatStateSyncedFromWrite(ts)
    } catch (e) {
      console.error('toggleMyActionEconomyField', e)
    }
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
