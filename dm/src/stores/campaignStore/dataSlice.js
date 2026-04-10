import { supabase } from '@shared/lib/supabase.js'

export function createDataSlice(set, get) {
  return {
    campaign: null,
    adventureId: null,
    sessions: [],
    statBlocks: [],
    statBlockMap: {},
    spells: [],
    compendiumSpells: [],
    npcs: [],
    assets: [],
    archivedSessions: [],
    archivedStatBlocks: [],

    loading: false,
    error: null,
    lastLoaded: null,

    loadCampaign: async (campaignSlug = 'green-hunger') => {
      set({ loading: true, error: null })
      try {
        const { data: campaign, error: ce } = await supabase
          .from('campaigns')
          .select('*')
          .eq('slug', campaignSlug)
          .single()
        if (ce) throw new Error(`campaign: ${ce.message}`)

        const { data: statBlocks, error: sbe } = await supabase
          .from('stat_blocks')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('name')
        if (sbe) throw new Error(`stat_blocks: ${sbe.message}`)

        const allStatBlocks = statBlocks || []
        const activeStatBlocks = allStatBlocks.filter(sb => !sb.archived_at)
        const archivedStatBlocks = allStatBlocks.filter(sb => !!sb.archived_at)
        const statBlockMap = {}
        ;activeStatBlocks.forEach(sb => {
          statBlockMap[sb.slug] = sb
          statBlockMap[sb.id] = sb
        })

        const { data: spells } = await supabase
          .from('spells')
          .select('*')
          .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
          .order('level, name')

        const { data: npcs } = await supabase
          .from('npcs')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('name')

        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('title')

        const { data: adventures } = await supabase
          .from('adventures')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
        const adventureId = adventures?.[0]?.id || null

        const { data: sessionsRaw, error: se } = await supabase
          .from('sessions')
          .select('*')
          .order('session_number, order, created_at')
        if (se) throw new Error(`sessions: ${se.message}`)

        const seen = new Set()
        const sessions = (sessionsRaw || []).filter(s => {
          const key = s.session_number ?? s.order
          if (s.archived_at) return false
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        const archivedSessionsRaw = (sessionsRaw || []).filter(s => !!s.archived_at)

        const sessionsWithContent = await Promise.all(
          sessions.map(s => get().loadSessionContent(s))
        )
        const archivedSessions = await Promise.all(
          archivedSessionsRaw.map(s => get().loadSessionContent(s))
        )

        const campaignSpells = (spells || []).filter(s => s.campaign_id === campaign.id)
        const compendiumSpells = (spells || []).filter(s => s.campaign_id == null)

        set({
          campaign,
          adventureId,
          sessions: sessionsWithContent,
          statBlocks: activeStatBlocks,
          archivedStatBlocks,
          statBlockMap,
          spells: campaignSpells,
          compendiumSpells,
          npcs: npcs || [],
          assets: assets || [],
          archivedSessions,
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

    refreshSession: async (sessionId) => {
      const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (!session) return
      const refreshed = await get().loadSessionContent(session)
      const { sessions } = get()
      set({ sessions: sessions.map(s => s.id === sessionId ? refreshed : s) })
    },

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

    getAllScenes: () => {
      return get().sessions.flatMap(s => s.scenes || [])
    },

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
  }
}
