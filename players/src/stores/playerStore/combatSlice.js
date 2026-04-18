import { supabase } from '@shared/lib/supabase.js'
import { consumeActionEconomy, ensureActionEconomy, encodeSavePrompt, makeSavePromptEnvelope } from '@shared/lib/combatRules.js'
import { getRulesetContext, setRulesetContext } from '@shared/lib/runtimeContext.js'
import { applyDamageComponentsBundle } from '@shared/lib/rules/damagePipeline.js'
import { appendDamagePipelineDetail } from '@shared/lib/combat/combatFeedFormat.js'
import { formatDcWithLabel } from '@shared/lib/rules/dcDisplay.js'
import { concentrationSaveDc } from '@shared/lib/rules/spellcastingRules.js'
import { logCombatResolutionEvent } from '@shared/lib/logCombatResolution.js'
import { parseCombatantsArray } from '@shared/lib/validation/storeBoundaries.js'
import { debugCombatTelemetry, warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { sanitizeCombatantForPlayer } from './helpers.js'
import { normalizeCombatantConditions } from '@shared/lib/rules/conditionHydration.js'
import { parseModNum } from '../../lib/diceHelpers.js'

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

  /** Local UI: concentration save after damage (controllers only). */
  concentrationSavePrompt: null,

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
    if (row.ruleset_context && typeof row.ruleset_context === 'object') {
      setRulesetContext(row.ruleset_context)
    } else {
      warnFallback('combat_state.ruleset_context missing; using local runtime context', {
        system: 'playerCombat',
        reason: 'missing_ruleset_context',
      })
    }
    let incomingTs = row.updated_at ? Date.parse(row.updated_at) : null
    if (incomingTs != null && Number.isNaN(incomingTs)) incomingTs = null
    const lastApplied = get()._combatStateSyncedAt
    if (incomingTs != null && lastApplied != null && incomingTs < lastApplied) {
      return { applied: false, reason: 'stale_timestamp' }
    }

    const prevCombatants = get().combatCombatants || []
    const combatants = parseCombatantsArray(row.combatants, 'applyCombatStateRow.combatants')
      .map((c) => normalizeCombatantConditions({ ...c, actionEconomy: ensureActionEconomy(c) }))
      .map(sanitizeCombatantForPlayer)

    if ((row.active ?? false) && combatants.length === 0 && prevCombatants.length > 0) {
      warnFallback('Skipped combat_state: active combat with empty combatants (rejecting corrupt/race payload)', {
        system: 'playerCombat',
        had: prevCombatants.length,
      })
      return { applied: false, reason: 'empty_active_payload' }
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
    set((state) => {
      const byId = new Map(combatants.map((c) => [c.id, c]))
      const runtimeCharacters = Array.isArray(state.characters) ? state.characters : []
      const reconciledCharacters = runtimeCharacters.map((character) => {
        const combatant = byId.get(character.id)
        if (!combatant) return character
        // During active combat, combat_state owns combat-critical values.
        return {
          ...character,
          curHp: combatant.curHp ?? character.curHp,
          tempHp: combatant.tempHp ?? character.tempHp,
          concentration: combatant.concentration ?? character.concentration,
          conditions: Array.isArray(combatant.conditions) ? combatant.conditions : character.conditions,
          deathSaves: combatant.deathSaves ?? character.deathSaves,
        }
      })
      const prompt = state.concentrationSavePrompt
      const pid = prompt?.characterId
      let nextConcPrompt = prompt
      if (pid) {
        const ch = reconciledCharacters.find((c) => c.id === pid)
        if (!ch?.concentration) nextConcPrompt = null
      }
      return {
        combatActive: row.active ?? false,
        combatRound: row.round ?? 1,
        combatCombatants: combatants,
        combatActiveCombatantIndex: activeIdx,
        ilyaAssignedTo: ilyaAssign,
        initiativePhase: row.initiative_phase ?? false,
        _combatStateSyncedAt: nextLast,
        characters: reconciledCharacters.map((c) =>
          c.id === 'ilya' ? { ...c, assignedPcId: ilyaAssign } : c
        ),
        concentrationSavePrompt: nextConcPrompt,
      }
    })
    return { applied: true }
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
    }, { usePipeline: rulesetContext.rulesDamagePipeline !== false })

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
    const combatActionId = `pc-dmg-${Date.now()}-${combatantId}`
    debugCombatTelemetry('player.damage.start', {
      combatActionId,
      combatantId,
      hpLoss,
      round: combatRound,
    })
    try {
      const core = curHp === 0
        ? `${attackerName} → ${target.name} takes ${hpLoss} and goes DOWN!`
        : `${attackerName} hits ${target.name} with ${weaponName} for ${hpLoss} (${curHp}/${target.maxHp} HP)`
      const msg = appendDamagePipelineDetail(core, bundle.lines)
      const { data, error } = await supabase.rpc('apply_combat_damage', {
        p_session_id: sessionRunId,
        p_combatant_id: combatantId,
        p_new_cur_hp: curHp,
        p_new_temp_hp: tempHp,
        p_round: combatRound,
        p_message: msg,
        p_shared: true,
        p_metadata: { kind: 'damage', target_id: combatantId, combat_action_id: combatActionId },
        p_combat_active: combatActive,
        p_active_combatant_index: get().combatActiveCombatantIndex,
        p_initiative_phase: initiativePhase,
        p_ilya_assigned_to: ilyaAssignedTo,
        p_ruleset_context: rulesetContext,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      const syncedAt = row?.updated_at || ts
      get().bumpCombatStateSyncedFromWrite(syncedAt)
      const remoteCombatants = row?.updated_combatants
      if (Array.isArray(remoteCombatants)) {
        set({ combatCombatants: remoteCombatants.map(sanitizeCombatantForPlayer) })
      }
      debugCombatTelemetry('player.damage.rpc_applied', {
        combatActionId,
        updatedAt: row?.updated_at || ts,
      })
    } catch (e) {
      warnFallback('applyDamageToEnemy RPC failed; using fallback state+feed sync', {
        system: 'playerCombat',
        reason: String(e?.message || e),
        combatantId,
      })
      try {
        await supabase.from('combat_feed').insert({
          session_id: sessionRunId,
          round: combatRound,
          text: appendDamagePipelineDetail(
            curHp === 0
              ? `${attackerName} → ${target.name} takes ${hpLoss} and goes DOWN!`
              : `${attackerName} hits ${target.name} with ${weaponName} for ${hpLoss} (${curHp}/${target.maxHp} HP)`,
            bundle.lines
          ),
          type: 'damage',
          shared: true,
          timestamp: ts,
          metadata: { kind: 'damage', target_id: combatantId, combat_action_id: combatActionId },
        })
        const { data: csRow } = await supabase.from('combat_state').upsert({
          id: sessionRunId,
          session_run_id: sessionRunId,
          active: combatActive,
          round: combatRound,
          combatants: updatedCombatants,
          active_combatant_index: get().combatActiveCombatantIndex,
          initiative_phase: initiativePhase,
          ilya_assigned_to: ilyaAssignedTo,
          ruleset_context: rulesetContext,
          updated_at: ts,
        }).select('updated_at').maybeSingle()
        get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
        debugCombatTelemetry('player.damage.fallback_applied', {
          combatActionId,
          updatedAt: ts,
        })
      } catch (fallbackErr) {
        console.error('Failed to apply damage fallback:', fallbackErr)
      }
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
      const { data: csRow } = await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updatedCombatants, initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo, ruleset_context: rulesetContext,
        updated_at: ts
      }).select('updated_at').maybeSingle()
      get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
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
    } catch (e) {
      warnFallback('applyHealingToCharacter: character_states upsert failed', {
        system: 'playerCombat',
        reason: String(e?.message || e),
        targetId,
      })
    }

    const msg = `${healerName} uses ${spellName} on ${staticChar?.name || targetId} for ${amount} HP (${newHp}/${maxHp})`
    if (!combatActive) return

    const list = await get().fetchCombatantsForWrite()
    const updatedCombatants = list.map(c =>
      c.id === targetId ? { ...c, curHp: newHp } : c
    )
    if (updatedCombatants.some(c => c.id === targetId)) {
      set({ combatCombatants: updatedCombatants })
      const ts = new Date().toISOString()
      const { initiativePhase, ilyaAssignedTo } = get()
      try {
        const { data: csRow } = await supabase.from('combat_state').upsert({
          id: sessionRunId, session_run_id: sessionRunId,
          active: combatActive, round: combatRound,
          combatants: updatedCombatants, initiative_phase: initiativePhase,
          ilya_assigned_to: ilyaAssignedTo, updated_at: ts
        }).select('updated_at').maybeSingle()
        get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
      } catch (e) {
        warnFallback('applyHealingToCharacter: combat_state upsert failed', {
          system: 'playerCombat',
          reason: String(e?.message || e),
          targetId,
        })
      }
    }

    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: msg, type: 'heal', shared: true, timestamp: new Date().toISOString()
      })
    } catch (e) {
      warnFallback('applyHealingToCharacter: combat_feed insert failed', {
        system: 'playerCombat',
        reason: String(e?.message || e),
        targetId,
      })
    }
  },

  applyHealingToEnemy: async (combatantId, amount, healerName, source = 'Dice roller') => {
    if (!combatantId || !amount || amount <= 0) return
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo, sessionRunId } = get()
    const combatCombatants = await get().fetchCombatantsForWrite()
    const target = combatCombatants.find(c => c.id === combatantId)
    if (!target) return

    const healAmount = Math.max(0, Math.floor(Number(amount) || 0))
    const maxHp = Number(target.maxHp || 0)
    const curHp = Number(target.curHp || 0)
    const newHp = Math.min(maxHp, curHp + healAmount)

    const updatedCombatants = combatCombatants.map(c =>
      c.id === combatantId ? { ...c, curHp: newHp } : c
    )
    set({ combatCombatants: updatedCombatants })

    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        round: combatRound,
        text: `${healerName} restores ${healAmount} HP to ${target.name} via ${source} (${newHp}/${maxHp} HP)`,
        type: 'heal',
        shared: true,
        timestamp: ts,
        metadata: { kind: 'heal', target_id: combatantId },
      })
      const { data: csRow } = await supabase.from('combat_state').upsert({
        id: sessionRunId,
        session_run_id: sessionRunId,
        active: combatActive,
        round: combatRound,
        combatants: updatedCombatants,
        active_combatant_index: get().combatActiveCombatantIndex,
        initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts,
      }).select('updated_at').maybeSingle()
      get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
    } catch (e) {
      console.error('Failed to apply healing to enemy:', e)
    }
  },


  applyDamageToCharacter: async (targetId, amount, sourceName, label, damageType = null, options = {}) => {
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
    const components = Array.isArray(options.components) && options.components.length > 0
      ? options.components
      : [{ amount: Math.max(0, Math.floor(Number(amount) || 0)), type: damageType }]
    const bundle = applyDamageComponentsBundle(components, {
      resistances: combatRow?.resistances,
      vulnerabilities: combatRow?.vulnerabilities,
      immunities: combatRow?.immunities,
    }, { usePipeline: rulesetContext.rulesDamagePipeline !== false })
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
    } catch (e) {
      warnFallback('applyDamageToCharacter: character_states upsert failed', {
        system: 'playerCombat',
        reason: String(e?.message || e),
        targetId,
      })
    }

    if (!combatActive) return
    const core = `${sourceName}'s ${label}:${typeStr} ${hpLoss} → ${displayName} (${newHp}/${maxHp} HP)`
    const msg = appendDamagePipelineDetail(core, bundle.lines)
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId, round: combatRound,
        text: msg, type: 'damage', shared: true, timestamp: new Date().toISOString(),
        metadata: { kind: 'damage', target_id: targetId },
      })
    } catch (e) {
      warnFallback('applyDamageToCharacter: combat_feed insert failed', {
        system: 'playerCombat',
        reason: String(e?.message || e),
        targetId,
      })
    }

    const dmgToHp = remaining
    if (dmgToHp > 0 && target?.concentration) {
      const concDc = concentrationSaveDc(dmgToHp)
      const dcLine = formatDcWithLabel(concDc)
      const useLocalPrompt = get().canEditCharacterState(targetId)
      const spellNmRaw = target?.tacticalJson?.concentrationSpell ?? target?.concentrationSpell ?? 'your spell'
      const spellName = typeof spellNmRaw === 'string' && spellNmRaw.trim() ? spellNmRaw.trim() : 'your spell'

      if (useLocalPrompt) {
        const prev = get().concentrationSavePrompt
        const nextDc = prev && prev.characterId === targetId
          ? Math.max(Number(prev.dc) || 0, concDc)
          : concDc
        set({
          concentrationSavePrompt: {
            dc: nextDc,
            spellName,
            characterId: targetId,
            d20: null,
            conMod: null,
            total: null,
            passed: null,
          },
        })
      } else {
        try {
          await get().pushSavePrompt({
            promptId: `${Date.now()}-concentration-${targetId}`,
            spellName: 'Concentration',
            casterId: sourceName || 'system',
            casterName: sourceName || 'System',
            saveAbility: 'CON',
            saveDc: concDc,
            targets: [{ id: targetId, name: displayName }],
            damage: null,
            effect: {
              name: 'Concentration',
              mechanic: 'Lose concentration on failed save',
            },
            effect_kinds: ['concentration'],
            resolution_path: 'save',
            isConcentrationCheck: true,
            raw: {
              note: `${displayName} is concentrating — CON save ${dcLine || `DC ${concDc}`} to maintain (lost ${dmgToHp} HP).`,
            },
          })
        } catch (e) {
          warnFallback('applyDamageToCharacter: concentration save prompt failed', {
            system: 'playerCombat',
            reason: String(e?.message || e),
            targetId,
          })
        }
      }
    }

    const updatedCombatants = list.map(c => {
      if (c.id !== targetId) return c
      return { ...c, curHp: newHp, tempHp }
    })
    if (updatedCombatants.some(c => c.id === targetId)) {
      set({ combatCombatants: updatedCombatants })
      const ts = new Date().toISOString()
      try {
        const { data: csRow } = await supabase.from('combat_state').upsert({
          id: sessionRunId, session_run_id: sessionRunId,
          active: combatActive, round: combatRound,
          combatants: updatedCombatants, active_combatant_index: combatActiveCombatantIndex,
          initiative_phase: initiativePhase, ilya_assigned_to: ilyaAssignedTo,
          ruleset_context: rulesetContext, updated_at: ts,
        }).select('updated_at').maybeSingle()
        get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
      } catch (e) {
        warnFallback('applyDamageToCharacter: combat_state upsert failed', {
          system: 'playerCombat',
          reason: String(e?.message || e),
          targetId,
        })
      }
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
      warnFallback('useSpellSlot: character_states upsert failed', {
        system: 'playerCombat',
        characterId,
        reason: String(e?.message || e),
      })
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
      const { data: csRow } = await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updated, ilya_assigned_to: ilyaAssignedTo,
        initiative_phase: initiativePhase, updated_at: ts
      }).select('updated_at').maybeSingle()
      get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
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
      const { data: csRow } = await supabase.from('combat_state').upsert({
        id: sessionRunId, session_run_id: sessionRunId,
        active: combatActive, round: combatRound,
        combatants: updatedCombatants, active_combatant_index: combatActiveCombatantIndex,
        initiative_phase: initiativePhase, ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts
      }).select('updated_at').maybeSingle()
      get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
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
      const { data: csRow } = await supabase.from('combat_state').upsert({
        id: sessionRunId,
        session_run_id: sessionRunId,
        active: combatActive,
        round: combatRound,
        combatants: updated,
        active_combatant_index: combatActiveCombatantIndex,
        initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts,
      }).select('updated_at').maybeSingle()
      get().bumpCombatStateSyncedFromWrite(csRow?.updated_at || ts)
    } catch (e) {
      console.error('toggleMyActionEconomyField', e)
    }
  },

  dismissConcentrationSave: () => set({ concentrationSavePrompt: null }),

  rollConcentrationSave: async () => {
    const { concentrationSavePrompt, characters, playerCharacters } = get()
    if (!concentrationSavePrompt?.characterId) return
    const { characterId, dc } = concentrationSavePrompt
    const char = characters.find((c) => c.id === characterId)
    const saveEntry = (char?.savingThrows || []).find((s) => String(s.name || '').toUpperCase() === 'CON')
    const conMod = parseModNum(saveEntry?.mod ?? 0)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + conMod
    const passed = total >= (Number(dc) || 10)

    set({
      concentrationSavePrompt: {
        ...concentrationSavePrompt,
        d20,
        conMod,
        total,
        passed,
      },
    })

    if (!passed) {
      await get().setMyCharacterConcentration(characterId, false)
    }

    const rollLabel = conMod >= 0 ? `+${conMod}` : `${conMod}`
    const charName = playerCharacters?.[characterId]?.name || char?.name || characterId
    await get().pushRoll(
      `CON save (concentration DC ${dc}): d20(${d20}) ${rollLabel} = ${total} → ${passed ? 'success' : 'fail'}`,
      charName,
      { metadata: { kind: 'concentration_save', passed, dc } },
    )
  },

  pushRoll: async (text, charName, options = {}) => {
    const { combatRound, sessionRunId } = get()
    const { shared = true, visibility = null, targetId = null, metadata = null } = options || {}
    try {
      const row = {
        session_id: sessionRunId, round: combatRound,
        text: `[${charName}] ${text}`, type: 'roll', shared,
        timestamp: new Date().toISOString()
      }
      if (visibility) row.visibility = visibility
      if (targetId) row.target_id = targetId
      if (metadata && typeof metadata === 'object') row.metadata = metadata
      await supabase.from('combat_feed').insert(row)
    } catch (e) {
      console.warn('pushRoll failed:', e?.message || e)
    }
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
        payload: envelope,
        visibility: 'targeted', prompt_status: 'pending', metadata,
        timestamp: new Date().toISOString()
      })
      await logCombatResolutionEvent(supabase, {
        sessionRunId, round: combatRound, kind: 'save_prompt', payload: metadata,
      })
    } catch (e) {
      console.warn('pushSavePrompt failed:', e?.message || e)
    }
  },
})
