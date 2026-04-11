import { supabase } from './supabase.js'

export const SCENE_MEDIA_BUCKET = 'scene-media'

export function getSceneMediaPublicUrl(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  const normalized = raw.replace(/^\/+/, '').replace(/^scene-media\//, '')
  const { data } = supabase.storage.from(SCENE_MEDIA_BUCKET).getPublicUrl(normalized)
  return data?.publicUrl || null
}

export async function uploadSceneImageFile({ file, campaignId, sceneId }) {
  if (!file) throw new Error('No file provided')
  const ext = String(file?.name || 'jpg').split('.').pop()?.toLowerCase() || 'jpg'
  const safeCamp = String(campaignId || 'global').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const safeScene = String(sceneId || 'scene').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const filename = `cover-${Date.now()}.${ext}`
  const storagePath = `${safeCamp}/${safeScene}/${filename}`

  const { error } = await supabase.storage
    .from(SCENE_MEDIA_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '3600',
    })
  if (error) throw error

  return {
    storagePath,
    publicUrl: getSceneMediaPublicUrl(storagePath),
  }
}

export async function uploadBeatImageFile({ file, campaignId, sceneId, beatId }) {
  if (!file) throw new Error('No file provided')
  if (!beatId) throw new Error('Save the beat first, then upload an illustration.')
  const ext = String(file?.name || 'jpg').split('.').pop()?.toLowerCase() || 'jpg'
  const safeCamp = String(campaignId || 'global').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const safeScene = String(sceneId || 'scene').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const safeBeat = String(beatId || 'beat').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const filename = `illustration-${Date.now()}.${ext}`
  const storagePath = `${safeCamp}/${safeScene}/beat-${safeBeat}/${filename}`

  const { error } = await supabase.storage
    .from(SCENE_MEDIA_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '3600',
    })
  if (error) throw error

  return {
    storagePath,
    publicUrl: getSceneMediaPublicUrl(storagePath),
  }
}
