import { create } from 'zustand'
import { getAudioEngine } from '../lib/audioEngine.js'
import { pushToast } from './toastStore.js'

const PREFS_KEY = 'gh_dm_audio_prefs_v1'
const RECENT_LIMIT = 12

/** Serialize overlapping playBackground so fades do not interleave. */
let bgPlayChain = Promise.resolve()

function clamp01(v, fallback = 1) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(1, n))
}

function clampCrossfadeMs(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 250
  return Math.max(0, Math.min(2000, Math.round(n)))
}

function loadPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

function savePrefs(snapshot) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(snapshot))
  } catch {
    // noop
  }
}

const initialPrefs = loadPrefs()

export const useAudioStore = create((set, get) => ({
  masterVolume: clamp01(initialPrefs.masterVolume, 1),
  backgroundVolume: clamp01(initialPrefs.backgroundVolume, 0.7),
  sfxVolume: clamp01(initialPrefs.sfxVolume, 1),
  muted: !!initialPrefs.muted,

  dockExpanded: initialPrefs.dockExpanded !== false,
  selectedTab: initialPrefs.selectedTab || 'now',
  selectedBackgroundPlaylistId: initialPrefs.selectedBackgroundPlaylistId || null,
  selectedSfxPlaylistId: initialPrefs.selectedSfxPlaylistId || null,

  soundDockEncounterTargetId: initialPrefs.soundDockEncounterTargetId || null,
  crossfadeMs: clampCrossfadeMs(initialPrefs.crossfadeMs),

  currentBackgroundTrackId: initialPrefs.currentBackgroundTrackId || null,
  backgroundIsPlaying: false,
  backgroundLoop: initialPrefs.backgroundLoop !== false,
  backgroundPositionSec: 0,
  backgroundDurationSec: 0,

  activeLoopedSfxIds: [],
  recentAssetIds: Array.isArray(initialPrefs.recentAssetIds) ? initialPrefs.recentAssetIds : [],
  favouriteAssetIds: Array.isArray(initialPrefs.favouriteAssetIds) ? initialPrefs.favouriteAssetIds : [],

  hydrateEngine: () => {
    const engine = getAudioEngine()
    const {
      masterVolume,
      backgroundVolume,
      sfxVolume,
      muted,
    } = get()
    engine.setMasterVolume(masterVolume)
    engine.setBackgroundVolume(backgroundVolume)
    engine.setSfxVolume(sfxVolume)
    engine.setMuted(muted)
    engine.setBackgroundStateListener((st) => {
      const dur = st.duration
      set({
        backgroundIsPlaying: st.isPlaying,
        backgroundPositionSec: st.currentTime || 0,
        backgroundLoop: !!st.loop,
        ...(Number.isFinite(dur) && dur > 0 ? { backgroundDurationSec: dur } : {}),
      })
    })
    get().refreshBackgroundState()
  },

  persistPrefs: () => {
    const s = get()
    savePrefs({
      masterVolume: s.masterVolume,
      backgroundVolume: s.backgroundVolume,
      sfxVolume: s.sfxVolume,
      muted: s.muted,
      dockExpanded: s.dockExpanded,
      selectedTab: s.selectedTab,
      selectedBackgroundPlaylistId: s.selectedBackgroundPlaylistId,
      selectedSfxPlaylistId: s.selectedSfxPlaylistId,
      soundDockEncounterTargetId: s.soundDockEncounterTargetId,
      crossfadeMs: s.crossfadeMs,
      currentBackgroundTrackId: s.currentBackgroundTrackId,
      backgroundLoop: s.backgroundLoop,
      recentAssetIds: s.recentAssetIds,
      favouriteAssetIds: s.favouriteAssetIds,
    })
  },

  setDockExpanded: (value) => {
    set({ dockExpanded: !!value })
    get().persistPrefs()
  },
  setSelectedTab: (tab) => {
    set({ selectedTab: tab })
    get().persistPrefs()
  },

  setSelectedBackgroundPlaylistId: (id) => {
    set({ selectedBackgroundPlaylistId: id || null })
    get().persistPrefs()
  },
  setSelectedSfxPlaylistId: (id) => {
    set({ selectedSfxPlaylistId: id || null })
    get().persistPrefs()
  },

  setSoundDockEncounterTargetId: (id) => {
    set({ soundDockEncounterTargetId: id || null })
    get().persistPrefs()
  },

  setCrossfadeMs: (ms) => {
    set({ crossfadeMs: clampCrossfadeMs(ms) })
    get().persistPrefs()
  },

  setMasterVolume: (value) => {
    const n = clamp01(value, 1)
    getAudioEngine().setMasterVolume(n)
    set({ masterVolume: n })
    get().persistPrefs()
  },
  setBackgroundVolume: (value) => {
    const n = clamp01(value, 0.7)
    getAudioEngine().setBackgroundVolume(n)
    set({ backgroundVolume: n })
    get().persistPrefs()
  },
  setSfxVolume: (value) => {
    const n = clamp01(value, 1)
    getAudioEngine().setSfxVolume(n)
    set({ sfxVolume: n })
    get().persistPrefs()
  },
  setMuted: (flag) => {
    const next = !!flag
    getAudioEngine().setMuted(next)
    set({ muted: next })
    get().persistPrefs()
  },

  toggleFavourite: (assetId) => {
    const id = String(assetId || '')
    if (!id) return
    const current = new Set(get().favouriteAssetIds)
    if (current.has(id)) current.delete(id)
    else current.add(id)
    set({ favouriteAssetIds: Array.from(current) })
    get().persistPrefs()
  },

  markRecent: (assetId) => {
    const id = String(assetId || '')
    if (!id) return
    const next = [id, ...get().recentAssetIds.filter((x) => x !== id)].slice(0, RECENT_LIMIT)
    set({ recentAssetIds: next })
    get().persistPrefs()
  },

  refreshBackgroundState: () => {
    const st = getAudioEngine().getBackgroundState()
    const dur = st.duration
    set({
      backgroundIsPlaying: st.isPlaying,
      backgroundPositionSec: st.currentTime || 0,
      backgroundLoop: !!st.loop,
      ...(Number.isFinite(dur) && dur > 0 ? { backgroundDurationSec: dur } : {}),
    })
  },

  playBackground: async (asset, opts = {}) => {
    if (!asset?.url) {
      pushToast('No audio URL for this track.', 'error')
      return
    }
    const loop = opts.loop ?? get().backgroundLoop
    const crossfadeMs = opts.crossfadeMs ?? get().crossfadeMs ?? 250

    const run = async () => {
      try {
        await getAudioEngine().playBackground({
          url: asset.url,
          loop,
          startAt: opts.startAt ?? 0,
          crossfadeMs,
        })
        set({
          currentBackgroundTrackId: asset.id,
          backgroundIsPlaying: true,
          backgroundLoop: !!loop,
        })
        get().markRecent(asset.id)
        get().persistPrefs()
        get().refreshBackgroundState()
      } catch (e) {
        pushToast(e?.message ? `Playback: ${e.message}` : 'Background playback failed.', 'error')
        throw e
      }
    }

    bgPlayChain = bgPlayChain.then(run, run).catch(() => {})
    return bgPlayChain
  },

  pauseBackground: () => {
    getAudioEngine().pauseBackground()
    set({ backgroundIsPlaying: false })
  },

  stopBackground: async () => {
    const fade = get().crossfadeMs ?? 250
    await getAudioEngine().stopBackground(fade)
    set({ backgroundIsPlaying: false, backgroundPositionSec: 0 })
  },

  resumeBackground: async (asset) => {
    if (!asset?.url) {
      pushToast('No audio URL for this track.', 'error')
      return
    }
    await get().playBackground(asset, { startAt: get().backgroundPositionSec || 0 })
  },

  seekBackground: (seconds) => {
    getAudioEngine().seekBackground(seconds)
    set({ backgroundPositionSec: Math.max(0, Number(seconds) || 0) })
  },

  setBackgroundLoop: (loop) => {
    getAudioEngine().setBackgroundLoop(!!loop)
    set({ backgroundLoop: !!loop })
    get().persistPrefs()
  },

  triggerSfx: async (asset, { loop = false } = {}) => {
    if (!asset?.url) {
      pushToast('No audio URL for this sound.', 'error')
      return
    }
    try {
      const activeId = await getAudioEngine().triggerSfx({
        id: asset.id,
        url: asset.url,
        loop,
      })
      if (loop && activeId) {
        const ids = new Set(get().activeLoopedSfxIds)
        ids.add(String(activeId))
        set({ activeLoopedSfxIds: Array.from(ids) })
      }
      get().markRecent(asset.id)
    } catch (e) {
      pushToast(e?.message ? `SFX: ${e.message}` : 'Sound effect failed to play.', 'error')
    }
  },

  stopLoopedSfx: (assetId) => {
    getAudioEngine().stopLoopedSfx(assetId)
    set({
      activeLoopedSfxIds: get().activeLoopedSfxIds.filter((id) => String(id) !== String(assetId)),
    })
  },

  stopAllSfx: () => {
    getAudioEngine().stopAllSfx()
    set({ activeLoopedSfxIds: [] })
  },

  panicMuteAll: async () => {
    await getAudioEngine().panicStop()
    set({ backgroundIsPlaying: false, activeLoopedSfxIds: [] })
  },
}))
