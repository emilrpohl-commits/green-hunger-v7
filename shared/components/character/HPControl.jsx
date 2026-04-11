import React, { useState, useRef } from 'react'

const QUICK = [1, 2, 5, 10]

/**
 * Unified HP + temp HP control bar.
 * @param {boolean} [readOnly]
 */
export default function HPControl({
  curHp,
  maxHp,
  tempHp = 0,
  onApplyDelta,
  onSetTempHp,
  readOnly = false,
  accentColour = 'var(--green-mid)',
}) {
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('damage')
  const [flash, setFlash] = useState(null)
  const flashTimer = useRef(null)

  const hpPct = maxHp > 0 ? (curHp / maxHp) * 100 : 0
  const bloodied = maxHp > 0 && curHp > 0 && curHp <= maxHp * 0.5
  const downed = curHp === 0
  const hpColour = downed
    ? 'var(--danger)'
    : bloodied
      ? 'var(--warning)'
      : hpPct > 60
        ? 'var(--green-bright)'
        : '#c46040'

  function triggerFlash(type) {
    clearTimeout(flashTimer.current)
    setFlash(type)
    flashTimer.current = setTimeout(() => setFlash(null), 450)
  }

  function applyTyped() {
    const n = parseInt(amount, 10)
    if (!n || n <= 0 || !onApplyDelta || readOnly) return
    const delta = mode === 'damage' ? -n : n
    onApplyDelta(delta)
    setAmount('')
    triggerFlash(mode === 'damage' ? 'dmg' : 'heal')
  }

  function quick(delta) {
    if (!onApplyDelta || readOnly) return
    onApplyDelta(delta)
    triggerFlash(delta < 0 ? 'dmg' : 'heal')
  }

  return (
    <div style={{ position: 'relative' }}>
      {flash && (
        <div
          key={flash}
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 'var(--radius-lg)',
            pointerEvents: 'none',
            animation: flash === 'dmg' ? 'hp-flash 450ms ease forwards' : 'hp-heal-flash 450ms ease forwards',
            zIndex: 1,
          }}
        />
      )}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${bloodied ? 'rgba(196,160,64,0.35)' : downed ? 'rgba(196,64,64,0.4)' : 'var(--border)'}`,
          background: downed ? 'rgba(196,64,64,0.08)' : bloodied ? 'rgba(196,160,64,0.06)' : 'var(--bg-raised)',
          transition: 'background 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setMode(mode === 'damage' ? 'heal' : 'damage')}
            style={{
              padding: '6px 10px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: mode === 'damage' ? 'rgba(196,64,64,0.15)' : 'rgba(122,184,106,0.15)',
              border: `1px solid ${mode === 'damage' ? 'rgba(196,64,64,0.45)' : 'rgba(122,184,106,0.45)'}`,
              borderRadius: 'var(--radius)',
              color: mode === 'damage' ? 'var(--danger)' : 'var(--green-bright)',
              cursor: readOnly ? 'default' : 'pointer',
              minWidth: 72,
            }}
          >
            {mode === 'damage' ? 'Damage' : 'Heal'}
          </button>
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyTyped()}
            placeholder="Amt"
            style={{
              width: 64,
              padding: '6px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            disabled={readOnly}
            onClick={applyTyped}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: accentColour + '33',
              border: `1px solid ${accentColour}88`,
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              cursor: readOnly ? 'default' : 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Apply
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {QUICK.map((n) => (
            <button
              key={`m${n}`}
              type="button"
              disabled={readOnly}
              onClick={() => quick(-n)}
              style={quickBtnStyle('var(--danger)', readOnly)}
            >
              −{n}
            </button>
          ))}
          {QUICK.map((n) => (
            <button
              key={`p${n}`}
              type="button"
              disabled={readOnly}
              onClick={() => quick(n)}
              style={quickBtnStyle('var(--green-bright)', readOnly)}
            >
              +{n}
            </button>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 6,
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--info)', textTransform: 'uppercase' }}>
            Temp HP
          </span>
          <button type="button" disabled={readOnly || !onSetTempHp} onClick={() => onSetTempHp?.(Math.max(0, tempHp - 1))} style={miniBtn(readOnly)}>
            −
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--info)', minWidth: 28, textAlign: 'center' }}>
            {tempHp}
          </span>
          <button type="button" disabled={readOnly || !onSetTempHp} onClick={() => onSetTempHp?.(tempHp + 1)} style={miniBtn(readOnly)}>
            +
          </button>
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: hpColour, transition: 'color 0.3s ease' }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{curHp}</span>
          {tempHp > 0 && <span style={{ color: 'var(--info)', fontSize: 14 }}> +{tempHp}</span>}
          <span style={{ color: 'var(--text-muted)' }}> / {maxHp}</span>
          {bloodied && !downed && (
            <span style={{ marginLeft: 8, fontSize: 10, textTransform: 'uppercase', color: 'var(--warning)' }}>Bloodied</span>
          )}
          {downed && (
            <span style={{ marginLeft: 8, fontSize: 10, textTransform: 'uppercase', color: 'var(--danger)' }}>Down</span>
          )}
        </div>
      </div>
    </div>
  )
}

function quickBtnStyle(color, readOnly) {
  return {
    padding: '5px 10px',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    background: 'var(--bg-card)',
    border: `1px solid ${color}55`,
    borderRadius: 'var(--radius)',
    color,
    cursor: readOnly ? 'default' : 'pointer',
    minHeight: 32,
  }
}

function miniBtn(readOnly) {
  return {
    padding: '4px 10px',
    fontSize: 12,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-muted)',
    cursor: readOnly ? 'default' : 'pointer',
    minHeight: 32,
  }
}
