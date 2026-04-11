class AudioEngine {
  constructor() {
    this.masterVolume = 1
    this.backgroundVolume = 0.7
    this.sfxVolume = 1
    this.muted = false

    this.bgAudio = new Audio()
    this.bgAudio.preload = 'auto'
    this.bgAudio.loop = true

    this._bgStateListener = null
    const notifyBg = () => this._notifyBackgroundState()
    ;['loadedmetadata', 'durationchange', 'timeupdate'].forEach((ev) => {
      this.bgAudio.addEventListener(ev, notifyBg)
    })

    /** @type {Map<string, HTMLAudioElement>} */
    this.activeLoopedSfx = new Map()
    /** @type {Set<HTMLAudioElement>} */
    this.activeSfx = new Set()
  }

  _effectiveVolume(kindVolume) {
    if (this.muted) return 0
    return Math.max(0, Math.min(1, this.masterVolume * kindVolume))
  }

  _setBackgroundElementVolume() {
    this.bgAudio.volume = this._effectiveVolume(this.backgroundVolume)
  }

  _setLoopedSfxVolumes() {
    for (const node of this.activeLoopedSfx.values()) {
      node.volume = this._effectiveVolume(this.sfxVolume)
    }
  }

  _fadeVolume(getCurrent, setCurrent, target, durationMs = 300) {
    const from = getCurrent()
    const to = Math.max(0, Math.min(1, target))
    if (durationMs <= 0 || from === to) {
      setCurrent(to)
      return Promise.resolve()
    }
    const start = performance.now()
    return new Promise((resolve) => {
      const step = () => {
        const now = performance.now()
        const t = Math.min(1, (now - start) / durationMs)
        const next = from + (to - from) * t
        setCurrent(next)
        if (t >= 1) resolve()
        else requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  }

  setMasterVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0))
    this._setBackgroundElementVolume()
    this._setLoopedSfxVolumes()
  }

  setBackgroundVolume(value) {
    this.backgroundVolume = Math.max(0, Math.min(1, Number(value) || 0))
    this._setBackgroundElementVolume()
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0))
    this._setLoopedSfxVolumes()
  }

  setMuted(flag) {
    this.muted = !!flag
    this._setBackgroundElementVolume()
    this._setLoopedSfxVolumes()
  }

  getBackgroundState() {
    const dur = this.bgAudio.duration
    return {
      isPlaying: !this.bgAudio.paused && !this.bgAudio.ended,
      currentTime: this.bgAudio.currentTime || 0,
      duration: Number.isFinite(dur) ? dur : 0,
      loop: this.bgAudio.loop,
      src: this.bgAudio.src || '',
    }
  }

  setBackgroundStateListener(cb) {
    this._bgStateListener = typeof cb === 'function' ? cb : null
  }

  _notifyBackgroundState() {
    try {
      this._bgStateListener?.(this.getBackgroundState())
    } catch {
      // ignore listener errors
    }
  }

  async playBackground({ url, loop = true, startAt = 0, crossfadeMs = 250 }) {
    if (!url) return
    const nextUrl = String(url)
    const sameSrc = this.bgAudio.src === nextUrl
    if (!sameSrc) {
      await this._fadeVolume(
        () => this.bgAudio.volume,
        (v) => { this.bgAudio.volume = v },
        0,
        crossfadeMs
      )
      this.bgAudio.src = nextUrl
    }
    this.bgAudio.loop = !!loop
    if (startAt > 0) {
      try {
        this.bgAudio.currentTime = startAt
      } catch {
        // ignore if not seekable yet
      }
    }
    this._setBackgroundElementVolume()
    await this.bgAudio.play()
    this._notifyBackgroundState()
    await this._fadeVolume(
      () => this.bgAudio.volume,
      (v) => { this.bgAudio.volume = v },
      this._effectiveVolume(this.backgroundVolume),
      crossfadeMs
    )
  }

  pauseBackground() {
    this.bgAudio.pause()
  }

  async stopBackground(fadeOutMs = 250) {
    await this._fadeVolume(
      () => this.bgAudio.volume,
      (v) => { this.bgAudio.volume = v },
      0,
      fadeOutMs
    )
    this.bgAudio.pause()
    this.bgAudio.currentTime = 0
    this._setBackgroundElementVolume()
  }

  seekBackground(seconds) {
    if (Number.isFinite(seconds) && seconds >= 0) {
      this.bgAudio.currentTime = seconds
    }
  }

  setBackgroundLoop(loop) {
    this.bgAudio.loop = !!loop
  }

  async triggerSfx({ id, url, loop = false }) {
    if (!url) return null
    const safeId = String(id || `${Date.now()}-${Math.random()}`)
    if (loop) {
      const existing = this.activeLoopedSfx.get(safeId)
      if (existing) {
        existing.pause()
        this.activeLoopedSfx.delete(safeId)
      }
      const node = new Audio(url)
      node.loop = true
      node.preload = 'auto'
      node.volume = this._effectiveVolume(this.sfxVolume)
      this.activeLoopedSfx.set(safeId, node)
      await node.play()
      return safeId
    }

    const node = new Audio(url)
    node.loop = false
    node.preload = 'auto'
    node.volume = this._effectiveVolume(this.sfxVolume)
    this.activeSfx.add(node)
    const cleanup = () => {
      node.removeEventListener('ended', cleanup)
      node.removeEventListener('pause', cleanup)
      this.activeSfx.delete(node)
    }
    node.addEventListener('ended', cleanup)
    node.addEventListener('pause', cleanup)
    await node.play()
    return safeId
  }

  stopLoopedSfx(id) {
    const node = this.activeLoopedSfx.get(String(id))
    if (!node) return
    node.pause()
    node.currentTime = 0
    this.activeLoopedSfx.delete(String(id))
  }

  stopAllSfx() {
    for (const node of this.activeSfx) {
      node.pause()
      node.currentTime = 0
    }
    this.activeSfx.clear()
    for (const node of this.activeLoopedSfx.values()) {
      node.pause()
      node.currentTime = 0
    }
    this.activeLoopedSfx.clear()
  }

  async panicStop() {
    this.stopAllSfx()
    await this.stopBackground(120)
  }
}

let singleton = null

export function getAudioEngine() {
  if (!singleton) singleton = new AudioEngine()
  return singleton
}
