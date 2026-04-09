/**
 * Structured QA log for spell/save resolution (table: combat_resolution_events).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function logCombatResolutionEvent(supabase, {
  sessionRunId,
  round = 0,
  kind,
  payload = {},
}) {
  if (!supabase || !sessionRunId || !kind) return
  try {
    await supabase.from('combat_resolution_events').insert({
      session_run_id: sessionRunId,
      round,
      kind,
      payload,
    })
  } catch (e) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('logCombatResolutionEvent', e)
    }
  }
}
