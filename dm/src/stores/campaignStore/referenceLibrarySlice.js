import { supabase } from '@shared/lib/supabase.js'
import { slugify } from '@shared/lib/parsers/parserUtils.js'

function upsertById(list, row) {
  const idx = list.findIndex((x) => x.id === row.id)
  if (idx === -1) return [row, ...list]
  const next = list.slice()
  next[idx] = row
  return next
}

export function createReferenceLibrarySlice(set, get) {
  return {
    referenceFeats: [],
    referenceSpells: [],
    referenceMonsters: [],
    referenceRaces: [],
    referenceBackgrounds: [],
    referenceEquipment: [],
    referenceMagicItems: [],
    referenceClassFeatures: [],
    referenceSubclasses: [],
    referenceLoading: false,
    referenceError: null,

    loadReferenceFeats: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_feats')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceFeats: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceSpells: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_spells')
        .select('*')
        .eq('ruleset', ruleset)
        .order('level', { ascending: true })
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceSpells: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceMonsters: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_monsters')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceMonsters: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceRaces: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_races')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceRaces: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceBackgrounds: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_backgrounds')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceBackgrounds: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceEquipment: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_equipment')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceEquipment: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceMagicItems: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_magic_items')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceMagicItems: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceClassFeatures: async (className, ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      let query = supabase
        .from('reference_class_features')
        .select('*')
        .eq('ruleset', ruleset)
        .order('level', { ascending: true })
      if (className) query = query.eq('class_name', className)
      const { data, error } = await query
      set({ referenceLoading: false, referenceClassFeatures: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    loadReferenceSubclasses: async (ruleset = '2014') => {
      set({ referenceLoading: true, referenceError: null })
      const { data, error } = await supabase
        .from('reference_subclasses')
        .select('*')
        .eq('ruleset', ruleset)
        .order('name', { ascending: true })
      set({ referenceLoading: false, referenceSubclasses: data || [], referenceError: error?.message || null })
      return { data: data || [], error: error?.message || null }
    },

    saveFeat: async (feat) => {
      const row = {
        ...feat,
        ruleset: feat.ruleset || '2014',
        source_type: feat.source_type || 'custom',
        source_book: feat.source_book || 'Homebrew',
        source_index: feat.source_index || slugify(feat.name),
      }
      const { data, error } = await supabase
        .from('reference_feats')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceFeats: upsertById(s.referenceFeats, data) }))
      return { data }
    },

    saveReferenceSpell: async (spell) => {
      const row = {
        ...spell,
        ruleset: spell.ruleset || '2014',
        source_type: spell.source_type || 'custom',
        source_book: spell.source_book || 'Homebrew',
        source_index: spell.source_index || slugify(spell.name),
      }
      const { data, error } = await supabase
        .from('reference_spells')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceSpells: upsertById(s.referenceSpells, data) }))
      return { data }
    },

    saveReferenceMonster: async (monster) => {
      const row = {
        ...monster,
        ruleset: monster.ruleset || '2014',
        source_type: monster.source_type || 'custom',
        source_book: monster.source_book || 'Homebrew',
        source_index: monster.source_index || slugify(monster.name),
      }
      const { data, error } = await supabase
        .from('reference_monsters')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceMonsters: upsertById(s.referenceMonsters, data) }))
      return { data }
    },

    saveRace: async (race) => {
      const row = {
        ...race,
        ruleset: race.ruleset || '2014',
        source_type: race.source_type || 'custom',
        source_book: race.source_book || 'Homebrew',
        source_index: race.source_index || slugify(race.name),
      }
      const { data, error } = await supabase
        .from('reference_races')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceRaces: upsertById(s.referenceRaces, data) }))
      return { data }
    },

    saveBackground: async (bg) => {
      const row = {
        ...bg,
        ruleset: bg.ruleset || '2014',
        source_type: bg.source_type || 'custom',
        source_book: bg.source_book || 'Homebrew',
        source_index: bg.source_index || slugify(bg.name),
      }
      const { data, error } = await supabase
        .from('reference_backgrounds')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceBackgrounds: upsertById(s.referenceBackgrounds, data) }))
      return { data }
    },

    saveEquipment: async (eq) => {
      const row = {
        ...eq,
        ruleset: eq.ruleset || '2014',
        source_type: eq.source_type || 'custom',
        source_book: eq.source_book || 'Homebrew',
        source_index: eq.source_index || slugify(eq.name),
      }
      const { data, error } = await supabase
        .from('reference_equipment')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceEquipment: upsertById(s.referenceEquipment, data) }))
      return { data }
    },

    saveMagicItem: async (item) => {
      const row = {
        ...item,
        ruleset: item.ruleset || '2014',
        source_type: item.source_type || 'custom',
        source_book: item.source_book || 'Homebrew',
        source_index: item.source_index || slugify(item.name),
      }
      const { data, error } = await supabase
        .from('reference_magic_items')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceMagicItems: upsertById(s.referenceMagicItems, data) }))
      return { data }
    },

    saveClassFeature: async (feature) => {
      const row = {
        ...feature,
        ruleset: feature.ruleset || '2014',
        source_type: feature.source_type || 'custom',
        source_book: feature.source_book || 'Homebrew',
        source_index: feature.source_index || slugify(feature.name),
      }
      const { data, error } = await supabase
        .from('reference_class_features')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceClassFeatures: upsertById(s.referenceClassFeatures, data) }))
      return { data }
    },

    saveSubclass: async (subclass) => {
      const row = {
        ...subclass,
        ruleset: subclass.ruleset || '2014',
        source_type: subclass.source_type || 'custom',
        source_book: subclass.source_book || 'Homebrew',
        source_index: subclass.source_index || slugify(subclass.name),
      }
      const { data, error } = await supabase
        .from('reference_subclasses')
        .upsert(row, { onConflict: 'ruleset,source_index' })
        .select()
        .single()
      if (error) return { error: error.message }
      set((s) => ({ referenceSubclasses: upsertById(s.referenceSubclasses, data) }))
      return { data }
    },
  }
}
