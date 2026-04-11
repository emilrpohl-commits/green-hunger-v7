import React from 'react'

export default function SoundDockCollapsed({
  onExpand,
  currentBackgroundName,
  muted,
  setMuted,
  stopBackground,
  activeLoopedSfxCount = 0,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button type="button" onClick={onExpand} style={btn} title="Open soundboard">
        ♪
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sound
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentBackgroundName || 'No background'}
        </div>
      </div>
      <button type="button" onClick={() => setMuted(!muted)} style={btn} title="Mute all">
        {muted ? 'Unm' : 'Mute'}
      </button>
      <button type="button" onClick={stopBackground} style={btn} title="Stop background">
        Stop
      </button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
        FX:{activeLoopedSfxCount}
      </span>
    </div>
  )
}

const btn = {
  padding: '3px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}
