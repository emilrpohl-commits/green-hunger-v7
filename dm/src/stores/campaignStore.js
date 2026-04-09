/**
 * Campaign Store — loads the full campaign tree from Supabase.
 *
 * This store is separate from sessionStore (which handles live run-time nav).
 * It owns: campaigns, sessions, scenes, beats, stat blocks, spells, NPCs.
 *
 * Run mode reads from this store for content.
 * Builder mode writes to this store.
 */

import { create } from 'zustand'
import { supabase } from '@shared/lib/supabase.js'

export const useCampaignStore = create((set, get) => ({
  // Full campaign data
  campaign: null,
  adventureId: null,     // stored for creating new sessions
  sessions: [],          // [{ ...session, scenes: [{ ...scene, beats: [], branches: [] }] }]
  statBlocks: [],        // flat list
  statBlockMap: {},      // slug → statBlock (and id → statBlock)
  spells: [],
  npcs: [],
  assets: [],

  // Loading / error
  loading: false,
  error: null,
  lastLoaded: null,

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  loadCampaign: async (campaignSlug = 'green-hunger') => {
    set({ loading: true, error: null })
    try {
      // Campaign
      const { data: campaign, error: ce } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', campaignSlug)
        .single()
      if (ce) throw new Error(`campaign: ${ce.message}`)

      // Stat blocks
      const { data: statBlocks, error: sbe } = await supabase
        .from('stat_blocks')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('name')
      if (sbe) throw new Error(`stat_blocks: ${sbe.message}`)

      const statBlockMap = {}
      ;(statBlocks || []).forEach(sb => {
        statBlockMap[sb.slug] = sb
        statBlockMap[sb.id] = sb
      })

      // Spells
      const { data: spells } = await supabase
        .from('spells')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('level, name')

      // NPCs
      const { data: npcs } = await supabase
        .from('npcs')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('name')

      // Assets
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('title')

      // Adventures — load directly so adventureId is available even when sessions table is empty
      const { data: adventures } = await supabase
        .from('adventures')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
      const adventureId = adventures?.[0]?.id || null

      // Sessions (ordered)
      const { data: sessionsRaw, error: se } = await supabase
        .from('sessions')
        .select('*')
        .order('session_number, order, created_at')
      if (se) throw new Error(`sessions: ${se.message}`)

      // Deduplicate: keep only the first session per session_number
      const seen = new Set()
      const sessions = (sessionsRaw || []).filter(s => {
        const key = s.session_number ?? s.order
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Load scenes + beats + branches for each session
      const sessionsWithContent = await Promise.all(
        sessions.map(s => get().loadSessionContent(s))
      )

      set({
        campaign,
        adventureId,
        sessions: sessionsWithContent,
        statBlocks: statBlocks || [],
        statBlockMap,
        spells: spells || [],
        npcs: npcs || [],
        assets: assets || [],
        loading: false,
        lastLoaded: new Date(),
      })
    } catch (e) {
      console.error('loadCampaign error:', e)
      set({ loading: false, error: e.message })
    }
  },

  loadSessionContent: async (session) => {
    const { data: scenes, error: sce } = await supabase
      .from('scenes')
      .select('*')
      .eq('session_id', session.id)
      .order('order')
    if (sce) { console.warn('scenes error:', sce.message); return { ...session, scenes: [] } }

    const scenesWithContent = await Promise.all(
      (scenes || []).map(async scene => {
        const [beatsRes, branchesRes] = await Promise.all([
          supabase.from('beats').select('*').eq('scene_id', scene.id).order('order'),
          supabase.from('scene_branches').select('*').eq('scene_id', scene.id).order('order'),
        ])
        return {
          ...scene,
          beats: beatsRes.data || [],
          branches: branchesRes.data || [],
        }
      })
    )

    return { ...session, scenes: scenesWithContent }
  },

  // ---------------------------------------------------------------------------
  // STAT BLOCKS — CRUD
  // ---------------------------------------------------------------------------

  saveStatBlock: async (statBlock) => {
    const { campaign } = get()
    if (!campaign) return { error: 'No campaign loaded' }

    const payload = {
      ...statBlock,
      campaign_id: campaign.id,
      updated_at: new Date().toISOString(),
    }

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
    const { error } = await supabase.from('stat_blocks').delete().eq('id', id)
    if (error) return { error: error.message }
    const { statBlocks } = get()
    set({ statBlocks: statBlocks.filter(sb => sb.id !== id) })
    return { success: true }
  },

  duplicateStatBlock: async (id) => {
    const { statBlocks } = get()
    const original = statBlocks.find(sb => sb.id === id)
    if (!original) return { error: 'Not found' }
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = original
    return get().saveStatBlock({
      ...rest,
      name: `${original.name} (Copy)`,
      slug: original.slug ? `${original.slug}-copy-${Date.now()}` : null,
    })
  },

  // ---------------------------------------------------------------------------
  // SCENES — CRUD
  // ---------------------------------------------------------------------------

  saveScene: async (scene) => {
    // Strip client-side populated arrays — these are not columns in Supabase
    const { beats: _b, branches: _br, ...rest } = scene
    const payload = { ...rest, updated_at: new Date().toISOString() }
    let result
    if (scene.id) {
      result = await supabase.from('scenes').update(payload).eq('id', scene.id).select().single()
    } else {
      result = await supabase.from('scenes').insert(payload).select().single()
    }
    if (result.error) return { error: result.error.message }

    // Refresh session content
    await get().refreshSession(result.data.session_id)
    return { data: result.data }
  },

  deleteScene: async (id) => {
    const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', id).single()
    const { error } = await supabase.from('scenes').delete().eq('id', id)
    if (error) return { error: error.message }
    if (scene) await get().refreshSession(scene.session_id)
    return { success: true }
  },

  // ---------------------------------------------------------------------------
  // BEATS — CRUD
  // ---------------------------------------------------------------------------

  saveBeat: async (beat) => {
    const payload = { ...beat, updated_at: new Date().toISOString() }
    let result
    if (beat.id) {
      result = await supabase.from('beats').update(payload).eq('id', beat.id).select().single()
    } else {
      result = await supabase.from('beats').insert(payload).select().single()
    }
    if (result.error) return { error: result.error.message }

    // Find scene → session for refresh
    const { data: sceneRow } = await supabase.from('scenes').select('session_id').eq('id', result.data.scene_id).single()
    if (sceneRow) await get().refreshSession(sceneRow.session_id)
    return { data: result.data }
  },

  deleteBeat: async (id) => {
    const { data: beat } = await supabase.from('beats').select('scene_id').eq('id', id).single()
    const { error } = await supabase.from('beats').delete().eq('id', id)
    if (error) return { error: error.message }
    if (beat) {
      const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', beat.scene_id).single()
      if (scene) await get().refreshSession(scene.session_id)
    }
    return { success: true }
  },

  // Reorder beats within a scene
  reorderBeats: async (sceneId, orderedIds) => {
    const updates = orderedIds.map((id, i) =>
      supabase.from('beats').update({ order: i + 1 }).eq('id', id)
    )
    await Promise.all(updates)
    const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', sceneId).single()
    if (scene) await get().refreshSession(scene.session_id)
  },

  // ---------------------------------------------------------------------------
  // SCENE BRANCHES — CRUD
  // ---------------------------------------------------------------------------

  saveBranch: async (branch) => {
    const payload = { ...branch }
    let result
    if (branch.id) {
      result = await supabase.from('scene_branches').update(payload).eq('id', branch.id).select().single()
    } else {
      result = await supabase.from('scene_branches').insert(payload).select().single()
    }
    if (result.error) return { error: result.error.message }

    const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', result.data.scene_id).single()
    if (scene) await get().refreshSession(scene.session_id)
    return { data: result.data }
  },

  deleteBranch: async (id) => {
    const { data: branch } = await supabase.from('scene_branches').select('scene_id').eq('id', id).single()
    const { error } = await supabase.from('scene_branches').delete().eq('id', id)
    if (error) return { error: error.message }
    if (branch) {
      const { data: scene } = await supabase.from('scenes').select('session_id').eq('id', branch.scene_id).single()
      if (scene) await get().refreshSession(scene.session_id)
    }
    return { success: true }
  },

  // ---------------------------------------------------------------------------
  // SESSIONS — CRUD
  // ---------------------------------------------------------------------------

  deleteSession: async (id) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) return { error: error.message }
    set({ sessions: get().sessions.filter(s => s.id !== id) })
    return { success: true }
  },

  saveSession: async (session) => {
    const payload = { ...session, updated_at: new Date().toISOString() }
    let result
    if (session.id) {
      result = await supabase.from('sessions').update(payload).eq('id', session.id).select().single()
    } else {
      result = await supabase.from('sessions').insert(payload).select().single()
    }
    if (result.error) return { error: result.error.message }
    await get().refreshSession(result.data.id)
    return { data: result.data }
  },

  // ---------------------------------------------------------------------------
  // SPELLS — CRUD
  // ---------------------------------------------------------------------------

  saveSpell: async (spell) => {
    const { campaign } = get()
    const payload = { ...spell, campaign_id: campaign?.id, updated_at: new Date().toISOString() }
    let result
    if (spell.id) {
      result = await supabase.from('spells').update(payload).eq('id', spell.id).select().single()
    } else {
      result = await supabase.from('spells').insert(payload).select().single()
    }
    if (result.error) return { error: result.error.message }
    const { spells } = get()
    const updated = spell.id ? spells.map(s => s.id === result.data.id ? result.data : s) : [...spells, result.data]
    set({ spells: updated })
    return { data: result.data }
  },

  deleteSpell: async (id) => {
    const { error } = await supabase.from('spells').delete().eq('id', id)
    if (error) return { error: error.message }
    set({ spells: get().spells.filter(s => s.id !== id) })
    return { success: true }
  },

  // ---------------------------------------------------------------------------
  // NPCs — CRUD
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  refreshSession: async (sessionId) => {
    const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (!session) return
    const refreshed = await get().loadSessionContent(session)
    const { sessions } = get()
    set({ sessions: sessions.map(s => s.id === sessionId ? refreshed : s) })
  },

  // Build a flat scene map for fast lookup: sceneId → scene
  getSceneMap: () => {
    const map = {}
    get().sessions.forEach(session => {
      session.scenes?.forEach(scene => {
        map[scene.id] = scene
        if (scene.slug) map[scene.slug] = scene
      })
    })
    return map
  },

  // Get all scenes flat
  getAllScenes: () => {
    return get().sessions.flatMap(s => s.scenes || [])
  },

  // ---------------------------------------------------------------------------
  // CREATE SESSION
  // ---------------------------------------------------------------------------

  createSession: async (title) => {
    const { adventureId, sessions } = get()
    if (!adventureId) return { error: 'No adventure loaded — run migration first' }

    const nextNumber = (sessions.length > 0
      ? Math.max(...sessions.map(s => s.session_number || s.order || 0)) + 1
      : 1)

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        adventure_id: adventureId,
        order: nextNumber,
        session_number: nextNumber,
        title: title || `Session ${nextNumber}`,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    const refreshed = await get().loadSessionContent(data)
    set({ sessions: [...get().sessions, refreshed] })
    return { data: refreshed }
  },
}))
