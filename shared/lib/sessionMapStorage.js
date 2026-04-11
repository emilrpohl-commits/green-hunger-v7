import { supabase } from './supabase.js'

export const SESSION_MAPS_BUCKET = 'session-maps'

export function getSessionMapPublicUrl(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const normalized = raw.replace(/^\/+/, '').replace(/^session-maps\//, '')
  const { data } = supabase.storage.from(SESSION_MAPS_BUCKET).getPublicUrl(normalized)
  return data?.publicUrl || null
}

export async function uploadSessionMapVideo({ file, campaignId, sessionId }) {
  if (!file) throw new Error('No file provided')
  const ext = String(file?.name || 'mp4').split('.').pop()?.toLowerCase() || 'mp4'
  const safeCamp = String(campaignId || 'global').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const safeSess = String(sessionId || 'session').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const filename = `map-${Date.now()}.${ext}`
  const storagePath = `${safeCamp}/${safeSess}/${filename}`

  const { error } = await supabase.storage
    .from(SESSION_MAPS_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '3600',
    })
  if (error) throw error

  return {
    storagePath,
    publicUrl: getSessionMapPublicUrl(storagePath),
  }
}
