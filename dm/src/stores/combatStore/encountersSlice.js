import { supabase } from '@shared/lib/supabase.js'
import { SESSION_2_ENEMIES } from '@shared/content/session2.js'
import { fetchPartyRosterForCombat } from '@shared/lib/partyRoster.js'
import { normalizeStatBlockAction } from '@shared/lib/statBlockActions.js'
import { makeActionEconomy } from '@shared/lib/combatRules.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { getMonsterCombatant } from '@shared/lib/engine/rulesService.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'

const CORRUPTED_WOLF = {
  id: 'corrupted-wolf',
  name: 'Corrupted Wolf',
  ac: 13,
  maxHp: 13,
  initiative: 20,
  type: 'enemy'
}

export const createEncountersSlice = (set, get) => ({
  startEncounter: async (encounterName, enemies) => {
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

    const { roster: partyRoster } = await fetchPartyRosterForCombat(supabase)
    const pcIds = partyRoster.map(c => c.id).filter(Boolean)
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

    const playerCombatants = partyRoster.map(c => {
      const saved = stateMap[c.id]
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
        image: sb?.portrait_url || e.portrait_url || null,
        actionEconomy: makeActionEconomy(),
        abilityScores: sb?.ability_scores || {},
        savingThrows: sb?.saving_throws || [],
        actionOptions: [
          ...((sb?.actions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'action' }))),
          ...((sb?.bonus_actions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'bonus_action' }))),
          ...((sb?.reactions || []).map(a => ({ ...normalizeStatBlockAction(a), actionType: 'reaction' }))),
          ...((e.actions || []).map(a => ({ ...a, actionType: a.actionType || 'action', source: 'normalized' }))),
          ...((e.bonus_actions || []).map(a => ({ ...a, actionType: 'bonus_action', source: 'normalized' }))),
          ...((e.reactions || []).map(a => ({ ...a, actionType: 'reaction', source: 'normalized' }))),
        ],
        actionSource: sb ? 'stat_block' : ((e.actions || e.bonus_actions || e.reactions) ? 'normalized' : 'fallback'),
      }
    }))

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
    if (statBlockId === 'corrupted-wolf') return get().launchCorruptedHunt()
    if (statBlockId === 'darcy-recombined') return get().launchDarcy()
    if (statBlockId === 'rotting-bloom') return get().launchRottingBlooms()
    if (statBlockId === 'damir-woven-grief') return get().launchDamir()
  }
})
