import { supabase } from '@shared/lib/supabase.js'
import { SESSION_2_ENEMIES } from '@shared/content/session2.js'
import { fetchPartyRosterForCombat } from '@shared/lib/partyRoster.js'
import { resolveGreenMarksCurrent } from '@shared/lib/greenMarks.js'
import { normalizeStatBlockAction } from '@shared/lib/statBlockActions.js'
import { makeActionEconomy, makeLegendaryActionState } from '@shared/lib/combatRules.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { getMonsterCombatant } from '@shared/lib/engine/rulesService.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { getPortraitPublicUrl } from '@shared/lib/portraitStorage.js'
import {
  expandEncounterParticipantsToEnemies,
  findEncounterByStatBlockSlug,
} from '@shared/lib/encounterResolver.js'

const CORRUPTED_WOLF = {
  id: 'corrupted-wolf',
  name: 'Corrupted Wolf',
  ac: 13,
  maxHp: 13,
  initiative: 20,
  type: 'enemy'
}

function useEncountersFromDatabase() {
  return featureFlags.encountersDbOnly && !featureFlags.encountersDbOnlyKillSwitch
}

async function fetchRunCampaignId() {
  const runId = getSessionRunId()
  const { data } = await supabase.from('session_state').select('campaign_id').eq('id', runId).maybeSingle()
  return data?.campaign_id || null
}

/** Load stat blocks for campaign as id -> row (for encounter participants). */
async function fetchStatBlockMapByCampaign(campaignId) {
  const { data, error } = await supabase
    .from('stat_blocks')
    .select('id, slug, name, ac, max_hp, portrait_url, portrait_original_storage_path, portrait_thumb_storage_path, actions, bonus_actions, reactions, legendary_actions, ability_scores, saving_throws')
    .eq('campaign_id', campaignId)
  if (error) {
    console.warn('fetchStatBlockMapByCampaign:', error.message)
    return {}
  }
  const map = {}
  ;(data || []).forEach((sb) => { map[sb.id] = sb })
  return map
}

export const createEncountersSlice = (set, get) => ({
  startEncounter: async (encounterName, enemies) => {
    const slugs = [...new Set((enemies || []).map(e => e.id).filter(Boolean))]
    let statBlocks = null
    try {
      const { data, error } = await supabase
        .from('stat_blocks')
        .select('slug, ac, max_hp, portrait_url, portrait_original_storage_path, portrait_thumb_storage_path, actions, bonus_actions, reactions, legendary_actions, ability_scores, saving_throws')
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

    const { roster: partyRoster, source: rosterSource } = await fetchPartyRosterForCombat(supabase)
    if (rosterSource === 'fallback') {
      warnFallback('Combat start: party roster from static bundle', {
        system: 'encounters',
        encounterName,
        source: 'static',
      })
    }
    const rosterPlayers = partyRoster.filter(c => !c.isNPC)
    const includedPlayerIds = get().includedPlayerIds || []
    const selectedPlayers = includedPlayerIds.length > 0
      ? rosterPlayers.filter(c => includedPlayerIds.includes(c.id))
      : rosterPlayers
    const effectivePlayers = selectedPlayers.length > 0 ? selectedPlayers : rosterPlayers
    const pcIds = effectivePlayers.map(c => c.id).filter(Boolean)
    let charStates = null
    try {
      const { data, error } = await supabase
        .from('character_states')
        .select('id, cur_hp, temp_hp, green_marks, tactical_json')
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

    const playerCombatants = effectivePlayers.map((c) => {
      const saved = stateMap[c.id]
      const tj = saved?.tactical_json && typeof saved.tactical_json === 'object' ? saved.tactical_json : {}
      const greenMarks = resolveGreenMarksCurrent(saved?.green_marks, tj, c.greenMarks ?? 0)
      return {
        id: c.id,
        name: c.name,
        type: 'player',
        kind: 'pc',
        ac: c.ac,
        maxHp: c.maxHp,
        curHp: saved != null && saved.cur_hp != null ? saved.cur_hp : c.curHp,
        tempHp: saved != null && saved.temp_hp != null ? saved.temp_hp : (c.tempHp || 0),
        initiative: 0,
        initiativeSet: false,
        conditions: [],
        effects: [],
        concentration: false,
        image: c.image || null,
        abilityScores: c.abilityScores || {},
        savingThrows: c.savingThrows || [],
        actionEconomy: makeActionEconomy(),
        rosterContentSource: c.contentSource || rosterSource,
        greenMarks,
      }
    })

    const enemyCombatants = await Promise.all(enemies.map(async (e, i) => {
      const sb = sbMap[e.id]
      const ac = sb?.ac ?? e.ac
      const maxHp = sb?.max_hp ?? e.maxHp
      if (!sb) {
        warnFallback('Enemy has no matching stat_blocks row; using template AC/HP/actions', {
          system: 'encounters',
          slug: e.id,
          encounterName,
          source: 'static',
        })
      }
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
          kind: e.kind || 'enemy',
          initiative: e.initiative || engineMonster.initiative || 0,
          initiativeSet: true,
          actionEconomy: makeActionEconomy(),
        }
      }
      return {
        id: `${e.id}-${i + 1}`,
        name: enemies.length > 1 ? `${e.name} ${i + 1}` : e.name,
        type: 'enemy',
        kind: e.kind || 'enemy',
        ac,
        maxHp,
        curHp: maxHp,
        tempHp: 0,
        initiative: e.initiative || 0,
        initiativeSet: true,
        conditions: [],
        effects: [],
        concentration: false,
        image: sb?.portrait_url
          || getPortraitPublicUrl(sb?.portrait_thumb_storage_path || sb?.portrait_original_storage_path)
          || e.portrait_url
          || null,
        actionEconomy: makeActionEconomy(),
        abilityScores: sb?.ability_scores || {},
        savingThrows: sb?.saving_throws || [],
        legendaryActionState: Array.isArray(sb?.legendary_actions) && sb.legendary_actions.length > 0
          ? makeLegendaryActionState(3)
          : null,
        rechargeState: {},
        actionOptions: [
          ...((sb?.actions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'action' }))),
          ...((sb?.bonus_actions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'bonus_action' }))),
          ...((sb?.reactions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'reaction' }))),
          ...((sb?.legendary_actions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'legendary' }))),
          ...((e.actions || []).map(a => ({ ...a, actionType: a.actionType || 'action', source: 'normalized' }))),
          ...((e.bonus_actions || []).map(a => ({ ...a, actionType: 'bonus_action', source: 'normalized' }))),
          ...((e.reactions || []).map(a => ({ ...a, actionType: 'reaction', source: 'normalized' }))),
        ],
        actionSource: sb ? 'stat_block' : ((e.actions || e.bonus_actions || e.reactions) ? 'normalized' : 'fallback'),
      }
    }))

    const withFallbackActions = enemyCombatants.map((c) => {
      if (Array.isArray(c.actionOptions) && c.actionOptions.length > 0) return c
      warnFallback('Synthetic basic attack action (no structured monster actions)', {
        system: 'encounters',
        combatantId: c.id,
        name: c.name,
        source: 'static',
      })
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

  /** Phase 2C/2F: start from DB `encounters` row (participants JSONB). */
  launchEncounterFromDbRow: async (encounterRow, statBlockById) => {
    if (!encounterRow?.title) return
    const enemies = expandEncounterParticipantsToEnemies(encounterRow.participants, statBlockById)
    if (!enemies.length) {
      warnFallback('Encounter row has no resolvable participants', {
        system: 'encounters',
        id: encounterRow.id,
        title: encounterRow.title,
      })
      return
    }
    await get().clearFeed()
    await get().startEncounter(encounterRow.title, enemies)
  },

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

  launchEncounterByStatBlockId: async (statBlockId) => {
    if (!statBlockId) return
    if (useEncountersFromDatabase()) {
      const campaignId = await fetchRunCampaignId()
      if (campaignId) {
        const { data: encList, error: encErr } = await supabase
          .from('encounters')
          .select('*')
          .eq('campaign_id', campaignId)
        if (!encErr && encList?.length) {
          const statBlockById = await fetchStatBlockMapByCampaign(campaignId)
          const match = findEncounterByStatBlockSlug(encList, statBlockId, statBlockById)
          if (match) {
            await get().launchEncounterFromDbRow(match, statBlockById)
            return
          }
        }
        warnFallback('No DB encounter matched stat block; using legacy launcher', {
          system: 'encounters',
          statBlockId,
          source: 'static',
        })
      }
    }
    if (statBlockId === 'corrupted-wolf') return get().launchCorruptedHunt()
    if (statBlockId === 'darcy-recombined') return get().launchDarcy()
    if (statBlockId === 'rotting-bloom') return get().launchRottingBlooms()
    if (statBlockId === 'damir-woven-grief') return get().launchDamir()
    warnFallback('No encounter launcher registered for stat block slug', {
      system: 'encounters',
      statBlockId,
    })
  }
})
