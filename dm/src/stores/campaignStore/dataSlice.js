import { supabase } from '@shared/lib/supabase.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { filterValidSpellRows } from '@shared/lib/validation/storeBoundaries.js'
import { compendiumRowToDmListRow } from '@shared/lib/spellCompendium/mappers.js'
import { fetchSpellCompendiumAll } from '@shared/lib/spellCompendium/fetchPaged.js'

const MAX_STAT_BLOCK_PAGES = 30

async function fetchStatBlocksForCampaignPaged(campaignId, {
  includeArchived = false,
  pageSize = 100,
  maxPages = MAX_STAT_BLOCK_PAGES,
  retries = 1,
} = {}) {
  const runPageQuery = async (from, to) => {
    let q = supabase
      .from('stat_blocks')
      .select('*')
      .eq('campaign_id', campaignId)
    q = includeArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null)
    q = includeArchived
      ? q.order('archived_at', { ascending: false })
      : q.order('name', { ascending: true })
    return q.range(from, to)
  }

  const rows = []
  let from = 0
  let pageIndex = 0
  for (;;) {
    if (pageIndex >= maxPages) {
      return { rows, truncated: true }
    }
    pageIndex += 1
    const to = from + pageSize - 1
    let attempt = 0
    let data = null
    let error = null
    while (attempt <= retries) {
      const res = await runPageQuery(from, to)
      data = res.data
      error = res.error
      if (!error) break
      const msg = String(error.message || '').toLowerCase()
      if (!msg.includes('statement timeout') && !msg.includes('canceling statement due to statement timeout')) break
      if (attempt === retries) break
      attempt += 1
    }
    if (error) throw new Error(`stat_blocks: ${error.message}`)
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) return { rows, truncated: false }
    from += pageSize
  }
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
    statBlockLoadInfo: {
      fetched: 0,
      active: 0,
      archived: 0,
      warning: null,
      campaignId: null,
    },
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
    statBlockLoadInfo: {
      fetched: 0,
      active: 0,
      archived: 0,
      warning: null,
      campaignId: null,
    },
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

        let activeStatBlocks = []
        let archivedStatBlocks = []
        let statBlockLoadWarning = null
        let activeTruncated = false
        let archivedTruncated = false
        try {
          const activeRes = await fetchStatBlocksForCampaignPaged(campaign.id, {
            includeArchived: false,
            pageSize: 100,
            retries: 1,
          })
          activeStatBlocks = activeRes.rows
          activeTruncated = activeRes.truncated
          const archRes = await fetchStatBlocksForCampaignPaged(campaign.id, {
            includeArchived: true,
            pageSize: 100,
            retries: 1,
          })
          archivedStatBlocks = archRes.rows
          archivedTruncated = archRes.truncated
        } catch (e) {
          // Non-fatal: let DM app load while surfacing the warning.
          console.warn('stat_blocks load:', e?.message || e)
          statBlockLoadWarning = `Stat blocks failed to load for this campaign: ${e?.message || e}`
          activeStatBlocks = []
          archivedStatBlocks = []
        }

        if (activeTruncated || archivedTruncated) {
          const parts = []
          if (activeTruncated) parts.push(`active list capped at ~${MAX_STAT_BLOCK_PAGES * 100} rows`)
          if (archivedTruncated) parts.push('archived list capped similarly')
          statBlockLoadWarning = [statBlockLoadWarning, parts.join('; ')].filter(Boolean).join(' — ')
        }

        const allStatBlocks = [...activeStatBlocks, ...archivedStatBlocks]
        const statBlockLoadInfo = {
          fetched: allStatBlocks.length,
          active: activeStatBlocks.length,
          archived: archivedStatBlocks.length,
          warning: statBlockLoadWarning,
          campaignId: campaign.id,
        }
        const statBlockMap = {}
        ;activeStatBlocks.forEach(sb => {
          statBlockMap[sb.slug] = sb
          statBlockMap[sb.id] = sb
        })

        // Batch 1: all queries independent once campaign.id is known — run in parallel
        const [
          spellsResult,
          compendiumResult,
          legacySpellsResult,
          npcsResult,
          assetsResult,
          audioAssetsResult,
          audioPlaylistsResult,
          encountersResult,
          charactersResult,
          arcsResult,
        ] = await Promise.all([
          supabase.from('spells').select('*').eq('campaign_id', campaign.id)
            .order('level', { ascending: true }).order('name', { ascending: true }),
          fetchSpellCompendiumAll(supabase).catch((e) => { console.warn('spell_compendium load:', e?.message || e); return [] }),
          supabase.from('spells').select('*').is('campaign_id', null)
            .order('level', { ascending: true }).order('name', { ascending: true }),
          supabase.from('npcs').select('*').eq('campaign_id', campaign.id).order('name'),
          supabase.from('assets').select('*').eq('campaign_id', campaign.id).order('title'),
          supabase.from('audio_assets').select('*').eq('campaign_id', campaign.id).order('name'),
          supabase.from('audio_playlists').select('*').eq('campaign_id', campaign.id).order('name'),
          supabase.from('encounters').select('*').eq('campaign_id', campaign.id).order('title'),
          supabase.from('characters').select('*').or(`campaign_id.eq.${campaign.id},campaign_id.is.null`).order('name'),
          supabase.from('arcs').select('id, order').eq('campaign_id', campaign.id).order('order', { ascending: true }),
        ])

        const campaignSpellsOnly = filterValidSpellRows(spellsResult.data || [])
        const compendiumTableRows = Array.isArray(compendiumResult) ? compendiumResult : []
        const legacyGlobalSpells = filterValidSpellRows(legacySpellsResult.data || [])
        if (audioAssetsResult.error) console.warn('audio_assets load:', audioAssetsResult.error.message)
        if (audioPlaylistsResult.error) console.warn('audio_playlists load:', audioPlaylistsResult.error.message)
        if (encountersResult.error) console.warn('encounters load:', encountersResult.error.message)
        if (charactersResult.error) console.warn('characters load:', charactersResult.error.message)
        if (arcsResult.error) throw new Error(`arcs: ${arcsResult.error.message}`)

        const compendiumMapped = compendiumTableRows.map(compendiumRowToDmListRow).filter(Boolean)
        const compendiumIds = new Set(compendiumMapped.map((s) => s.spell_id))
        const legacyMerged = legacyGlobalSpells
          .filter((s) => s.spell_id && !compendiumIds.has(s.spell_id))
          .map((s) => ({ ...s, _compendium: false, _sourceType: 'legacy' }))
        const compendiumSpells = [...compendiumMapped, ...legacyMerged].sort(
          (a, b) => (a.level - b.level) || String(a.name || '').localeCompare(String(b.name || ''))
        )

        const audioPlaylistsRaw = audioPlaylistsResult.data || []
        const arcRows = arcsResult.data || []
        const arcIds = arcRows.map((a) => a.id)
        const arcOrder = new Map(arcRows.map((a) => [a.id, a.order ?? 0]))

        // Batch 2: two chains that each depend on Batch 1 results — run in parallel with each other
        const [audioPlaylistItemsRaw, { adventureId, sessionsRaw }] = await Promise.all([
          // playlist items depend on playlist IDs from Batch 1
          (async () => {
            if (audioPlaylistsRaw.length === 0) return []
            const playlistIds = audioPlaylistsRaw.map((p) => p.id)
            const { data: apItems, error: apItemsErr } = await supabase
              .from('audio_playlist_items').select('*')
              .in('playlist_id', playlistIds).order('position', { ascending: true })
            if (apItemsErr) { console.warn('audio_playlist_items load:', apItemsErr.message); return [] }
            return apItems || []
          })(),
          // sessions depend on arc IDs from Batch 1
          (async () => {
            if (arcIds.length === 0) return { adventureId: null, sessionsRaw: [] }
            const { data: adventures, error: advErr } = await supabase
              .from('adventures').select('id, order, arc_id').in('arc_id', arcIds)
            if (advErr) throw new Error(`adventures: ${advErr.message}`)
            const advSorted = [...(adventures || [])].sort((a, b) => {
              const ao = arcOrder.get(a.arc_id) ?? 0
              const bo = arcOrder.get(b.arc_id) ?? 0
              if (ao !== bo) return ao - bo
              return (a.order || 0) - (b.order || 0)
            })
            const adventureId = advSorted[0]?.id || null
            const adventureIds = advSorted.map((a) => a.id)
            if (adventureIds.length === 0) return { adventureId, sessionsRaw: [] }
            const { data: sessRows, error: se } = await supabase
              .from('sessions').select('*').in('adventure_id', adventureIds)
              .order('session_number', { ascending: true })
              .order('order', { ascending: true })
              .order('created_at', { ascending: true })
            if (se) throw new Error(`sessions: ${se.message}`)
            return { adventureId, sessionsRaw: sessRows || [] }
          })(),
        ])

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

        set({
          campaign,
          adventureId,
          sessions: sessionsWithContent,
          statBlocks: activeStatBlocks,
          archivedStatBlocks,
          statBlockLoadInfo,
          statBlockMap,
          spells: campaignSpellsOnly,
          compendiumSpells,
          npcs: npcsResult.data || [],
          assets: assetsResult.data || [],
          audioAssets: audioAssetsResult.data || [],
          audioPlaylists: audioPlaylistsRaw,
          audioPlaylistItems: audioPlaylistItemsRaw,
          encounters: encountersResult.data || [],
          characters: charactersResult.data || [],
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

    refreshCompendiumSpells: async () => {
      try {
        const compendiumTableRows = await fetchSpellCompendiumAll(supabase)
        let legacyGlobalSpells = []
        const { data: leg } = await supabase
          .from('spells')
          .select('*')
          .is('campaign_id', null)
          .order('level', { ascending: true })
          .order('name', { ascending: true })
        legacyGlobalSpells = filterValidSpellRows(leg || [])
        const compendiumMapped = compendiumTableRows.map(compendiumRowToDmListRow).filter(Boolean)
        const compendiumIds = new Set(compendiumMapped.map((s) => s.spell_id))
        const legacyMerged = legacyGlobalSpells
          .filter((s) => s.spell_id && !compendiumIds.has(s.spell_id))
          .map((s) => ({ ...s, _compendium: false, _sourceType: 'legacy' }))
        const compendiumSpells = [...compendiumMapped, ...legacyMerged].sort(
          (a, b) => (a.level - b.level) || String(a.name || '').localeCompare(String(b.name || ''))
        )
        set({ compendiumSpells })
        return { ok: true, count: compendiumSpells.length }
      } catch (e) {
        console.warn('refreshCompendiumSpells:', e?.message || e)
        return { ok: false, error: e?.message || String(e) }
      }
    },

    /** Server-side compendium name / search_text match (for large libraries). */
    searchSpellCompendiumIlike: async (q, { limit = 120 } = {}) => {
      const needle = String(q || '').trim()
      if (needle.length < 2) return []
      const pattern = `%${needle}%`
      const [{ data: byName, error: e1 }, { data: bySearch, error: e2 }] = await Promise.all([
        supabase.from('spell_compendium').select('*').ilike('name', pattern).limit(limit),
        supabase.from('spell_compendium').select('*').ilike('search_text', pattern).limit(limit),
      ])
      if (e1) console.warn('searchSpellCompendiumIlike name:', e1.message)
      if (e2) console.warn('searchSpellCompendiumIlike search_text:', e2.message)
      const byId = new Map()
      for (const row of [...(byName || []), ...(bySearch || [])]) {
        if (row?.id) byId.set(row.id, compendiumRowToDmListRow(row))
      }
      return Array.from(byId.values()).filter(Boolean)
    },

  }
}
