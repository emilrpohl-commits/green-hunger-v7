import { supabase } from '@shared/lib/supabase.js'
import { parseCastingTimeMeta } from '@shared/lib/combatRules.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { getRulesetContext, getSessionRunId } from '@shared/lib/runtimeContext.js'
import { buildPlayerPartyRuntimeList, mergeCharacterStateIntoRuntimeRow } from '@shared/lib/partyRoster.js'
import { applyHomebrewPlayerSheet, shouldSkipLegacyPlayerSanitize } from '@shared/lib/homebrewPlayerSheet.js'
import { applySpellHomebrewOverlays } from '@shared/lib/mergeSpellHomebrew.js'
import { fetchSessionWithContentById } from '@shared/lib/sessionTreeLoader.js'
import { normalizeSessionsFromDb, toPlayerNarrativeSession } from '@shared/lib/sessionContentNormalize.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { getPortraitPublicUrl } from '@shared/lib/portraitStorage.js'
import {
  filterValidCharacterRows,
  filterValidCharacterStateRows,
  filterValidSpellRows,
} from '@shared/lib/validation/storeBoundaries.js'
import { fetchSpellCompendiumAll } from '@shared/lib/spellCompendium/fetchPaged.js'
import { compendiumRowToPlayerEntry } from '@shared/lib/spellCompendium/mappers.js'
import { CHARACTERS } from '@shared/content/session1.js'
import { normalizeConditionName } from '@shared/lib/rules/conditionCatalog.js'
import { normalizeConditionsArray } from '@shared/lib/rules/conditionHydration.js'
import { applyLongRestHpOnly, applyLongRestExhaustion } from '@shared/lib/rules/restOrchestrator.js'
import {
  normalizeSpellId, mergeSpellWithOverride, toEngineCompendiumSpell,
  withSpellIds, sanitizeIlyaSheet,
} from './helpers.js'

const useBundledPlayerRuntime = !featureFlags.seedlessPlatform || featureFlags.demoCampaign
const PLAYER_RUNTIME_CHARACTERS = useBundledPlayerRuntime ? CHARACTERS.filter(c => !c.isNPC) : []

export const createDataSlice = (set, get) => ({
  spellCompendium: {},
  knownConditions: [],
  /** Phase 2D: surfaced in UI when character load fails or returns no valid rows */
  charactersLoadError: null,
  /** Phase 2B/D: no_active_session | session_not_found | incomplete_narrative | load_failed */
  sessionHydrationError: null,
  sessionHydrationDetail: null,

  /**
   * Phase 2B: hydrate narrative only for session_state.active_session_uuid (no first-session fallback).
   */
  hydratePlayerSessionFromUuid: async (sessionUuid) => {
    if (!sessionUuid) {
      set({
        session: null,
        sessionHydrationError: 'no_active_session',
        sessionHydrationDetail: null,
      })
      return
    }
    try {
      const raw = await fetchSessionWithContentById(supabase, sessionUuid)
      if (!raw) {
        set({
          session: null,
          sessionHydrationError: 'session_not_found',
          sessionHydrationDetail: sessionUuid,
        })
        return
      }
      const normalized = normalizeSessionsFromDb([raw])
      const active = normalized[0]
      const narrative = toPlayerNarrativeSession(active)
      if (narrative?.scenes?.length) {
        set({
          session: narrative,
          sessionHydrationError: null,
          sessionHydrationDetail: null,
        })
      } else {
        warnFallback('Player session DB tree has no scenes for narrative', {
          system: 'playerSession',
          id: sessionUuid,
        })
        set({
          session: null,
          sessionHydrationError: 'incomplete_narrative',
          sessionHydrationDetail: sessionUuid,
        })
      }
    } catch (e) {
      console.warn('hydratePlayerSessionFromUuid failed:', e?.message || e)
      set({
        session: null,
        sessionHydrationError: 'load_failed',
        sessionHydrationDetail: String(e?.message || e),
      })
    }
  },

  loadCharacters: async () => {
    const rulesetContext = getRulesetContext()
    const selectedRuleset = rulesetContext.active_ruleset === 'custom' ? '2024' : rulesetContext.active_ruleset
    try {
      const sessionRunId = getSessionRunId()
      const [
        { data: charRows },
        { data: spellRows },
        { data: spellsTableRows },
        { data: rulesSpellRows },
        { data: conditionRows },
        { data: sessionRow },
      ] = await Promise.all([
        supabase.from('characters').select('*'),
        supabase.from('character_spells').select('*').order('order_index'),
        supabase.from('spells').select('*'),
        featureFlags.use5eEngine
          ? supabase.from('rules_entities').select('*').eq('entity_type', 'spells').eq('ruleset', selectedRuleset)
          : Promise.resolve({ data: [] }),
        featureFlags.use5eEngine && featureFlags.engineConditions
          ? supabase.from('rules_entities').select('source_index,name,payload,ruleset,source_url').eq('entity_type', 'conditions').eq('ruleset', selectedRuleset)
          : Promise.resolve({ data: [] }),
        supabase.from('session_state').select('campaign_id').eq('id', sessionRunId).maybeSingle(),
      ])

      let spellCompendiumTableRows = []
      try {
        spellCompendiumTableRows = await fetchSpellCompendiumAll(supabase)
      } catch (e) {
        console.warn('spell_compendium load:', e?.message || e)
      }

      let spellOverlays = []
      const campaignId = sessionRow?.campaign_id
      if (campaignId) {
        const { data: ho } = await supabase
          .from('homebrew_overlays')
          .select('entity_type,canonical_ref,overlay_payload')
          .eq('campaign_id', campaignId)
          .eq('is_active', true)
        spellOverlays = ho || []
      }
      const validChars = filterValidCharacterRows(charRows || [])
      if (validChars.length === 0) {
        warnFallback('loadCharacters: no valid character rows from DB; keeping prior store state', {
          system: 'playerData',
          reason: 'empty_after_validation',
        })
        set({
          charactersLoadError: 'no_valid_characters',
          ...(useBundledPlayerRuntime
            ? {}
            : {
                characters: [],
                playerCharacters: withSpellIds({}),
                spellCompendium: {},
              }),
        })
        return
      }
      set({ charactersLoadError: null })

      const spellCompendium = {}
      for (const crow of spellCompendiumTableRows || []) {
        const entry = compendiumRowToPlayerEntry(crow)
        if (entry?.spellId) spellCompendium[entry.spellId] = entry
      }
      const compendiumTableSpellIds = new Set(Object.keys(spellCompendium))

      const spellsTableSpellToEntry = (row) => {
        const spellId = normalizeSpellId(row.spell_id || row.name)
        if (!spellId) return null
        const castingMeta = parseCastingTimeMeta(row.casting_time)
        const mechanic = row.rules_json?.inferred_mechanic || row.resolution_type || 'utility'
        const target = row.rules_json?.inferred_target
          || (row.target_mode && row.target_mode.startsWith('area') ? 'enemy' : null)
        return {
          spellId,
          source_index: row.source_index || spellId,
          compendiumSource: 'spells_table',
          soundEffectUrl: row.sound_effect_url || null,
          name: row.name,
          level: row.level,
          school: row.school,
          mechanic,
          castingTime: row.casting_time,
          actionType: castingMeta.actionType,
          isBonusAction: castingMeta.isBonusAction,
          isReaction: castingMeta.isReaction,
          range: row.range,
          duration: row.duration,
          ritual: !!row.ritual,
          concentration: !!row.concentration,
          description: row.description,
          higher_levels: row.higher_level_effect,
          saveType: row.save_type || row.save_ability || null,
          attack_type: row.attack_type,
          targetMode: row.target_mode || 'special',
          target,
          source: row.source || null,
          area: row.area || null,
          scaling: row.scaling || {},
          rules_json: row.rules_json || {},
          combatProfile: {
            resolutionType: row.resolution_type || 'special',
            targetMode: row.target_mode || 'special',
            saveAbility: row.save_ability || null,
            area: row.area || {},
            rules: row.rules_json || {},
          },
        }
      }

      ;(filterValidSpellRows(spellsTableRows || [])).forEach((row) => {
        const spellId = normalizeSpellId(row.spell_id || row.name)
        if (!spellId) return
        if (row.campaign_id == null) {
          if (compendiumTableSpellIds.has(spellId)) return
          const entry = spellsTableSpellToEntry(row)
          if (entry) spellCompendium[spellId] = entry
        } else if (campaignId && row.campaign_id === campaignId) {
          const entry = spellsTableSpellToEntry(row)
          if (entry) spellCompendium[spellId] = entry
        }
      })
      ;(rulesSpellRows || []).forEach((row) => {
        const mapped = toEngineCompendiumSpell(row)
        if (!mapped?.spellId) return
        if (!spellCompendium[mapped.spellId]) {
          spellCompendium[mapped.spellId] = mapped
        }
      })

      for (const k of Object.keys(spellCompendium)) {
        spellCompendium[k] = applySpellHomebrewOverlays(spellCompendium[k], spellOverlays)
      }

      const spellsByChar = {}
      if (spellRows) {
        for (const row of spellRows) {
          const cid = row.character_id
          if (!spellsByChar[cid]) spellsByChar[cid] = {}
          const key = row.slot_level === 'cantrip' ? 'cantrips' : row.slot_level
          if (!spellsByChar[cid][key]) spellsByChar[cid][key] = []
          const rowSpellId = normalizeSpellId(row.spell_id || row.spell_data?.spellId || row.spell_data?.name)
          const compendiumSpell = rowSpellId ? spellCompendium[rowSpellId] : null
          if (!compendiumSpell && (row.spell_data && Object.keys(row.spell_data).length > 0)) {
            warnFallback('Character spell merged from row.spell_data only (no compendium match)', {
              system: 'playerData',
              character_id: cid,
              spell_id: rowSpellId,
              source: 'merged',
            })
          }
          const baseSpell = compendiumSpell || row.spell_data || {}
          const mergedSpell = mergeSpellWithOverride(baseSpell, row.overrides_json || {})
          const mechanic = mergedSpell.mechanic || mergedSpell.combatProfile?.resolutionType || 'utility'
          const withCompat = {
            ...mergedSpell,
            spellId: rowSpellId || normalizeSpellId(mergedSpell.name),
            actionType: mergedSpell.actionType || parseCastingTimeMeta(mergedSpell.castingTime).actionType,
            isBonusAction: mergedSpell.isBonusAction ?? parseCastingTimeMeta(mergedSpell.castingTime).isBonusAction,
            isReaction: mergedSpell.isReaction ?? parseCastingTimeMeta(mergedSpell.castingTime).isReaction,
            mechanic,
            targetMode: mergedSpell.targetMode || mergedSpell.combatProfile?.targetMode || 'special',
            target: mergedSpell.target
              || (mergedSpell.targetMode && mergedSpell.targetMode.startsWith('area') ? 'enemy' : null),
            saveType: mergedSpell.saveType || mergedSpell.combatProfile?.saveAbility || null,
          }
          spellsByChar[cid][key].push(withCompat)
        }
      }

      const playerCharacters = {}
      for (const row of validChars) {
        const portraitUrl = getPortraitPublicUrl(row.portrait_thumb_storage_path || row.portrait_original_storage_path)
        let sheet = {
          id: row.id, name: row.name, password: row.password,
          class: row.class, subclass: row.subclass, level: row.level,
          species: row.species, background: row.background,
          player: row.player, isNPC: row.is_npc, isActive: row.is_active,
          assigned_pc_id: row.assigned_pc_id ?? null,
          image: row.image, colour: row.colour,
          portraitUrl: portraitUrl || row.image || null,
          portrait_original_storage_path: row.portrait_original_storage_path || null,
          portrait_thumb_storage_path: row.portrait_thumb_storage_path || null,
          portrait_crop: row.portrait_crop || null,
          stats: row.stats || {}, abilityScores: row.ability_scores || {},
          savingThrows: row.saving_throws || [], skills: row.skills || [],
          spellSlots: row.spell_slots || {}, sorceryPoints: row.sorcery_points || null,
          features: row.features || [], spells: spellsByChar[row.id] || {},
          weapons: row.weapons || [], healingActions: row.healing_actions || [],
          buffActions: row.buff_actions || [], equipment: row.equipment || [],
          magicItems: row.magic_items || [], passiveScores: row.passive_scores || {},
          senses: row.senses, languages: row.languages,
          backstory: row.backstory, homebrew_json: row.homebrew_json || {},
        }
        sheet = applyHomebrewPlayerSheet(sheet)
        if (sheet.id === 'ilya' && !shouldSkipLegacyPlayerSanitize(row.homebrew_json)) {
          sheet = sanitizeIlyaSheet(sheet)
        }
        playerCharacters[row.id] = sheet
      }
      const knownConditions = (conditionRows || []).map((row) => ({
        index: row.source_index,
        name: row.name,
        desc: Array.isArray(row.payload?.desc) ? row.payload.desc.join('\n\n') : (row.payload?.desc || ''),
      }))
      const runtimeCharacters = buildPlayerPartyRuntimeList(validChars, [], PLAYER_RUNTIME_CHARACTERS)
      set({
        playerCharacters: withSpellIds(playerCharacters),
        spellCompendium,
        knownConditions,
        characters: runtimeCharacters,
      })
    } catch (e) {
      warnFallback('Could not load characters from server; keeping prior store state', {
        system: 'playerData',
        reason: String(e?.message || e),
      })
      set({ charactersLoadError: 'fetch_failed' })
    }
  },

  loadInitialState: async () => {
    const { sessionRunId } = get()
    await get().loadCharacters()
    try {
      const { data: sessionData } = await supabase
        .from('session_state').select('*').eq('id', sessionRunId).maybeSingle()
      if (sessionData) {
        set({
          currentSceneIndex: sessionData.current_scene_index || 0,
          currentBeatIndex: sessionData.current_beat_index || 0,
        })
      }

      await get().hydratePlayerSessionFromUuid(sessionData?.active_session_uuid ?? null)

      const { data: charData } = await supabase.from('character_states').select('*')
      const validStates = filterValidCharacterStateRows(charData || [])
      if (validStates.length > 0) {
        const { characters } = get()
        const updated = characters.map((c) => {
          const saved = validStates.find((d) => d.id === c.id)
          if (!saved) return c
          return mergeCharacterStateIntoRuntimeRow({ ...c }, saved)
        })
        set({ characters: updated })
      }
      const { data: combatData } = await supabase
        .from('combat_state').select('*').eq('id', sessionRunId).single()
      if (combatData) {
        get().applyCombatStateRow(combatData)
      }
    } catch (e) {
      warnFallback('Could not load initial player state from server', {
        system: 'playerData',
        reason: String(e?.message || e),
      })
      set({
        sessionHydrationError: get().sessionHydrationError || 'load_failed',
        sessionHydrationDetail: String(e?.message || e),
      })
    }
  },

  canEditCharacterState: (characterId) => {
    const me = get().activeSessionUserId
    if (!me || me === 'party') return false
    if (characterId === me) return true
    const { ilyaAssignedTo } = get()
    if (characterId === 'ilya' && String(ilyaAssignedTo) === String(me)) return true
    const row = get().characters.find((c) => c.id === characterId)
    if (row?.isNPC && row?.assignedPcId != null && String(row.assignedPcId) === String(me)) return true
    return false
  },

  upsertCharacterStateRow: async (characterId, patch) => {
    if (!get().canEditCharacterState(characterId)) return
    const { characters } = get()
    const next = characters.map((c) => {
      if (c.id !== characterId) return c
      let merged = { ...c, ...patch }
      if (patch.tacticalJson && typeof patch.tacticalJson === 'object') {
        merged = {
          ...merged,
          tacticalJson: { ...(c.tacticalJson || {}), ...patch.tacticalJson },
        }
      }
      return merged
    })
    set({ characters: next })
    const char = next.find((c) => c.id === characterId)
    if (!char) return
    try {
      await supabase.from('character_states').upsert({
        id: characterId,
        cur_hp: char.curHp,
        temp_hp: char.tempHp,
        concentration: char.concentration,
        spell_slots: char.spellSlots,
        death_saves: char.deathSaves,
        conditions: char.conditions,
        green_marks: Math.max(0, Math.floor(Number(char.greenMarks) || 0)),
        tactical_json: char.tacticalJson && typeof char.tacticalJson === 'object' ? char.tacticalJson : {},
        updated_at: new Date().toISOString(),
      })
    } catch (e) {
      console.error('player upsertCharacterStateRow', e)
    }
  },

  updateMyCharacterHp: async (characterId, newHp) => {
    const c = get().characters.find((x) => x.id === characterId)
    if (!c || !get().canEditCharacterState(characterId)) return
    const curHp = Math.max(0, Math.min(c.maxHp, newHp))
    await get().upsertCharacterStateRow(characterId, { curHp })
  },

  updateMyCharacterTempHp: async (characterId, tempHp) => {
    if (!get().canEditCharacterState(characterId)) return
    await get().upsertCharacterStateRow(characterId, { tempHp: Math.max(0, tempHp) })
  },

  patchMyCharacterTacticalJson: async (characterId, partial) => {
    if (!get().canEditCharacterState(characterId)) return
    const c = get().characters.find((x) => x.id === characterId)
    const prev = c?.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}
    await get().upsertCharacterStateRow(characterId, { tacticalJson: { ...prev, ...partial } })
  },

  setMyCharacterConcentration: async (characterId, active, spellName = null) => {
    if (!get().canEditCharacterState(characterId)) return
    const c = get().characters.find((x) => x.id === characterId)
    const prev = c?.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}
    const tacticalJson = {
      ...prev,
      concentrationSpell: active ? (spellName ?? prev.concentrationSpell ?? '') : null,
    }
    await get().upsertCharacterStateRow(characterId, { concentration: !!active, tacticalJson })
  },

  setMyCharacterConditions: async (characterId, conditions) => {
    if (!get().canEditCharacterState(characterId)) return
    const next = normalizeConditionsArray(Array.isArray(conditions) ? conditions : [])
    await get().upsertCharacterStateRow(characterId, { conditions: next })
  },

  saveMyCharacterSheet: async (characterId, patch = {}) => {
    if (!get().canEditCharacterState(characterId)) return { error: 'not_allowed' }
    const payload = {
      updated_at: new Date().toISOString(),
    }
    if (patch.name != null) payload.name = String(patch.name || '').trim()
    if (patch.class != null) payload.class = String(patch.class || '').trim()
    if (patch.subclass != null) payload.subclass = String(patch.subclass || '').trim()
    if (patch.level != null) payload.level = Math.max(1, Math.min(20, Number(patch.level) || 1))
    if (patch.species != null) payload.species = String(patch.species || '').trim()
    if (patch.background != null) payload.background = String(patch.background || '').trim()
    if (patch.languages !== undefined) payload.languages = patch.languages == null ? null : String(patch.languages)
    if (patch.senses !== undefined) payload.senses = patch.senses == null ? null : String(patch.senses)
    if (patch.backstory !== undefined) payload.backstory = patch.backstory == null ? null : String(patch.backstory)
    if (patch.stats && typeof patch.stats === 'object') payload.stats = patch.stats
    if (patch.abilityScores && typeof patch.abilityScores === 'object') payload.ability_scores = patch.abilityScores
    if (Array.isArray(patch.savingThrows)) payload.saving_throws = patch.savingThrows
    if (Array.isArray(patch.skills)) payload.skills = patch.skills
    if (patch.spellSlots && typeof patch.spellSlots === 'object') payload.spell_slots = patch.spellSlots
    if (patch.sorceryPoints === null || (patch.sorceryPoints && typeof patch.sorceryPoints === 'object')) payload.sorcery_points = patch.sorceryPoints
    if (Array.isArray(patch.features)) payload.features = patch.features
    if (Array.isArray(patch.weapons)) payload.weapons = patch.weapons
    if (Array.isArray(patch.healingActions)) payload.healing_actions = patch.healingActions
    if (Array.isArray(patch.buffActions)) payload.buff_actions = patch.buffActions
    if (Array.isArray(patch.equipment)) payload.equipment = patch.equipment
    if (Array.isArray(patch.magicItems)) payload.magic_items = patch.magicItems
    if (patch.passiveScores && typeof patch.passiveScores === 'object') payload.passive_scores = patch.passiveScores

    const { data, error } = await supabase
      .from('characters')
      .update(payload)
      .eq('id', characterId)
      .select()
      .single()
    if (error) return { error: error.message }

    // Rehydrate map/runtime rows from DB shape to keep both apps in sync.
    await get().loadCharacters()
    return { data }
  },

  takeShortRest: async (characterId) => {
    if (!get().canEditCharacterState(characterId)) return { error: 'not_allowed' }
    const staticChar = get().playerCharacters[characterId]
    const prev = get().characters.find((c) => c.id === characterId)
    const prevTj = prev?.tacticalJson && typeof prev.tacticalJson === 'object' ? prev.tacticalJson : {}
    await get().upsertCharacterStateRow(characterId, {
      tacticalJson: { ...prevTj, lastShortRestAt: new Date().toISOString() },
    })
    const { combatActive, combatRound, sessionRunId } = get()
    if (combatActive && sessionRunId) {
      try {
        await supabase.from('combat_feed').insert({
          session_id: sessionRunId,
          round: combatRound,
          text: `${staticChar?.name || characterId} finishes a short rest — spend Hit Dice and recharge features per SRD.`,
          type: 'system',
          shared: true,
          timestamp: new Date().toISOString(),
        })
      } catch (e) {
        console.error('takeShortRest combat_feed', e)
      }
    }
    return { ok: true }
  },

  takeLongRest: async (characterId) => {
    if (!get().canEditCharacterState(characterId)) return { error: 'not_allowed' }
    const c = get().characters.find((x) => x.id === characterId)
    const staticChar = get().playerCharacters[characterId]
    if (!c) return { error: 'no_row' }
    const maxHp = staticChar?.stats?.maxHp ?? c.maxHp ?? 0
    const hpSnap = applyLongRestHpOnly({ maxHp, curHp: c.curHp })
    const prevTj = c.tacticalJson && typeof c.tacticalJson === 'object' ? c.tacticalJson : {}
    const exLv = Math.max(0, Math.min(6, Number(prevTj.exhaustionLevel) || 0))
    const exSnap = applyLongRestExhaustion({ exhaustionLevel: exLv })
    const slots = c.spellSlots && typeof c.spellSlots === 'object'
      ? JSON.parse(JSON.stringify(c.spellSlots))
      : {}
    for (const k of Object.keys(slots)) {
      const cell = slots[k]
      if (cell && typeof cell === 'object' && Number.isFinite(Number(cell.max))) {
        slots[k] = { ...cell, used: 0 }
      }
    }
    let nextConditions = normalizeConditionsArray(c.conditions || [])
    if (exSnap.exhaustionLevel > 0) {
      if (!nextConditions.some((x) => normalizeConditionName(x) === 'Exhaustion')) {
        nextConditions = [...nextConditions, 'Exhaustion']
      }
    } else {
      nextConditions = nextConditions.filter((x) => normalizeConditionName(x) !== 'Exhaustion')
    }
    await get().upsertCharacterStateRow(characterId, {
      curHp: hpSnap.curHp,
      tempHp: 0,
      spellSlots: slots,
      concentration: false,
      conditions: nextConditions,
      tacticalJson: {
        ...prevTj,
        exhaustionLevel: exSnap.exhaustionLevel,
        concentrationSpell: null,
      },
    })
    const { combatActive, combatRound, sessionRunId } = get()
    if (combatActive && sessionRunId) {
      try {
        await supabase.from('combat_feed').insert({
          session_id: sessionRunId,
          round: combatRound,
          text: `${staticChar?.name || characterId} finishes a long rest — HP restored, spell slots reset, exhaustion reduced, concentration cleared.`,
          type: 'system',
          shared: true,
          timestamp: new Date().toISOString(),
        })
      } catch (e) {
        console.error('takeLongRest combat_feed', e)
      }
    }
    return { ok: true }
  },
})
