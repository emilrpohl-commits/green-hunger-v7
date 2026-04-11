import React, { useState } from 'react'
import GreenMarkEffectList from './GreenMarkEffectList.jsx'
import { greenMarkVisualTier } from '../../lib/greenMarks.js'

const MAX_PIPS = 5

/**
 * Player-facing: pips, count, expandable effect list.
 */
export default function GreenMarkTracker({
  current = 0,
  maxDisplay = MAX_PIPS,
  defaultExpanded = false,
}) {
  const [open, setOpen] = useState(defaultExpanded)
  const tier = greenMarkVisualTier(current)
  const filled = Math.min(maxDisplay, Math.max(0, Math.floor(Number(current) || 0)))

  const pipColour = (i) => {
    if (i >= filled) return 'transparent'
    if (tier >= 3) return 'linear-gradient(145deg, #5a8a48, #2d4a22)'
    if (tier >= 2) return 'linear-gradient(145deg, #6d9a5c, #3d5c34)'
    return 'linear-gradient(145deg, #7aaa6a, #4a6b42)'
  }

  const pipBorder = tier >= 3 ? 'rgba(120, 200, 90, 0.5)' : tier >= 2 ? 'rgba(100, 160, 80, 0.35)' : 'rgba(90, 130, 80, 0.25)'
  const pipGlow = tier >= 3 ? '0 0 10px rgba(80, 160, 60, 0.25)' : tier >= 2 ? '0 0 6px rgba(70, 120, 55, 0.15)' : 'none'

  return (
    <div
      style={{
        marginBottom: 14,
        padding: '12px 14px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${tier >= 3 ? 'rgba(90, 140, 70, 0.45)' : 'var(--border)'}`,
        background:
          tier >= 3
            ? 'linear-gradient(160deg, rgba(35, 55, 30, 0.55), rgba(14, 18, 12, 0.92))'
            : tier >= 2
              ? 'rgba(28, 40, 26, 0.4)'
              : 'var(--bg-raised)',
        boxShadow: tier >= 3 ? 'inset 0 1px 0 rgba(120, 180, 100, 0.08)' : 'none',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: tier >= 3 ? '#b8d9a8' : 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            Green marks
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: maxDisplay }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    width: tier >= 3 ? 12 : 10,
                    height: tier >= 3 ? 12 : 10,
                    borderRadius: '50%',
                    border: `2px solid ${i < filled ? pipBorder : 'var(--border)'}`,
                    background: pipColour(i),
                    boxShadow: i < filled ? pipGlow : 'none',
                    transition: 'all 0.25s ease',
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                color: tier >= 3 ? '#c4e8b0' : 'var(--green-bright)',
              }}
            >
              {filled}
            </span>
            {filled > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {open ? '▼' : '▶'} Details
              </span>
            )}
          </div>
        </div>
      </button>

      {filled === 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          No corruption yet. Stay wary of the Green Hunger.
        </p>
      )}

      {open && filled > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <GreenMarkEffectList current={current} compact />
        </div>
      )}
    </div>
  )
}
