import { create } from 'zustand'
import { supabase } from '@shared/lib/supabase.js'
import { SESSION_1_PLAYER, CHARACTERS } from '@shared/content/session1.js'
import { PLAYER_CHARACTERS } from '@shared/content/playerCharacters.js'

/** Player client: PCs only (exclude DM companion NPCs from party list). */
const PLAYER_RUNTIME_CHARACTERS = CHARACTERS.filter(c => !c.isNPC)

export const usePlayerStore = create((set, get) => ({
  // Session
  session: SESSION_1_PLAYER,
  currentSceneIndex: 0,
  currentBeatIndex: 0,

  // Characters with live HP etc
  characters: PLAYER_RUNTIME_CHARACTERS,

  // Static character data (loaded from Supabase, falls back to hardcoded)
  playerCharacters: PLAYER_CHARACTERS,

  // Combat state (synced from DM console)
  combatActive: false,
  combatRound: 1,
  combatCombatants: [],
  ilyaAssignedTo: null,
  initiativePhase: false,

  /** Monotonic guard for combat_state realtime/HTTP (mirrors DM combatStore) */
  _combatStateSyncedAt: null,

  // Buffs: { characterId: [{ type, die, from, id }] }
  activeBuffs: {},

  // Bardic inspiration uses (Dorothea)
  bardicInspirationUses: 4,

  // Connection
  connected: false,
  lastUpdated: null,

  // DM rolls directed at players
  dmRoll: null,

  getCurrentScene: () => {
    const { session, currentSceneIndex } = get()
    return session.scenes[currentSceneIndex]
  },

  getCurrentBeat: () => {
    const { session, currentSceneIndex, currentBeatIndex } = get()
    return session.scenes[currentSceneIndex]?.beats[currentBeatIndex] || null
  },

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

    let combatants = row.combatants
    if (typeof combatants === 'string') {
      try {
        combatants = JSON.parse(combatants)
      } catch {
        combatants = []
      }
    }
    if (!Array.isArray(combatants)) combatants = []

    let nextLast = lastApplied ?? null
    if (incomingTs != null) {
      nextLast = nextLast != null ? Math.max(nextLast, incomingTs) : incomingTs
    }

    set({
      combatActive: row.active ?? false,
      combatRound: row.round ?? 1,
      combatCombatants: combatants,
      ilyaAssignedTo: row.ilya_assigned_to ?? null,
      initiativePhase: row.initiative_phase ?? false,
      _combatStateSyncedAt: nextLast,
    })
  },

  fetchCombatantsForWrite: async () => {
    try {
      const { data } = await supabase
        .from('combat_state')
        .select('combatants')
        .eq('id', 'session-1')
        .maybeSingle()
      let list = get().combatCombatants
      if (data?.combatants != null) {
        let parsed = data.combatants
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed)
          } catch {
            parsed = []
          }
        }
        if (Array.isArray(parsed)) list = parsed
      }
      return list
    } catch {
      return get().combatCombatants
    }
  },

  // Subscribe to real-time changes from Supabase
  subscribe: () => {
    get().loadInitialState()

    const sessionChannel = supabase
      .channel('session-state-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_state',
        filter: 'id=eq.session-1'
      }, (payload) => {
        if (payload.new) {
          set({
            currentSceneIndex: payload.new.current_scene_index || 0,
            currentBeatIndex: payload.new.current_beat_index || 0,
            lastUpdated: new Date()
          })
        }
      })
      .subscribe((status) => {
        set({ connected: status === 'SUBSCRIBED' })
      })

    const charChannel = supabase
      .channel('character-state-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'character_states'
      }, (payload) => {
        if (payload.new) {
          const { characters } = get()
          const updated = characters.map(c => {
            if (c.id !== payload.new.id) return c
            return {
              ...c,
              curHp: payload.new.cur_hp ?? c.curHp,
              tempHp: payload.new.temp_hp ?? c.tempHp,
              concentration: payload.new.concentration ?? c.concentration,
              spellSlots: payload.new.spell_slots ?? c.spellSlots,
              deathSaves: payload.new.death_saves ?? c.deathSaves,
              conditions: payload.new.conditions ?? c.conditions
            }
          })
          set({ characters: updated, lastUpdated: new Date() })
        }
      })
      .subscribe()

    // Subscribe to combat state
    const combatChannel = supabase
      .channel('combat-state-changes-player')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'combat_state',
        filter: 'id=eq.session-1'
      }, (payload) => {
        if (payload.new) get().applyCombatStateRow(payload.new)
      })
      .subscribe()

    // Subscribe to DM rolls
    const dmRollChannel = supabase
      .channel('dm-roll-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'combat_feed',
        filter: 'session_id=eq.session-1'
      }, (payload) => {
        if (payload.new && payload.new.type === 'dm-roll') {
          set({ dmRoll: { text: payload.new.text, targetId: payload.new.target_id, timestamp: Date.now() } })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(charChannel)
      supabase.removeChannel(combatChannel)
      supabase.removeChannel(dmRollChannel)
    }
  },

  clearDmRoll: () => set({ dmRoll: null }),

  // Load characters and spells from Supabase, overwriting the hardcoded fallback
  loadCharacters: async () => {
    try {
      const [{ data: charRows }, { data: spellRows }] = await Promise.all([
        supabase.from('characters').select('*'),
        supabase.from('character_spells').select('*').order('order_index')
      ])
      if (!charRows || charRows.length === 0) return

      // Group spells by character + slot level
      const spellsByChar = {}
      if (spellRows) {
        for (const row of spellRows) {
          const cid = row.character_id
          if (!spellsByChar[cid]) spellsByChar[cid] = {}
          const key = row.slot_level === 'cantrip' ? 'cantrips' : row.slot_level
          if (!spellsByChar[cid][key]) spellsByChar[cid][key] = []
          spellsByChar[cid][key].push(row.spell_data)
        }
      }

      const playerCharacters = {}
      for (const row of charRows) {
        playerCharacters[row.id] = {
          id: row.id,
          name: row.name,
          password: row.password,
          class: row.class,
          subclass: row.subclass,
          level: row.level,
          species: row.species,
          background: row.background,
          player: row.player,
          isNPC: row.is_npc,
          isActive: row.is_active,
          image: row.image,
          colour: row.colour,
          stats: row.stats || {},
          abilityScores: row.ability_scores || {},
          savingThrows: row.saving_throws || [],
          skills: row.skills || [],
          spellSlots: row.spell_slots || {},
          sorceryPoints: row.sorcery_points || null,
          features: row.features || [],
          spells: spellsByChar[row.id] || {},
          weapons: row.weapons || [],
          healingActions: row.healing_actions || [],
          buffActions: row.buff_actions || [],
          equipment: row.equipment || [],
          magicItems: row.magic_items || [],
          passiveScores: row.passive_scores || {},
          senses: row.senses,
          languages: row.languages,
          backstory: row.backstory,
        }
      }
      set({ playerCharacters })
    } catch (e) {
      console.log('Could not load characters from server, using defaults.')
    }
  },

  loadInitialState: async () => {
    await get().loadCharacters()
    try {
      const { data: sessionData } = await supabase
        .from('session_state')
        .select('*')
        .eq('id', 'session-1')
        .single()

      if (sessionData) {
        set({
          currentSceneIndex: sessionData.current_scene_index || 0,
          currentBeatIndex: sessionData.current_beat_index || 0
        })
      }

      const { data: charData } = await supabase
        .from('character_states')
        .select('*')

      if (charData && charData.length > 0) {
        const { characters } = get()
        const updated = characters.map(c => {
          const saved = charData.find(d => d.id === c.id)
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

      // Load current combat state
      const { data: combatData } = await supabase
        .from('combat_state')
        .select('*')
        .eq('id', 'session-1')
        .single()

      if (combatData) {
        get().applyCombatStateRow(combatData)
      }
    } catch (e) {
      console.log('Could not load state from server, using defaults.')
    }
  },

  // Apply damage to an enemy in combat (writes back to Supabase)
  applyDamageToEnemy: async (combatantId, damage, attackerName, weaponName) => {
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo } = get()
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
        id: 'session-1',
        active: combatActive,
        round: combatRound,
        combatants: updatedCombatants,
        initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)

      const msg = curHp === 0
        ? `${attackerName} → ${target.name} takes ${damage} and goes DOWN!`
        : `${attackerName} hits ${target.name} with ${weaponName} for ${damage} (${curHp}/${target.maxHp} HP)`

      await supabase.from('combat_feed').insert({
        session_id: 'session-1',
        round: combatRound,
        text: msg,
        type: 'damage',
        shared: true,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to apply damage:', e)
    }
  },

  // Apply a condition to an enemy combatant (e.g. Bane)
  applyConditionToEnemy: async (combatantId, condition, casterName) => {
    const { combatActive, combatRound, initiativePhase, ilyaAssignedTo } = get()
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
        id: 'session-1',
        active: combatActive,
        round: combatRound,
        combatants: updatedCombatants,
        initiative_phase: initiativePhase,
        ilya_assigned_to: ilyaAssignedTo,
        updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)
      const target = combatCombatants.find(c => c.id === combatantId)
      await supabase.from('combat_feed').insert({
        session_id: 'session-1',
        round: combatRound,
        text: `${casterName} → ${target?.name ?? combatantId} is now ${condition} (−1d4 to attacks & saves)`,
        type: 'damage',
        shared: true,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to apply condition:', e)
    }
  },

  // Apply healing to a player character (writes to Supabase character_states)
  applyHealingToCharacter: async (targetId, amount, healerName, spellName) => {
    const { characters, combatActive, combatRound } = get()
    const target = characters.find(c => c.id === targetId)
    if (!target) return

    const staticChar = get().playerCharacters[targetId]
    const maxHp = staticChar?.stats.maxHp || target.maxHp
    const newHp = Math.min(maxHp, (target.curHp || 0) + amount)

    // Optimistic local update
    const updated = characters.map(c =>
      c.id === targetId ? { ...c, curHp: newHp } : c
    )
    set({ characters: updated })

    try {
      await supabase.from('character_states').upsert({
        id: targetId,
        cur_hp: newHp,
        updated_at: new Date().toISOString()
      })

      const msg = `${healerName} uses ${spellName} on ${staticChar?.name || targetId} for ${amount} HP (${newHp}/${maxHp})`
      if (combatActive) {
        await supabase.from('combat_feed').insert({
          session_id: 'session-1',
          round: combatRound,
          text: msg,
          type: 'heal',
          shared: true,
          timestamp: new Date().toISOString()
        })
        // Also update the combatant record if they're in the combatants list
        const list = await get().fetchCombatantsForWrite()
        const updatedCombatants = list.map(c =>
          c.id === targetId ? { ...c, curHp: newHp } : c
        )
        if (updatedCombatants.some(c => c.id === targetId)) {
          set({ combatCombatants: updatedCombatants })
          const ts = new Date().toISOString()
          const { initiativePhase, ilyaAssignedTo } = get()
          await supabase.from('combat_state').upsert({
            id: 'session-1',
            active: combatActive,
            round: combatRound,
            combatants: updatedCombatants,
            initiative_phase: initiativePhase,
            ilya_assigned_to: ilyaAssignedTo,
            updated_at: ts
          })
          get().bumpCombatStateSyncedFromWrite(ts)
        }
      }
    } catch (e) {
      console.error('Failed to apply healing:', e)
    }
  },

  // Grant a bardic inspiration buff to a character
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

  // Consume a buff from a character (returns the buff or null)
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

  // Reset bardic inspiration (long rest)
  resetBardicInspiration: () => {
    set({ bardicInspirationUses: 4 })
  },

  // Consume one spell slot for a character
  useSpellSlot: async (characterId, slotLevel) => {
    const { characters } = get()
    const char = characters.find(c => c.id === characterId)
    if (!char) return false

    const slots = char.spellSlots ?? {}
    const slot = slots[slotLevel]
    if (!slot || slot.used >= slot.max) return false

    const newSlots = { ...slots, [slotLevel]: { ...slot, used: slot.used + 1 } }
    const updated = characters.map(c => c.id === characterId ? { ...c, spellSlots: newSlots } : c)
    set({ characters: updated })

    try {
      await supabase.from('character_states').upsert({
        id: characterId,
        spell_slots: newSlots,
        updated_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to update spell slots:', e)
    }
    return true
  },

  // Submit a player's initiative roll to combat_state
  submitInitiative: async (characterId, value) => {
    const { combatActive, combatRound, ilyaAssignedTo, initiativePhase } = get()
    const combatCombatants = await get().fetchCombatantsForWrite()
    const updated = combatCombatants.map(c =>
      c.id === characterId ? { ...c, initiative: value, initiativeSet: true } : c
    )
    set({ combatCombatants: updated })
    const ts = new Date().toISOString()
    try {
      await supabase.from('combat_state').upsert({
        id: 'session-1',
        active: combatActive,
        round: combatRound,
        combatants: updated,
        ilya_assigned_to: ilyaAssignedTo,
        initiative_phase: initiativePhase,
        updated_at: ts
      })
      get().bumpCombatStateSyncedFromWrite(ts)
    } catch (e) {
      console.error('Failed to submit initiative:', e)
    }
  },

  // Push a player roll to the shared combat_feed so the DM can see it
  pushRoll: async (text, charName) => {
    const { combatRound } = get()
    try {
      await supabase.from('combat_feed').insert({
        session_id: 'session-1',
        round: combatRound,
        text: `[${charName}] ${text}`,
        type: 'roll',
        shared: true,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      // Non-critical — roll display continues even if push fails
    }
  }
}))
