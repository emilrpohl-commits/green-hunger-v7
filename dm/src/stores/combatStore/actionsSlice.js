import { supabase } from '@shared/lib/supabase.js'
import { makeActionEconomy, consumeActionEconomy, sortCombatantsByInitiative, applyDeterministicRollModifiers, encodeSavePrompt, normalizeEffectRecord } from '@shared/lib/combatRules.js'
import { useSessionStore } from '../sessionStore.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { getRulesetContext } from '@shared/lib/runtimeContext.js'
import { normalizeConditionName } from '@shared/lib/rules/conditionCatalog.js'
import { normalizeCombatantConditions } from '@shared/lib/rules/conditionHydration.js'
import { applyDamageComponentsBundle } from '@shared/lib/rules/damagePipeline.js'
import { appendDamagePipelineDetail } from '@shared/lib/combat/combatFeedFormat.js'
import { autoFailSaveFromConditions } from '@shared/lib/rules/criticalConditionRules.js'

const isDevBuild = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV

export const createActionsSlice = (set, get) => ({
  savePrompts: [],
  markCombatantDeathSave: async (combatantId, type, delta = 1) => {
    if (type !== 'successes' && type !== 'failures') return
    const { combatants } = get()
    const updated = combatants.map((c) => {
      if (c.id !== combatantId) return c
      const current = c.deathSaves && typeof c.deathSaves === 'object'
        ? c.deathSaves
        : { successes: 0, failures: 0 }
      const d = Number.isFinite(Number(delta)) ? Number(delta) : 0
      return {
        ...c,
        deathSaves: {
          ...current,
          [type]: Math.max(0, Math.min(3, Number(current[type] || 0) + d)),
        },
      }
    })
    set({ combatants: updated })
    await get().syncCombatState()
  },
  emitRestEvent: async (restType = 'short') => {
    const normalized = restType === 'long' ? 'long' : 'short'
    const { sessionRunId, round } = get()
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        session_run_id: sessionRunId,
        round,
        text: normalized === 'long' ? 'Long Rest' : 'Short Rest',
        type: 'rest',
        payload: { restType: normalized },
        shared: true,
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      console.error('emitRestEvent failed', e)
    }
  },

  damageCombatant: async (combatantId, amount, damageType = null, options = {}) => {
    const { combatants, round, active, activeCombatantIndex, initiativePhase, ilyaAssignedTo, sessionRunId } = get()
    const combatant = combatants.find(c => c.id === combatantId)
    if (!combatant) {
      console.warn('damageCombatant ignored: target not found', { combatantId, amount, damageType })
      if (isDevBuild) {
        await get().pushFeedEvent(
          `[Debug] DM damage ignored: target not found (${combatantId || 'unknown'})`,
          'system',
          false
        )
      }
      return
    }

    const components = Array.isArray(options.components) && options.components.length > 0
      ? options.components
      : [{ amount: Math.max(0, Math.floor(Number(amount) || 0)), type: damageType }]

    const rulesetContext = getRulesetContext()
    const bundle = applyDamageComponentsBundle(components, {
      resistances: combatant.resistances,
      vulnerabilities: combatant.vulnerabilities,
      immunities: combatant.immunities,
    }, { usePipeline: rulesetContext.rulesDamagePipeline !== false })

    const hpLoss = bundle.totalFinal
    if (!(hpLoss > 0)) {
      console.warn('damageCombatant ignored: no effective HP loss', {
        combatantId,
        amount,
        damageType,
        components,
        hpLoss,
      })
      if (isDevBuild) {
        await get().pushFeedEvent(
          `[Debug] DM damage ignored: no effective HP loss (${combatant.name})`,
          'system',
          false
        )
      }
      return
    }

    let newTempHp = combatant.tempHp
    let newHp = combatant.curHp
    let remaining = hpLoss

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
    const core = newHp === 0
      ? `${combatant.name} is DOWN (0 HP).`
      : `${combatant.name} takes ${hpLoss} damage (${newHp}/${combatant.maxHp} HP)`
    const msg = appendDamagePipelineDetail(core, bundle.lines)
    try {
      const { data, error } = await supabase.rpc('apply_combat_damage', {
        p_session_id: sessionRunId,
        p_combatant_id: combatantId,
        p_new_cur_hp: newHp,
        p_new_temp_hp: newTempHp,
        p_round: round,
        p_message: msg,
        p_shared: isShared,
        p_metadata: {
          kind: 'damage',
          target_id: combatantId,
          combat_action_id: `dmg-${Date.now()}`,
        },
        p_combat_active: active,
        p_active_combatant_index: activeCombatantIndex,
        p_initiative_phase: initiativePhase,
        p_ilya_assigned_to: ilyaAssignedTo,
        p_ruleset_context: rulesetContext,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (Array.isArray(row?.updated_combatants)) {
        set({ combatants: row.updated_combatants.map((c) => normalizeCombatantConditions({ ...c, actionEconomy: c.actionEconomy || makeActionEconomy() })) })
      }
      if (combatant.type === 'player') {
        const sheetRow = get().combatants.find((c) => c.id === combatantId)
        const sheetCurHp = sheetRow != null ? sheetRow.curHp : newHp
        const sheetTempHp = sheetRow != null ? sheetRow.tempHp : newTempHp
        const sheetTs = row?.updated_at || new Date().toISOString()
        try {
          await supabase.from('character_states').upsert({
            id: combatantId,
            cur_hp: sheetCurHp,
            temp_hp: sheetTempHp,
            updated_at: sheetTs,
          })
        } catch (sheetErr) {
          console.error('Failed to sync character_states after combat damage:', sheetErr)
        }
      }
    } catch (e) {
      console.error('Failed to apply combat damage atomically:', e)
      try {
        await get().pushFeedEvent(msg, 'damage', isShared, {
          kind: 'damage',
          target_id: combatantId,
          combat_action_id: `dmg-${Date.now()}`,
        })
      } catch (feedErr) {
        console.error('Fallback feed write failed after damage error:', feedErr)
      }
      try {
        await get().syncCombatState()
      } catch (syncErr) {
        console.error('Fallback combat_state sync failed after damage error:', syncErr)
      }
      if (combatant.type === 'player') {
        const sheetRow = get().combatants.find((c) => c.id === combatantId)
        try {
          await supabase.from('character_states').upsert({
            id: combatantId,
            cur_hp: sheetRow != null ? sheetRow.curHp : newHp,
            temp_hp: sheetRow != null ? sheetRow.tempHp : newTempHp,
            updated_at: new Date().toISOString(),
          })
        } catch (sheetErr) {
          console.error('Fallback character_states sync failed after combat damage:', sheetErr)
        }
      }
    }
  },

  healCombatant: async (combatantId, amount) => {
    const { combatants } = get()
    const combatant = combatants.find(c => c.id === combatantId)
    if (!combatant) {
      console.warn('healCombatant ignored: target not found', { combatantId, amount })
      if (isDevBuild) {
        await get().pushFeedEvent(
          `[Debug] DM heal ignored: target not found (${combatantId || 'unknown'})`,
          'system',
          false
        )
      }
      return
    }

    const actualAmount = parseInt(amount) || 0
    if (!(actualAmount > 0)) {
      console.warn('healCombatant ignored: non-positive amount', { combatantId, amount, actualAmount })
      if (isDevBuild) {
        await get().pushFeedEvent(
          `[Debug] DM heal ignored: invalid amount (${String(amount)})`,
          'system',
          false
        )
      }
      return
    }
    const newHp = Math.min(combatant.maxHp, combatant.curHp + actualAmount)
    if (newHp === combatant.curHp) {
      console.warn('healCombatant no-op: already at max or unchanged', {
        combatantId,
        curHp: combatant.curHp,
        maxHp: combatant.maxHp,
        requested: actualAmount,
      })
      if (isDevBuild) {
        await get().pushFeedEvent(
          `[Debug] DM heal no-op: ${combatant.name} already unchanged at ${combatant.curHp}/${combatant.maxHp}`,
          'system',
          false
        )
      }
      return
    }
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
    if (combatant.type === 'player') {
      const sheetRow = get().combatants.find((c) => c.id === combatantId)
      try {
        await supabase.from('character_states').upsert({
          id: combatantId,
          cur_hp: sheetRow != null ? sheetRow.curHp : newHp,
          temp_hp: sheetRow != null ? (sheetRow.tempHp ?? 0) : (combatant.tempHp ?? 0),
          updated_at: new Date().toISOString(),
        })
      } catch (sheetErr) {
        console.error('Failed to sync character_states after combat heal:', sheetErr)
      }
    }
  },

  toggleCondition: async (combatantId, condition) => {
    const { combatants } = get()
    let conditionName = normalizeConditionName(condition)
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
          if (lookup?.name) conditionName = normalizeConditionName(lookup.name)
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
    const norm = (x) => normalizeConditionName(x)
    const isExhaustion = norm(conditionName).toLowerCase() === 'exhaustion'
    const updated = combatants.map((c) => {
      if (c.id !== combatantId) return normalizeCombatantConditions(c)
      const list = c.conditions || []
      const has = list.some((x) => norm(x) === norm(conditionName))
      const forcesConcentrationDrop = ['incapacitated', 'unconscious'].includes(String(conditionName || '').toLowerCase())
      let next
      if (has) {
        next = {
          ...c,
          conditions: list.filter((x) => norm(x) !== norm(conditionName)),
          ...(isExhaustion ? { exhaustionLevel: 0 } : {}),
        }
      } else {
        next = {
          ...c,
          conditions: [...list, conditionName],
          ...(forcesConcentrationDrop ? {
            concentration: false,
            tacticalJson: {
              ...(c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}),
              concentrationSpell: null,
            },
          } : {}),
          ...(isExhaustion
            ? { exhaustionLevel: Math.max(1, Math.min(6, Number(c.exhaustionLevel) || 1)) }
            : {}),
        }
      }
      return normalizeCombatantConditions(next)
    })
    set({ combatants: updated })
    await get().syncCombatState()
  },

  setCombatantExhaustionLevel: async (combatantId, level) => {
    const { combatants } = get()
    const n = Math.max(0, Math.min(6, Math.floor(Number(level) || 0)))
    const updated = combatants.map((c) => {
      if (c.id !== combatantId) return normalizeCombatantConditions(c)
      return normalizeCombatantConditions({ ...c, exhaustionLevel: n })
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

  addEffect: async (combatantId, effect) => {
    const { combatants } = get()
    const normalizedEffect = normalizeEffectRecord(effect)
    const updated = combatants.map(c => {
      if (c.id !== combatantId) return c
      const effects = c.effects || []
      if (effects.find(e => e.name === normalizedEffect.name)) return c
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
    const forcedFail = autoFailSaveFromConditions(target.conditions || [], prompt.saveAbility)
    const total = mode === 'manual'
      ? (parseInt(manualTotal, 10) || 0)
      : (forcedFail ? -999 : rolled.total)
    const success = total >= (prompt.saveDc || 10)
    const dmg = prompt.damage?.amount || 0
    const applyDmg = success ? (prompt.damage?.halfOnSuccess ? Math.floor(dmg / 2) : 0) : dmg

    if (applyDmg > 0) await get().damageCombatant(targetId, applyDmg, prompt.damage?.type || null)
    if (!success && prompt.effect?.name) {
      await get().addEffect(targetId, {
        name: prompt.effect.name,
        mechanic: prompt.effect.mechanic || '',
        source: prompt.casterName || null,
        colour: '#a060c0',
      })
    }
    if (!success && (prompt.isConcentrationCheck || String(prompt.spellName || '').toLowerCase() === 'concentration')) {
      const nextCombatants = combatants.map((c) => (
        c.id === targetId
          ? {
              ...c,
              concentration: false,
              tacticalJson: {
                ...(c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}),
                concentrationSpell: null,
              },
            }
          : c
      ))
      set({ combatants: nextCombatants })
      try {
        await supabase.from('character_states').upsert({
          id: targetId,
          concentration: false,
          tactical_json: {
            ...(target.tacticalJson && typeof target.tacticalJson === 'object' ? target.tacticalJson : {}),
            concentrationSpell: null,
          },
          updated_at: new Date().toISOString(),
        })
      } catch {}
      await get().pushFeedEvent(`${target.name} loses concentration.`, 'system', true)
      await get().syncCombatState()
    }
    const resolutionText = `${target.name} ${prompt.saveAbility} save vs ${prompt.spellName} DC ${prompt.saveDc}: ${forcedFail ? 'AUTO-FAIL' : total} (${success ? 'SUCCESS' : 'FAIL'})${applyDmg > 0 ? `, damage ${applyDmg}` : ''}`
    const { feed, round } = get()
    const event = { id: Date.now(), round, text: resolutionText, type: 'save-prompt-resolved', shared: true, timestamp: new Date().toISOString() }
    set({ feed: [event, ...feed].slice(0, 80) })
    const { sessionRunId } = get()
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        round,
        text: encodeSavePrompt({ promptId: prompt.promptId, resolutionText }),
        payload: { promptId: prompt.promptId, resolutionText },
        type: 'save-prompt-resolved',
        shared: true,
        visibility: 'player_visible',
        prompt_status: 'resolved',
        timestamp: event.timestamp
      })
    } catch (e) {}
    set(state => ({ savePrompts: state.savePrompts.map(p => p.promptId === prompt.promptId ? { ...p, resolved: true } : p) }))
  },

  nextTurn: async () => {
    const { combatants, activeCombatantIndex, round } = get()
    const n = combatants.length
    if (n === 0) return
    const eligible = (c) => !!c && (c.type === 'player' || (c.type === 'enemy' && c.curHp > 0))
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
    if (!eligible(combatants[idx])) {
      const j = combatants.findIndex(eligible)
      if (j >= 0) idx = j
    }
    const updatedCombatants = combatants.map((c, i) => {
      if (i === idx) return { ...c, actionEconomy: makeActionEconomy() }
      return c
    }).map((c) => {
      const rows = Array.isArray(c.conditionMetadata) ? c.conditionMetadata : []
      if (rows.length === 0) return c
      const nextRows = rows
        .map((row) => {
          if (!row || typeof row !== 'object') return row
          const duration = row.duration
          if (!duration || typeof duration !== 'object') return row
          if (duration.type !== 'turns') return row
          const value = Math.max(0, Math.floor(Number(duration.value) || 0) - 1)
          return { ...row, duration: { ...duration, value } }
        })
        .filter((row) => {
          const duration = row?.duration
          if (!duration || typeof duration !== 'object') return true
          if (duration.type !== 'turns') return true
          return (Math.floor(Number(duration.value) || 0) > 0)
        })
      if (nextRows.length === rows.length) return c
      return { ...c, conditionMetadata: nextRows }
    })
    set({ activeCombatantIndex: idx, round: newRound, combatants: updatedCombatants })
    await get().pushFeedEvent(`${combatants[idx]?.name}'s turn.`, 'turn', false)
    await get().syncCombatState()
  },

  prevTurn: async () => {
    const { combatants, activeCombatantIndex, round } = get()
    const n = combatants.length
    if (n === 0) return
    const eligible = (c) => !!c && (c.type === 'player' || (c.type === 'enemy' && c.curHp > 0))
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
    if (!eligible(combatants[idx])) {
      const j = combatants.findIndex(eligible)
      if (j >= 0) idx = j
    }
    set({ activeCombatantIndex: idx, round: newRound })
    await get().syncCombatState()
  },

  sortInitiative: async () => {
    const { combatants } = get()
    const sorted = sortCombatantsByInitiative(combatants)
    set({ combatants: sorted, activeCombatantIndex: 0, initiativePhase: false })
    await get().syncCombatState()
  },

  setInitiative: async (combatantId, value) => {
    const { combatants } = get()
    const updated = combatants.map(c =>
      c.id === combatantId ? { ...c, initiative: parseInt(value) || 0, initiativeSet: true } : c
    )
    set({ combatants: updated })
    await get().syncCombatState()
  },

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
})
