import { supabase } from './supabase.js'

export const AUDIO_BUCKET = 'audio'

export function sanitizeAudioPathPart(value, fallback = 'unknown') {
  const safe = String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return safe || fallback
}

export function normalizeAudioPath(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  return raw.replace(/^\/+/, '').replace(/^audio\//, '')
}

export function getAudioPublicUrl(pathOrUrl) {
  const normalized = normalizeAudioPath(pathOrUrl)
  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) return normalized
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(normalized)
  return data?.publicUrl || null
}

export async function uploadAudioFile({
  file,
  campaignId,
  category = 'sfx',
  entityId = null,
}) {
  if (!file) throw new Error('No file provided')
  const ext = String(file?.name || 'mp3').split('.').pop()?.toLowerCase() || 'mp3'
  const safeCampaign = sanitizeAudioPathPart(campaignId || 'global')
  const safeCategory = sanitizeAudioPathPart(category || 'sfx')
  const safeEntity = sanitizeAudioPathPart(entityId || Date.now())
  const filename = `${Date.now()}.${ext}`
  const storagePath = `${safeCampaign}/${safeCategory}/${safeEntity}/${filename}`

  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '3600',
    })
  if (error) throw error

  return {
    storagePath,
    publicUrl: getAudioPublicUrl(storagePath),
  }
}

export async function deleteAudioFile(pathOrUrl) {
  const normalized = normalizeAudioPath(pathOrUrl)
  if (!normalized || /^https?:\/\//i.test(normalized)) return
  const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([normalized])
  if (error) throw error
}
