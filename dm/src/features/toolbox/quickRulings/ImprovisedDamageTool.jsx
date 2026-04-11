import React, { useMemo, useState } from 'react'
import {
  SEVERITY_ORDER,
  SEVERITY_LABELS,
  improvisedDamageDice,
  averageNd10,
  rollNd10,
  improvisedDamageLevelBand,
} from '@shared/lib/dmToolbox/quickRulingsData.js'

export default function ImprovisedDamageTool({ compact = false }) {
  const [level, setLevel] = useState(5)
  const [severity, setSeverity] = useState('moderate')
  const [lastRoll, setLastRoll] = useState(null)

  const dice = useMemo(() => improvisedDamageDice(level, severity), [level, severity])
  const avg = averageNd10(dice.count)
  const band = improvisedDamageLevelBand(level)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Improvised damage
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Hazards, traps, narrative hits — band {band + 1}/4 (levels {band === 0 ? '1–4' : band === 1 ? '5–10' : band === 2 ? '11–16' : '17–20'}).
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={lab}>Level</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[1, 5, 11, 17].map((lv) => (
            <button key={lv} type="button" onClick={() => setLevel(lv)} style={pill(level === lv)}>
              {lv}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          style={{ flex: 1, minWidth: 100, maxWidth: 200 }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green-bright)', minWidth: 28 }}>{level}</span>
      </div>

      <div>
        <div style={lab}>Severity</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SEVERITY_ORDER.map((s) => (
            <button key={s} type="button" onClick={() => setSeverity(s)} style={pill(severity === s, 'wide')}>
              {SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div style={outBox}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--green-bright)', fontWeight: 700 }}>
          {dice.notation}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          Average <strong style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}</strong> damage
        </div>
        <button
          type="button"
          onClick={() => setLastRoll(rollNd10(dice.count))}
          style={{ ...btn, marginTop: 10 }}
        >
          Roll {dice.notation}
        </button>
        {lastRoll != null && (
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--warning)' }}>
            Rolled: {lastRoll}
          </div>
        )}
      </div>
    </div>
  )
}

const lab = { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const outBox = {
  padding: '12px 14px',
  borderRadius: 'var(--radius)',
  border: '1px solid rgba(200, 120, 80, 0.35)',
  background: 'rgba(40, 28, 20, 0.35)',
}
const btn = {
  padding: '8px 14px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--green-mid)',
  background: 'var(--green-dim)',
  color: 'var(--green-bright)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
}

function pill(active, wide) {
  return {
    padding: wide ? '8px 12px' : '6px 12px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    background: active ? 'var(--green-dim)' : 'var(--bg-raised)',
    color: active ? 'var(--green-bright)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    cursor: 'pointer',
  }
}
