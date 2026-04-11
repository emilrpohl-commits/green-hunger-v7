import { getPortraitPublicUrl } from './portraitStorage.js'

/**
 * @param {Object} opts
 * @param {string|null|undefined} [opts.portraitUrl]
 * @param {string|null|undefined} [opts.portrait_thumb_storage_path]
 * @param {string|null|undefined} [opts.portrait_original_storage_path]
 * @param {string|null|undefined} [opts.image]
 * @param {string} [opts.name]
 */
export function resolvePortraitSrc({
  portraitUrl,
  portrait_thumb_storage_path,
  portrait_original_storage_path,
  image,
  name: _name,
} = {}) {
  const fromStorage = getPortraitPublicUrl(portrait_thumb_storage_path || portrait_original_storage_path)
  if (fromStorage) return fromStorage
  const p = portraitUrl || null
  if (p && /^https?:\/\//i.test(String(p))) return String(p)
  if (p && String(p).startsWith('data:')) return String(p)
  if (image && /^https?:\/\//i.test(String(image))) return String(image)
  if (image) return `characters/${image}`
  return null
}

export function portraitInitial(name) {
  const s = String(name || '?').trim()
  return s ? s.charAt(0).toUpperCase() : '?'
}
