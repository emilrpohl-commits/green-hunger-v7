import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bounfmozhwltyalocduv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wkcJ1NVp-CJNhSay-j8QXw_ymo1XLkb'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
