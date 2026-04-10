/**
 * Supabase Auth helpers for the DM app (email/password).
 * Enable Email provider in Supabase Dashboard; create a user for your DM account.
 */
import { supabase } from './supabase.js'

export async function getDmAuthSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) console.warn('getDmAuthSession:', error.message)
  return session
}

export async function signInDmWithEmailPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOutDm() {
  return supabase.auth.signOut()
}
