import React from 'react'

function formatMmSs(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export default function AudioNowPlaying({
  backgroundAsset,
  backgroundIsPlaying,
  backgroundLoop,
  backgroundPositionSec,
  backgroundDurationSec = 0,
  pauseBackground,
  stopBackground,
  resumeBackground,
  setBackgroundLoop,
  seekBackground,
  panicMuteAll,
  stopAllSfx,
  activeLoopedSfxIds = [],
}) {
  const pos = Math.max(0, Number(backgroundPositionSec) || 0)
  const dur = Number.isFinite(backgroundDurationSec) && backgroundDurationSec > 0
    ? backgroundDurationSec
    : 0
  const sliderMax = Math.max(dur || 0, pos || 0, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Background
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
        {backgroundAsset?.name || 'No track playing'}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => resumeBackground(backgroundAsset)} disabled={!backgroundAsset} style={btn}>
          {backgroundIsPlaying ? 'Playing' : 'Play'}
        </button>
        <button type="button" onClick={pauseBackground} style={btn}>
          Pause
        </button>
        <button type="button" onClick={stopBackground} style={btn}>
          Stop
        </button>
        <button type="button" onClick={() => setBackgroundLoop(!backgroundLoop)} style={btn}>
          Loop: {backgroundLoop ? 'On' : 'Off'}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={sliderMax}
        step={0.1}
        value={Math.min(pos, sliderMax)}
        onChange={(e) => seekBackground(Number(e.target.value))}
      />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
        {formatMmSs(pos)} / {dur > 0 ? formatMmSs(dur) : '—:—'}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={stopAllSfx} style={btn}>
          Stop All SFX
        </button>
        <button type="button" onClick={panicMuteAll} style={btnDanger}>
          Panic Stop
        </button>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
        Active looped SFX: {activeLoopedSfxIds.length}
      </div>
    </div>
  )
}

const btn = {
  padding: '4px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}

const btnDanger = {
  ...btn,
  color: 'var(--danger)',
  border: '1px solid rgba(196,64,64,0.4)',
}
