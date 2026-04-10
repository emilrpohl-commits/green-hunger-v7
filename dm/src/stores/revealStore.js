import { create } from 'zustand'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'

// Predefined lore cards for Session 1
export const LORE_CARDS = [
  {
    id: 'lore-weald-1',
    category: 'Location',
    title: 'The Weald of Sharp Teeth',
    content: 'An ancient forest on the edge of Tethyr. Pre-kingdom old. The trees are bone-white, their bark smooth as bleached driftwood. The silence here has weight.',
    tone: 'location'
  },
  {
    id: 'lore-raven-1',
    category: 'Observation',
    title: 'The Watching Raven',
    content: 'A raven watches from the high branches. It has been there since you woke, if you think about it. You didn\'t think about it. It has not blinked.',
    tone: 'ominous'
  },
  {
    id: 'lore-wolves-1',
    category: 'Combat',
    title: 'Corrupted Wolves',
    content: 'The wolves move with a coordination that makes no sense. They do not growl before they strike. Where they are wounded, the flesh glows briefly green-black before closing slightly.',
    tone: 'danger'
  },
  {
    id: 'lore-birna-1',
    category: 'NPC',
    title: 'Birna Grove',
    content: 'A woman. Middle years. Mud on her boots. Eyes the colour of weathered copper. She does not step out of the trees — she steps out of the light.',
    tone: 'npc'
  },
  {
    id: 'lore-brooch-1',
    category: 'Item',
    title: 'Brooch of the Last Hearth',
    content: 'A brooch shaped like a bird in flight, wings spread wide. The metal is warm to the touch, thrumming with contained magic. It is attuned to Dorothea now.',
    tone: 'item'
  },
  {
    id: 'lore-eye-1',
    category: 'Item',
    title: 'Eye of the Hollow Raven',
    content: 'A glass eye, perfectly crafted. The iris shifts — green, then darker, then green again. It enhances magical perception. It lets you see things you could not see before.',
    tone: 'item'
  },
  {
    id: 'lore-ring-1',
    category: 'Item',
    title: 'Ring of the Unbroken Thread',
    content: 'Simple silver with a thread of gold woven through it. When Danil put it on, his wild magic stopped feeling like raw flare. A thousand invisible threads aligned.',
    tone: 'item'
  },
  {
    id: 'lore-fracture-1',
    category: 'Lore',
    title: 'The Fracture',
    content: 'Six months ago, a planar rupture tore through the Weald. Three figures emerged from it. The forest began changing after that. Growth accelerated in the wrong directions.',
    tone: 'lore'
  },
  {
    id: 'lore-binding-1',
    category: 'Lore',
    title: 'The Binding',
    content: 'Birna\'s ritual has connected you to the forest — and to each other. You can feel the others through it. Their presence. Their determination. Their fear.',
    tone: 'lore'
  },
  {
    id: 'lore-corruption-1',
    category: 'Warning',
    title: 'The Green Hunger',
    content: 'It does not announce itself. It does not seek dominion in any conventional sense. It whispers. It reshapes. It takes what is already present — grief, loss, memory — and gives it purpose.',
    tone: 'ominous'
  },
  // Session 2
  {
    id: 'lore-darcy-1',
    category: 'NPC',
    title: 'Darcy',
    content: 'He is not what he was. The proportions are wrong in ways that keep shifting as you look. His hands are too long. His neck bends at an angle that should hurt. His eyes burn green. Something in his face is working. Trying.',
    tone: 'ominous'
  },
  {
    id: 'lore-cabin-1',
    category: 'Location',
    title: 'The Druid\'s Cabin',
    content: 'It was not abandoned in haste. Whoever lived here chose to leave. On the walls: diagrams. Dozens of them. The same shape repeated in different scales — a root system beneath the ground, something that branches and spreads and comes to a single point at its centre.',
    tone: 'location'
  },
  {
    id: 'lore-cabin-inscription',
    category: 'Lore',
    title: 'The Inscription',
    content: '"She does not sleep. She waits. And when she is finished waiting she will not need to be woken."',
    tone: 'ominous'
  },
  {
    id: 'lore-damir-1',
    category: 'NPC',
    title: 'Damir, the Woven Grief',
    content: 'The body below is that of a spider — vast, eight-legged, its carapace the deep brown-black of old dried blood. But the head is human. A man\'s face, lined, the jaw set with the particular tension of someone who has been in pain for long enough to stop reacting to it.',
    tone: 'danger'
  },
  {
    id: 'lore-ilya-1',
    category: 'NPC',
    title: 'Ilyan',
    content: 'Suspended in a web cocoon twelve feet off the floor. He has been there for eleven days. He is conscious. His hands have been working at the silk — there are frayed strands around his fingers that have been picked at, slowly, for days.',
    tone: 'npc'
  },
  {
    id: 'lore-talona-1',
    category: 'Lore',
    title: 'Talona',
    content: 'A divine force in a state of frustrated containment. The corruption is not decay — it is pressure. Something vast pushing against a barrier that has been weakening for some time.',
    tone: 'ominous'
  }
]

export const useRevealStore = create((set, get) => ({
  reveals: [], // list of revealed cards
  /** Phase 2F: DB-backed lore catalog; starts as static until loadLoreCatalog runs */
  loreCatalog: LORE_CARDS,
  sessionRunId: getSessionRunId(),

  /**
   * Load lore catalog from DB. When campaignId is set, include that campaign’s rows plus global (campaign_id null).
   * When omitted, load all rows (legacy behaviour).
   */
  loadLoreCatalog: async (campaignId) => {
    try {
      let query = supabase.from('lore_cards').select('*').order('sort_order', { ascending: true })
      if (campaignId) {
        query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
      }
      const { data, error } = await query
      if (error) throw error
      set({
        loreCatalog: (data || []).map((row) => ({
          id: row.id,
          category: row.category,
          title: row.title,
          content: row.content,
          tone: row.tone,
          sort_order: row.sort_order,
          campaign_id: row.campaign_id,
        })),
      })
    } catch (e) {
      console.warn('lore_cards load failed, using bundled LORE_CARDS:', e?.message || e)
      set({ loreCatalog: LORE_CARDS })
    }
  },

  /** Upsert a lore_cards row and reload catalog (pass campaignId for same filter as loadLoreCatalog). */
  saveLoreCard: async (card, refetchCampaignId) => {
    const payload = {
      id: card.id,
      category: card.category ?? null,
      title: card.title,
      content: card.content,
      tone: card.tone || 'lore',
      sort_order: typeof card.sort_order === 'number' ? card.sort_order : 0,
      campaign_id: card.campaign_id ?? null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('lore_cards').upsert(payload, { onConflict: 'id' })
    if (error) return { error: error.message }
    await get().loadLoreCatalog(refetchCampaignId)
    return { success: true }
  },

  deleteLoreCard: async (id, refetchCampaignId) => {
    const { error } = await supabase.from('lore_cards').delete().eq('id', id)
    if (error) return { error: error.message }
    await get().loadLoreCatalog(refetchCampaignId)
    return { success: true }
  },

  // Push a beat's narrative text as a reveal
  revealBeat: async (beat, sceneName) => {
    const playerSafeContent = beat.player_text || beat.content
    const card = {
      id: `beat-${beat.id}-${Date.now()}`,
      category: sceneName,
      title: beat.title,
      content: playerSafeContent,
      tone: 'narrative',
      visibility: 'player_visible',
      revealedAt: new Date().toISOString()
    }
    await get().pushReveal(card)
  },

  // Push a predefined lore card
  revealLoreCard: async (loreCard) => {
    const card = {
      ...loreCard,
      id: `${loreCard.id}-${Date.now()}`,
      visibility: 'player_visible',
      revealedAt: new Date().toISOString()
    }
    await get().pushReveal(card)
  },

  // Push a custom card
  revealCustom: async (title, content, category = 'Note') => {
    const card = {
      id: `custom-${Date.now()}`,
      category,
      title,
      content,
      tone: 'narrative',
      visibility: 'player_visible',
      revealedAt: new Date().toISOString()
    }
    await get().pushReveal(card)
  },

  // Core push function
  pushReveal: async (card) => {
    const { reveals, sessionRunId } = get()
    set({ reveals: [card, ...reveals] })

    try {
      await supabase.from('reveals').insert({
        session_id: sessionRunId,
        session_run_id: sessionRunId,
        card_id: card.id,
        category: card.category,
        title: card.title,
        content: card.content,
        tone: card.tone,
        visibility: card.visibility || 'player_visible',
        revealed_at: card.revealedAt
      })
    } catch (e) {
      console.error('Reveal sync error:', e)
    }
  },

  // Hide/retract a reveal
  hideReveal: async (cardId) => {
    const { reveals, sessionRunId } = get()
    set({ reveals: reveals.filter(r => r.id !== cardId) })

    try {
      await supabase.from('reveals')
        .delete()
        .eq('session_id', sessionRunId)
        .eq('card_id', cardId)
    } catch (e) {
      console.error('Hide reveal error:', e)
    }
  },

  // Clear all reveals
  clearAllReveals: async () => {
    const { sessionRunId } = get()
    set({ reveals: [] })
    try {
      await supabase.from('reveals')
        .delete()
        .eq('session_id', sessionRunId)
    } catch (e) {}
  },

  // Load reveals from Supabase
  loadReveals: async () => {
    const { sessionRunId } = get()
    try {
      const { data } = await supabase
        .from('reveals')
        .select('*')
        .eq('session_id', sessionRunId)
        .order('revealed_at', { ascending: false })

      if (data) {
        set({
          reveals: data.map(d => ({
            id: d.card_id,
            category: d.category,
            title: d.title,
            content: d.content,
            tone: d.tone,
            revealedAt: d.revealed_at
          }))
        })
      }
    } catch (e) {
      console.log('No reveals found.')
    }
  },
}))

/** True if this catalog lore id was pushed via revealLoreCard (card_id is `${id}-${timestamp}`). */
export function isLoreCardRevealedInSession(loreId, reveals) {
  if (!loreId || !Array.isArray(reveals)) return false
  const prefix = `${loreId}-`
  return reveals.some((r) => String(r.id).startsWith(prefix))
}
