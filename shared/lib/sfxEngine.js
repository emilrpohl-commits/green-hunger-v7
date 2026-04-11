/**
 * Short one-shots on a separate channel from background music (new Audio per play = overlap-friendly).
 */
import { getAudioPublicUrl } from './audioStorage.js'

const LS_KEY = 'gh_sfx_prefs'

function readPrefs() {
  try {
    const j = JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) || '{}' : '{}')
    return {
      muted: Boolean(j.muted),
      volume: typeof j.volume === 'number' ? Math.min(1, Math.max(0, j.volume)) : 0.85,
    }
  } catch {
    return { muted: false, volume: 0.85 }
  }
}

export function getSfxPrefs() {
  return readPrefs()
}

export function setSfxPrefs(partial) {
  if (typeof localStorage === 'undefined') return
  const next = { ...readPrefs(), ...partial }
  localStorage.setItem(LS_KEY, JSON.stringify(next))
}

/** Resolve storage path or URL to playable URL */
export function resolveSfxUrl(urlOrPath) {
  if (!urlOrPath) return null
  const s = String(urlOrPath).trim()
  if (!s) return null
  return getAudioPublicUrl(s) || s
}

/**
 * Fire-and-forget SFX. Does not pause or duck background tracks.
 * @param {string | null | undefined} urlOrPath
 */
export function playSfx(urlOrPath) {
  const url = resolveSfxUrl(urlOrPath)
  if (!url) return
  const { muted, volume } = readPrefs()
  if (muted || volume <= 0) return
  try {
    const a = new Audio(url)
    a.volume = volume
    a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

export function playDmSfx(urlOrPath) {
  playSfx(urlOrPath)
}
