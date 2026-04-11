import React from 'react'

function Row({ label, value, onChange }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '52px 1fr 30px', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', textAlign: 'right' }}>
        {Math.round((Number(value) || 0) * 100)}
      </span>
    </label>
  )
}

export default function VolumeControls({
  masterVolume,
  backgroundVolume,
  sfxVolume,
  setMasterVolume,
  setBackgroundVolume,
  setSfxVolume,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Row label="Master" value={masterVolume} onChange={setMasterVolume} />
      <Row label="BG" value={backgroundVolume} onChange={setBackgroundVolume} />
      <Row label="SFX" value={sfxVolume} onChange={setSfxVolume} />
    </div>
  )
}
