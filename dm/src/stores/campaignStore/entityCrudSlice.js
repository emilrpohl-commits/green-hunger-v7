import { supabase } from '@shared/lib/supabase.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { deleteAudioFile } from '@shared/lib/audioStorage.js'

const SPELL_DB_COLUMNS = [
  'id',
  'spell_id',
  'campaign_id',
  'name',
  'level',
  'school',
  'casting_time',
  'range',
  'components',
  'duration',
  'ritual',
  'concentration',
  'description',
  'higher_level_effect',
  'damage_dice',
  'damage_type',
  'healing_dice',
  'save_type',
  'attack_type',
  'resolution_type',
  'target_mode',
  'save_ability',
  'area',
  'scaling',
  'rules_json',
  'tags',
  'source',
  'classes',
  'notes',
  'sound_effect_url',
  'ruleset',
  'source_index',
  'source_url',
  'source_version',
  'imported_at',
  'updated_at',
]

const CHARACTER_DB_COLUMNS = [
  'id',
  'campaign_id',
  'name',
  'password',
  'class',
  'subclass',
  'level',
  'species',
  'background',
  'player',
  'image',
  'portrait_original_storage_path',
  'portrait_crop',
  'portrait_thumb_storage_path',
  'colour',
  'is_npc',
  'assigned_pc_id',
  'is_active',
  'notes',
  'stats',
  'ability_scores',
  'saving_throws',
  'skills',
  'spell_slots',
  'sorcery_points',
  'features',
  'weapons',
  'healing_actions',
  'buff_actions',
  'equipment',
  'magic_items',
  'passive_scores',
  'senses',
  'languages',
  'backstory',
  'srd_refs',
  'homebrew_json',
  'updated_at',
]

function sanitizeCharacterPayload(character, campaignId) {
  const withManaged = {
    ...character,
    campaign_id: campaignId,
    updated_at: new Date().toISOString(),
  }
  return Object.fromEntries(
    Object.entries(withManaged).filter(([key]) => CHARACTER_DB_COLUMNS.includes(key))
  )
}

function sanitizeSpellPayload(spell, campaignId) {
  const normalizedSpellId = spell.spell_id || String(spell.name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const withManagedFields = {
    ...spell,
    spell_id: normalizedSpellId,
    campaign_id: campaignId,
    updated_at: new Date().toISOString(),
  }
  return Object.fromEntries(
    Object.entries(withManagedFields).filter(([key]) => SPELL_DB_COLUMNS.includes(key))
  )
}

const STAT_BLOCK_DB_COLUMNS = [
  'id', 'campaign_id', 'slug', 'name', 'source', 'creature_type', 'size', 'alignment', 'cr',
  'proficiency_bonus', 'ac', 'ac_note', 'max_hp', 'hit_dice', 'speed', 'ability_scores',
  'saving_throws', 'skills', 'resistances', 'immunities', 'vulnerabilities', 'senses',
  'languages', 'traits', 'actions', 'bonus_actions', 'reactions', 'legendary_actions',
  'lair_actions', 'spellcasting', 'combat_prompts', 'dm_notes', 'loot_ids', 'portrait_url',
  'token_url', 'portrait_original_storage_path', 'portrait_crop', 'portrait_thumb_storage_path',
  'cloned_from_reference_id', 'tags', 'import_metadata', 'archived_at', 'updated_at',
]

function sanitizeStatBlockPayload(statBlock, campaignId) {
  const withManaged = {
    ...statBlock,
    campaign_id: campaignId,
    updated_at: new Date().toISOString(),
  }
  return Object.fromEntries(
    Object.entries(withManaged).filter(([key]) => STAT_BLOCK_DB_COLUMNS.includes(key))
  )
}

export function createEntityCrudSlice(set, get) {
  return {
    saveStatBlock: async (statBlock) => {
      const { campaign } = get()
      if (!campaign) return { error: 'No campaign loaded' }

      const payload = sanitizeStatBlockPayload(statBlock, campaign.id)

      let result
      if (statBlock.id) {
        result = await supabase
          .from('stat_blocks')
          .update(payload)
          .eq('id', statBlock.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('stat_blocks')
          .insert(payload)
          .select()
          .single()
      }

      if (result.error) return { error: result.error.message }

      const saved = result.data
      const { statBlocks, statBlockMap } = get()
      const updated = statBlock.id
        ? statBlocks.map(sb => sb.id === saved.id ? saved : sb)
        : [...statBlocks, saved]

      const newMap = { ...statBlockMap, [saved.id]: saved }
      if (saved.slug) newMap[saved.slug] = saved

      set({ statBlocks: updated, statBlockMap: newMap })
      return { data: saved }
    },

    deleteStatBlock: async (id) => {
      const { error } = await supabase
        .from('stat_blocks')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        return { error: `Archive failed: ${error.message}. Ensure archived_at column exists on stat_blocks.` }
      }
      const { statBlocks } = get()
      const archived = statBlocks.find(sb => sb.id === id)
      set({
        statBlocks: statBlocks.filter(sb => sb.id !== id),
        archivedStatBlocks: archived ? [{ ...archived, archived_at: new Date().toISOString() }, ...get().archivedStatBlocks] : get().archivedStatBlocks,
      })
      return { success: true }
    },

    restoreStatBlock: async (id) => {
      const { error, data } = await supabase
        .from('stat_blocks')
        .update({ archived_at: null })
        .eq('id', id)
        .select()
        .single()
      if (error) return { error: error.message }
      const { archivedStatBlocks, statBlocks } = get()
      set({
        archivedStatBlocks: archivedStatBlocks.filter(sb => sb.id !== id),
        statBlocks: [...statBlocks, data].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
      })
      return { data }
    },

    duplicateStatBlock: async (id) => {
      const { statBlocks } = get()
      const original = statBlocks.find(sb => sb.id === id)
      if (!original) return { error: 'Not found' }
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = original
      return get().saveStatBlock({
        ...rest,
        cloned_from_reference_id: null,
        name: `${original.name} (Copy)`,
        slug: original.slug ? `${original.slug}-copy-${Date.now()}` : null,
      })
    },

    saveSpell: async (spell) => {
      const { campaign } = get()
      const payload = sanitizeSpellPayload(spell, campaign?.id)
      let result
      if (spell.id) {
        if (featureFlags.ownershipConstraintsEnforced) {
          const { data: existing } = await supabase.from('spells').select('id,campaign_id').eq('id', spell.id).single()
          if (existing && existing.campaign_id !== campaign?.id) {
            return { error: 'Cannot modify canonical or foreign campaign spell.' }
          }
        }
        result = await supabase.from('spells').update(payload).eq('id', spell.id).select().single()
      } else {
        result = await supabase.from('spells').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }
      const { spells } = get()
      const updated = spell.id ? spells.map(s => s.id === result.data.id ? result.data : s) : [...spells, result.data]
      set({ spells: updated.sort((a, b) => (a.level - b.level) || String(a.name || '').localeCompare(String(b.name || ''))) })
      return { data: result.data }
    },

    saveCharacter: async (character) => {
      const { campaign, characters } = get()
      if (!campaign?.id) return { error: 'No campaign loaded' }
      if (!String(character?.name || '').trim()) return { error: 'Character name is required' }
      const payload = sanitizeCharacterPayload(character, campaign.id)
      const id = payload.id || `pc-${Date.now()}`
      const existsInStore = (characters || []).some((c) => c.id === id)
      let result
      if (existsInStore) {
        result = await supabase.from('characters').update({ ...payload, id }).eq('id', id).select().single()
      } else {
        result = await supabase.from('characters').insert({ ...payload, id }).select().single()
      }
      if (result.error) return { error: result.error.message }
      const list = get().characters || []
      const saved = result.data
      const updated = existsInStore
        ? list.map((c) => (c.id === saved.id ? saved : c))
        : [...list, saved]
      set({ characters: updated.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) })
      return { data: saved }
    },

    patchCharacterAssignment: async (characterId, assignedPcId) => {
      const { data, error } = await supabase
        .from('characters')
        .update({
          assigned_pc_id: assignedPcId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', characterId)
        .select()
        .single()
      if (error) return { error: error.message }
      const list = get().characters || []
      set({
        characters: list.map((c) => (c.id === characterId ? { ...c, ...data } : c)),
      })
      return { data }
    },

    deleteCharacter: async (id) => {
      const { error } = await supabase.from('characters').delete().eq('id', id)
      if (error) return { error: error.message }
      set({ characters: get().characters.filter((c) => c.id !== id) })
      return { success: true }
    },

    deleteSpell: async (id) => {
      const { campaign } = get()
      if (featureFlags.ownershipConstraintsEnforced) {
        const { data: existing } = await supabase.from('spells').select('id,campaign_id').eq('id', id).single()
        if (existing && existing.campaign_id !== campaign?.id) {
          return { error: 'Cannot delete canonical or foreign campaign spell.' }
        }
      }
      const { error } = await supabase.from('spells').delete().eq('id', id)
      if (error) return { error: error.message }
      set({ spells: get().spells.filter(s => s.id !== id) })
      return { success: true }
    },

    loadOverlays: async (entityType = null) => {
      const { campaign } = get()
      if (!campaign?.id) return { data: [] }
      let q = supabase
        .from('homebrew_overlays')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
      if (entityType) q = q.eq('entity_type', entityType)
      const { data, error } = await q
      if (error) return { error: error.message }
      return { data: data || [] }
    },

    saveOverlay: async (overlay) => {
      if (!featureFlags.homebrewOverlayWrite) return { error: 'Homebrew overlay write is disabled.' }
      const { campaign } = get()
      if (!campaign?.id) return { error: 'No active campaign for overlay write.' }
      const payload = {
        campaign_id: campaign.id,
        entity_type: overlay.entity_type,
        canonical_ref: overlay.canonical_ref || null,
        overlay_payload: overlay.overlay_payload || {},
        is_active: overlay.is_active ?? true,
        updated_at: new Date().toISOString(),
      }
      const result = overlay.id
        ? await supabase.from('homebrew_overlays').update(payload).eq('id', overlay.id).select().single()
        : await supabase.from('homebrew_overlays').insert(payload).select().single()
      if (result.error) return { error: result.error.message }
      return { data: result.data }
    },

    assignSpellsToCharacters: async ({ spellIds, characterIds }) => {
      const cleanSpellIds = Array.from(new Set((spellIds || []).filter(Boolean)))
      const cleanCharacterIds = Array.from(new Set((characterIds || []).filter(Boolean)))
      if (cleanSpellIds.length === 0 || cleanCharacterIds.length === 0) {
        return { error: 'Select at least one spell and one character.' }
      }

      const allSpells = [...(get().compendiumSpells || []), ...(get().spells || [])]
      const spellMap = {}
      allSpells.forEach(s => {
        if (s.spell_id) spellMap[s.spell_id] = s
      })
      const selectedSpells = cleanSpellIds.map(id => spellMap[id]).filter(Boolean)
      if (selectedSpells.length === 0) return { error: 'No valid spells found for assignment.' }

      const rowsToInsert = []
      for (const characterId of cleanCharacterIds) {
        const { data: existingRows, error: existingError } = await supabase
          .from('character_spells')
          .select('slot_level, order_index, spell_id')
          .eq('character_id', characterId)
        if (existingError) return { error: existingError.message }

        const existingBySlot = {}
        ;(existingRows || []).forEach(r => {
          const key = String(r.slot_level)
          if (!existingBySlot[key]) existingBySlot[key] = { maxOrder: 0, spellIds: new Set() }
          existingBySlot[key].maxOrder = Math.max(existingBySlot[key].maxOrder, r.order_index || 0)
          if (r.spell_id) existingBySlot[key].spellIds.add(r.spell_id)
        })

        selectedSpells.forEach(spell => {
          const slotLevel = spell.level === 0 ? 'cantrip' : String(spell.level)
          if (!existingBySlot[slotLevel]) existingBySlot[slotLevel] = { maxOrder: 0, spellIds: new Set() }
          if (existingBySlot[slotLevel].spellIds.has(spell.spell_id)) return
          existingBySlot[slotLevel].maxOrder += 1
          rowsToInsert.push({
            character_id: characterId,
            slot_level: slotLevel,
            order_index: existingBySlot[slotLevel].maxOrder,
            spell_id: spell.spell_id,
            spell_data: spell,
            overrides_json: {},
            updated_at: new Date().toISOString(),
          })
        })
      }

      if (rowsToInsert.length === 0) return { data: { inserted: 0, skippedAll: true } }
      const { error } = await supabase.from('character_spells').insert(rowsToInsert)
      if (error) return { error: error.message }
      return { data: { inserted: rowsToInsert.length } }
    },

    assignSpellToCharacter: async (characterId, spellId) => {
      if (!characterId || !spellId) return { error: 'Character and spell required.' }
      return get().assignSpellsToCharacters({ spellIds: [spellId], characterIds: [characterId] })
    },

    removeCharacterSpellLink: async (characterId, spellId) => {
      if (!characterId || !spellId) return { error: 'Character and spell required.' }
      const { error } = await supabase
        .from('character_spells')
        .delete()
        .eq('character_id', characterId)
        .eq('spell_id', spellId)
      if (error) return { error: error.message }
      return { success: true }
    },

    saveAudioAsset: async (asset) => {
      const { campaign, audioAssets } = get()
      if (!campaign?.id) return { error: 'No campaign loaded' }
      const payload = {
        campaign_id: campaign.id,
        name: String(asset?.name || '').trim(),
        type: asset?.type === 'background' ? 'background' : 'sfx',
        storage_path: String(asset?.storage_path || '').trim(),
        duration_seconds: asset?.duration_seconds ?? null,
        tags: Array.isArray(asset?.tags) ? asset.tags : [],
        loop_default: !!asset?.loop_default,
        volume_default: asset?.volume_default != null ? Number(asset.volume_default) : 1,
        favorite: !!asset?.favorite,
        scene_id: asset?.scene_id || null,
        encounter_id: asset?.encounter_id || null,
        updated_at: new Date().toISOString(),
      }
      if (!payload.name) return { error: 'Audio name is required' }
      if (!payload.storage_path) return { error: 'Audio storage path is required' }
      let result
      if (asset?.id) {
        result = await supabase.from('audio_assets').update(payload).eq('id', asset.id).select().single()
      } else {
        result = await supabase.from('audio_assets').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }
      const saved = result.data
      const updated = asset?.id
        ? audioAssets.map((a) => (a.id === saved.id ? saved : a))
        : [...audioAssets, saved]
      set({
        audioAssets: updated.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
      })
      return { data: saved }
    },

    deleteAudioAsset: async (id) => {
      const { audioAssets, audioPlaylistItems } = get()
      const target = audioAssets.find((a) => a.id === id)
      const { error } = await supabase.from('audio_assets').delete().eq('id', id)
      if (error) return { error: error.message }
      try {
        if (target?.storage_path) await deleteAudioFile(target.storage_path)
      } catch (e) {
        console.warn('delete audio file:', e?.message || e)
      }
      set({
        audioAssets: audioAssets.filter((a) => a.id !== id),
        audioPlaylistItems: audioPlaylistItems.filter((i) => i.asset_id !== id),
      })
      return { success: true }
    },

    saveAudioPlaylist: async (playlist) => {
      const { campaign, audioPlaylists } = get()
      if (!campaign?.id) return { error: 'No campaign loaded' }
      const payload = {
        campaign_id: campaign.id,
        name: String(playlist?.name || '').trim(),
        type: playlist?.type === 'background' ? 'background' : 'sfx',
        description: playlist?.description || null,
        updated_at: new Date().toISOString(),
      }
      if (!payload.name) return { error: 'Playlist name is required' }
      let result
      if (playlist?.id) {
        result = await supabase.from('audio_playlists').update(payload).eq('id', playlist.id).select().single()
      } else {
        result = await supabase.from('audio_playlists').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }
      const saved = result.data
      const updated = playlist?.id
        ? audioPlaylists.map((p) => (p.id === saved.id ? saved : p))
        : [...audioPlaylists, saved]
      set({
        audioPlaylists: updated.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
      })
      return { data: saved }
    },

    deleteAudioPlaylist: async (id) => {
      const { error } = await supabase.from('audio_playlists').delete().eq('id', id)
      if (error) return { error: error.message }
      set({
        audioPlaylists: get().audioPlaylists.filter((p) => p.id !== id),
        audioPlaylistItems: get().audioPlaylistItems.filter((it) => it.playlist_id !== id),
      })
      return { success: true }
    },

    setAudioPlaylistItems: async ({ playlistId, assetIds }) => {
      const ids = Array.from(new Set((assetIds || []).filter(Boolean)))
      const { error: delErr } = await supabase.from('audio_playlist_items').delete().eq('playlist_id', playlistId)
      if (delErr) return { error: delErr.message }
      let inserted = []
      if (ids.length > 0) {
        const rows = ids.map((assetId, idx) => ({
          playlist_id: playlistId,
          asset_id: assetId,
          position: idx,
          updated_at: new Date().toISOString(),
        }))
        const { data, error } = await supabase.from('audio_playlist_items').insert(rows).select('*')
        if (error) return { error: error.message }
        inserted = data || []
      }
      const others = get().audioPlaylistItems.filter((it) => it.playlist_id !== playlistId)
      set({ audioPlaylistItems: [...others, ...inserted] })
      return { data: inserted }
    },

    duplicateAudioPlaylist: async (playlistId) => {
      const { audioPlaylists, audioPlaylistItems } = get()
      const src = audioPlaylists.find((p) => p.id === playlistId)
      if (!src) return { error: 'Playlist not found' }
      const create = await get().saveAudioPlaylist({
        ...src,
        id: null,
        name: `${src.name} (Copy)`,
      })
      if (create.error) return create
      const sourceItems = audioPlaylistItems
        .filter((it) => it.playlist_id === src.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0))
      const copyRes = await get().setAudioPlaylistItems({
        playlistId: create.data.id,
        assetIds: sourceItems.map((it) => it.asset_id),
      })
      if (copyRes.error) return copyRes
      return { data: create.data }
    },

    saveNpc: async (npc) => {
      const { campaign } = get()
      const payload = { ...npc, campaign_id: campaign?.id, updated_at: new Date().toISOString() }
      let result
      if (npc.id) {
        result = await supabase.from('npcs').update(payload).eq('id', npc.id).select().single()
      } else {
        result = await supabase.from('npcs').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }
      const { npcs } = get()
      const updated = npc.id ? npcs.map(n => n.id === result.data.id ? result.data : n) : [...npcs, result.data]
      set({ npcs: updated })
      return { data: result.data }
    },

    deleteNpc: async (id) => {
      const { error } = await supabase.from('npcs').delete().eq('id', id)
      if (error) return { error: error.message }
      set({ npcs: get().npcs.filter(n => n.id !== id) })
      return { success: true }
    },

    /** Phase 2F: persist encounter library row (participants JSONB). */
    saveEncounter: async (encounter) => {
      const { campaign, encounters } = get()
      if (!campaign?.id) return { error: 'No campaign loaded' }
      const payload = {
        title: encounter.title,
        type: encounter.type || 'combat',
        difficulty: encounter.difficulty || null,
        participants: encounter.participants || [],
        notes: encounter.notes || null,
        default_background_playlist_id: encounter.default_background_playlist_id || null,
        default_background_asset_id: encounter.default_background_asset_id || null,
        default_sfx_playlist_id: encounter.default_sfx_playlist_id || null,
        campaign_id: campaign.id,
        updated_at: new Date().toISOString(),
      }
      let result
      if (encounter.id) {
        result = await supabase.from('encounters').update(payload).eq('id', encounter.id).select().single()
      } else {
        result = await supabase.from('encounters').insert(payload).select().single()
      }
      if (result.error) return { error: result.error.message }
      const saved = result.data
      const updated = encounter.id
        ? encounters.map((e) => (e.id === saved.id ? saved : e))
        : [...encounters, saved]
      set({
        encounters: updated.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
      })
      return { data: saved }
    },

    deleteEncounter: async (id) => {
      const { error } = await supabase.from('encounters').delete().eq('id', id)
      if (error) return { error: error.message }
      set({ encounters: get().encounters.filter((e) => e.id !== id) })
      return { success: true }
    },
  }
}
