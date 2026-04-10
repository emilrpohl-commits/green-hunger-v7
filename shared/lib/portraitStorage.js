import { supabase } from './supabase.js'

export const PORTRAITS_BUCKET = 'portraits'

export function defaultPortraitCrop() {
  return { unit: 'relative', x: 0.12, y: 0.08, width: 0.76, height: 0.84, zoom: 1.0 }
}

export function normalizePortraitPath(path) {
  const raw = String(path || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  return raw.replace(/^\/+/, '').replace(/^portraits\//, '')
}

export function normalizePortraitCrop(crop) {
  if (!crop || typeof crop !== 'object') return defaultPortraitCrop()
  const asNum = (v, fallback) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    unit: 'relative',
    x: Math.max(0, Math.min(1, asNum(crop.x, 0.12))),
    y: Math.max(0, Math.min(1, asNum(crop.y, 0.08))),
    width: Math.max(0.01, Math.min(1, asNum(crop.width, 0.76))),
    height: Math.max(0.01, Math.min(1, asNum(crop.height, 0.84))),
    zoom: Math.max(0.1, Math.min(4, asNum(crop.zoom, 1))),
  }
}

export function getPortraitPublicUrl(pathOrUrl) {
  const normalized = normalizePortraitPath(pathOrUrl)
  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) return normalized
  const { data } = supabase.storage.from(PORTRAITS_BUCKET).getPublicUrl(normalized)
  return data?.publicUrl || null
}

export async function uploadPortraitFile({ file, campaignId, entityType, entityId, variant = 'original' }) {
  const ext = String(file?.name || 'png').split('.').pop()?.toLowerCase() || 'png'
  const safeEntityType = String(entityType || 'misc').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const safeCampaign = String(campaignId || 'global').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const safeEntity = String(entityId || Date.now()).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const filename = `${variant}-${Date.now()}.${ext}`
  const storagePath = `${safeCampaign}/${safeEntityType}/${safeEntity}/${filename}`

  const { error } = await supabase.storage
    .from(PORTRAITS_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type || undefined, cacheControl: '3600' })
  if (error) throw error

  return {
    storagePath,
    publicUrl: getPortraitPublicUrl(storagePath),
  }
}
