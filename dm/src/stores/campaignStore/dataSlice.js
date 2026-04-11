import { supabase } from '@shared/lib/supabase.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { loadSessionContentTree } from '@shared/lib/sessionTreeLoader.js'
import { filterValidSpellRows } from '@shared/lib/validation/storeBoundaries.js'

async function fetchStatBlocksForCampaignPaged(campaignId, pageSize = 250) {
  const rows = []
  let from = 0
  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('stat_blocks')
      .select('*')
      .eq('campaign_id', campaignId)
      .range(from, to)
    if (error) throw new Error(`stat_blocks: ${error.message}`)
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
}

function emptyCampaignState(campaignChoices = []) {
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
    audioAssets: [],
    audioPlaylists: [],
    audioPlaylistItems: [],
    encounters: [],
    archivedSessions: [],
    archivedStatBlocks: [],
    campaignChoices,
    characters: [],
  }
}

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
    audioAssets: [],
    audioPlaylists: [],
    audioPlaylistItems: [],
    /** Phase 2C/F: campaign encounters (DB-backed quick launch) */
    encounters: [],
    /** Stage 5: PCs linked to campaign */
    characters: [],
    archivedSessions: [],
    archivedStatBlocks: [],
    /** Seedless boot: multiple campaigns when no slug was passed — DM picks one to load */
    campaignChoices: [],

    loading: false,
    error: null,
    lastLoaded: null,

    loadCampaign: async (campaignSlug) => {
      const explicit = campaignSlug !== undefined && campaignSlug !== null && String(campaignSlug).trim() !== ''

      let slug = explicit ? String(campaignSlug).trim() : null

      if (!slug) {
        const legacyImplicit = !featureFlags.seedlessPlatform || featureFlags.demoCampaign
        if (legacyImplicit) {
          slug = 'green-hunger'
        } else {
          set({ loading: true, error: null })
          try {
            const { data: rows, error: listErr } = await supabase
              .from('campaigns')
              .select('id, slug, title, subtitle')
              .order('created_at', { ascending: true })
            if (listErr) throw new Error(`campaigns: ${listErr.message}`)
            const list = rows || []
            if (list.length === 0) {
              set({
                ...emptyCampaignState([]),
                loading: false,
                error: null,
                lastLoaded: null,
              })
              return { ok: true, mode: 'empty' }
            }
            if (list.length === 1) {
              set({ loading: false })
              return get().loadCampaign(list[0].slug)
            }
            set({
              ...emptyCampaignState(list),
              loading: false,
              error: null,
              lastLoaded: null,
            })
            return { ok: true, mode: 'pick', campaigns: list }
          } catch (e) {
            console.error('loadCampaign (campaign list) error:', e)
            set({
              loading: false,
              error: e.message,
              ...emptyCampaignState([]),
              lastLoaded: null,
            })
            return { ok: false, error: e.message }
          }
        }
      }

      set({ loading: true, error: null, campaignChoices: [] })
      try {
        const { data: campaign, error: ce } = await supabase
          .from('campaigns')
          .select('*')
          .eq('slug', slug)
          .single()
        if (ce) throw new Error(`campaign: ${ce.message}`)

        let statBlocks = []
        try {
          statBlocks = await fetchStatBlocksForCampaignPaged(campaign.id)
        } catch (e) {
          // Non-fatal: let DM app load while surfacing the warning.
          console.warn('stat_blocks load:', e?.message || e)
          statBlocks = []
        }

        const allStatBlocks = statBlocks || []
        const activeStatBlocks = allStatBlocks.filter(sb => !sb.archived_at)
        const archivedStatBlocks = allStatBlocks.filter(sb => !!sb.archived_at)
        const statBlockMap = {}
        ;activeStatBlocks.forEach(sb => {
          statBlockMap[sb.slug] = sb
          statBlockMap[sb.id] = sb
        })

        const { data: spellsRaw } = await supabase
          .from('spells')
          .select('*')
          .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
          .order('level, name')
        const spells = filterValidSpellRows(spellsRaw || [])

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

        const { data: audioAssetsRaw, error: audioAssetsErr } = await supabase
          .from('audio_assets')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('name')
        if (audioAssetsErr) {
          console.warn('audio_assets load:', audioAssetsErr.message)
        }

        const { data: audioPlaylistsRaw, error: audioPlaylistsErr } = await supabase
          .from('audio_playlists')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('name')
        if (audioPlaylistsErr) {
          console.warn('audio_playlists load:', audioPlaylistsErr.message)
        }

        let audioPlaylistItemsRaw = []
        if ((audioPlaylistsRaw || []).length > 0) {
          const playlistIds = (audioPlaylistsRaw || []).map((p) => p.id)
          const { data: apItems, error: apItemsErr } = await supabase
            .from('audio_playlist_items')
            .select('*')
            .in('playlist_id', playlistIds)
            .order('position', { ascending: true })
          if (apItemsErr) {
            console.warn('audio_playlist_items load:', apItemsErr.message)
          } else {
            audioPlaylistItemsRaw = apItems || []
          }
        }

        const { data: encountersRaw, error: encErr } = await supabase
          .from('encounters')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('title')
        if (encErr) {
          console.warn('encounters load:', encErr.message)
        }

        const { data: characterRows, error: chErr } = await supabase
          .from('characters')
          .select('*')
          .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
          .order('name')
        if (chErr) {
          console.warn('characters load:', chErr.message)
        }

        const { data: arcs, error: arcErr } = await supabase
          .from('arcs')
          .select('id, order')
          .eq('campaign_id', campaign.id)
          .order('order', { ascending: true })
        if (arcErr) throw new Error(`arcs: ${arcErr.message}`)

        const arcRows = arcs || []
        const arcIds = arcRows.map((a) => a.id)
        const arcOrder = new Map(arcRows.map((a) => [a.id, a.order ?? 0]))

        let adventureId = null
        let sessionsRaw = []
        if (arcIds.length > 0) {
          const { data: adventures, error: advErr } = await supabase
            .from('adventures')
            .select('id, order, arc_id')
            .in('arc_id', arcIds)
          if (advErr) throw new Error(`adventures: ${advErr.message}`)
          const advSorted = [...(adventures || [])].sort((a, b) => {
            const ao = arcOrder.get(a.arc_id) ?? 0
            const bo = arcOrder.get(b.arc_id) ?? 0
            if (ao !== bo) return ao - bo
            return (a.order || 0) - (b.order || 0)
          })
          adventureId = advSorted[0]?.id || null
          const adventureIds = advSorted.map((a) => a.id)
          if (adventureIds.length > 0) {
            const { data: sessRows, error: se } = await supabase
              .from('sessions')
              .select('*')
              .in('adventure_id', adventureIds)
              .order('session_number', { ascending: true })
              .order('order', { ascending: true })
              .order('created_at', { ascending: true })
            if (se) throw new Error(`sessions: ${se.message}`)
            sessionsRaw = sessRows || []
          }
        }

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
          audioAssets: audioAssetsRaw || [],
          audioPlaylists: audioPlaylistsRaw || [],
          audioPlaylistItems: audioPlaylistItemsRaw || [],
          encounters: encountersRaw || [],
          characters: characterRows || [],
          archivedSessions,
          campaignChoices: [],
          loading: false,
          lastLoaded: new Date(),
        })
        return { ok: true, mode: 'loaded', slug }
      } catch (e) {
        console.error('loadCampaign error:', e)
        set({ loading: false, error: e.message })
        return { ok: false, error: e.message }
      }
    },

    loadSessionContent: async (session) => loadSessionContentTree(supabase, session),

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
