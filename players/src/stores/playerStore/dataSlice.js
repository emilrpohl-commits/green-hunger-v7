import { supabase } from '@shared/lib/supabase.js'
import { parseCastingTimeMeta } from '@shared/lib/combatRules.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { getRulesetContext, getSessionRunId } from '@shared/lib/runtimeContext.js'
import { buildPlayerRuntimeCharacters } from '@shared/lib/partyRoster.js'
import { applyHomebrewPlayerSheet, shouldSkipLegacyPlayerSanitize } from '@shared/lib/homebrewPlayerSheet.js'
import { applySpellHomebrewOverlays } from '@shared/lib/mergeSpellHomebrew.js'
import { fetchActiveSessionsWithContent } from '@shared/lib/sessionTreeLoader.js'
import { normalizeSessionsFromDb, toPlayerNarrativeSession } from '@shared/lib/sessionContentNormalize.js'
import {
  filterValidCharacterRows,
  filterValidCharacterStateRows,
  filterValidSpellRows,
} from '@shared/lib/validation/storeBoundaries.js'
import { CHARACTERS } from '@shared/content/session1.js'
import {
  normalizeSpellId, mergeSpellWithOverride, toEngineCompendiumSpell,
  withSpellIds, sanitizeIlyaSheet,
} from './helpers.js'

const PLAYER_RUNTIME_CHARACTERS = CHARACTERS.filter(c => !c.isNPC)

export const createDataSlice = (set, get) => ({
  spellCompendium: {},
  knownConditions: [],

  loadCharacters: async () => {
    const rulesetContext = getRulesetContext()
    const selectedRuleset = rulesetContext.active_ruleset === 'custom' ? '2024' : rulesetContext.active_ruleset
    try {
      const sessionRunId = getSessionRunId()
      const [
        { data: charRows },
        { data: spellRows },
        { data: compendiumRows },
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
      if (validChars.length === 0) return

      const spellCompendium = {}
      ;(filterValidSpellRows(compendiumRows || [])).forEach((row) => {
        const spellId = normalizeSpellId(row.spell_id || row.name)
        if (!spellId) return
        const castingMeta = parseCastingTimeMeta(row.casting_time)
        const mechanic = row.rules_json?.inferred_mechanic || row.resolution_type || 'utility'
        const target = row.rules_json?.inferred_target
          || (row.target_mode && row.target_mode.startsWith('area') ? 'enemy' : null)
        spellCompendium[spellId] = {
          spellId,
          source_index: row.source_index || spellId,
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
        let sheet = {
          id: row.id, name: row.name, password: row.password,
          class: row.class, subclass: row.subclass, level: row.level,
          species: row.species, background: row.background,
          player: row.player, isNPC: row.is_npc, isActive: row.is_active,
          image: row.image, colour: row.colour,
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
      const runtimeCharacters = buildPlayerRuntimeCharacters(validChars, [], PLAYER_RUNTIME_CHARACTERS)
      set({
        playerCharacters: withSpellIds(playerCharacters),
        spellCompendium,
        knownConditions,
        characters: runtimeCharacters,
      })
    } catch (e) {
      console.log('Could not load characters from server, using defaults.')
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
          currentBeatIndex: sessionData.current_beat_index || 0
        })
      }

      try {
        const rawSessions = await fetchActiveSessionsWithContent(supabase)
        const normalized = normalizeSessionsFromDb(rawSessions)
        const activeId = sessionData?.active_session_uuid || normalized[0]?.id
        const active = normalized.find(s => s.id === activeId) || normalized[0]
        const narrative = toPlayerNarrativeSession(active)
        if (narrative?.scenes?.length) {
          set({ session: narrative })
        }
      } catch (e) {
        console.warn('Player session hydrate from DB skipped:', e?.message || e)
      }

      const { data: charData } = await supabase.from('character_states').select('*')
      const validStates = filterValidCharacterStateRows(charData || [])
      if (validStates.length > 0) {
        const { characters } = get()
        const updated = characters.map(c => {
          const saved = validStates.find(d => d.id === c.id)
          if (!saved) return c
          return {
            ...c,
            curHp: saved.cur_hp ?? c.curHp,
            tempHp: saved.temp_hp ?? c.tempHp,
            concentration: saved.concentration ?? c.concentration,
            spellSlots: saved.spell_slots ?? c.spellSlots,
            deathSaves: saved.death_saves ?? c.deathSaves,
            conditions: saved.conditions ?? c.conditions
          }
        })
        set({ characters: updated })
      }
      const { data: combatData } = await supabase
        .from('combat_state').select('*').eq('id', sessionRunId).single()
      if (combatData) {
        get().applyCombatStateRow(combatData)
      }
    } catch (e) {
      console.log('Could not load state from server, using defaults.')
    }
  },
})
