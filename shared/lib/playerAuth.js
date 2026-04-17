/**
 * Player SPA: bind Supabase Auth JWT user_metadata to session + character so RLS can enforce writes.
 * Requires Anonymous Sign-ins enabled in Supabase when using strict RLS.
 */
import { supabase } from './supabase.js'
import { getSessionRunId } from './runtimeContext.js'

/**
 * After password validation, establish anonymous session (if needed) and attach RLS claims.
 * @param {{ mode: 'party' | 'character', characterId?: string | null }} opts
 */
export async function establishPlayerSessionClaims(opts) {
  const { mode, characterId } = opts || {}
  const sessionRunId = getSessionRunId()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const { error: anonErr } = await supabase.auth.signInAnonymously()
    if (anonErr) {
      console.warn('establishPlayerSessionClaims: anonymous sign-in failed', anonErr.message)
    }
  }

  const meta = {
    gh_session_run_id: sessionRunId,
    gh_party_observer: mode === 'party' ? 'true' : 'false',
    gh_character_id: mode === 'character' && characterId ? String(characterId) : null,
  }

  const { error: updateErr } = await supabase.auth.updateUser({ data: meta })
  if (updateErr) {
    console.warn('establishPlayerSessionClaims: updateUser failed', updateErr.message)
    return { ok: false, error: updateErr.message }
  }
  return { ok: true }
}

/**
 * Refresh session_run_id claim when the client changes storage (e.g. after hydration).
 */
export async function refreshPlayerSessionRunClaim() {
  const sessionRunId = getSessionRunId()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { ok: false, error: 'no_session' }
  const { error } = await supabase.auth.updateUser({
    data: {
      ...session.user.user_metadata,
      gh_session_run_id: sessionRunId,
    },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
