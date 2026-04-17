import { createClient } from '@supabase/supabase-js'

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const SUPABASE_URL = String(env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_KEY = String(env.VITE_SUPABASE_KEY || '').trim()
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'

const isBrowser = typeof window !== 'undefined'
const isLocalHost =
  isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const forceLocalSupabase =
  !!env.DEV && isLocalHost && String(env.VITE_FORCE_LOCAL_SUPABASE || '').trim() === '1'

const resolvedSupabaseUrl =
  forceLocalSupabase && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(SUPABASE_URL)
    ? LOCAL_SUPABASE_URL
    : SUPABASE_URL

if (!resolvedSupabaseUrl || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY. Copy dm/.env.example and set values in .env.local (gitignored).'
  )
}

if (forceLocalSupabase && SUPABASE_URL && SUPABASE_URL !== LOCAL_SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.info(`[supabase] Forcing local URL in dev: ${LOCAL_SUPABASE_URL} (configured: ${SUPABASE_URL})`)
}

export const supabase = createClient(
  resolvedSupabaseUrl || 'https://invalid.local',
  SUPABASE_KEY || 'invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
