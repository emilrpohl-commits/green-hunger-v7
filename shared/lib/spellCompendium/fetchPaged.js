/** Page through spell_compendium (PostgREST max row limits). */
export async function fetchSpellCompendiumAll(supabase, pageSize = 400) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('spell_compendium')
      .select('*')
      .order('level', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return rows
}
