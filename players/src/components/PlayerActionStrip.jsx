import React from 'react'

const BTNS = [
  { id: 'attack', label: 'Attack' },
  { id: 'spell', label: 'Spell' },
  { id: 'bonus_action', label: 'Bonus' },
  { id: 'feature', label: 'Feature' },
]

export default function PlayerActionStrip({ charColour, onPick }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Quick focus
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BTNS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(b.id)}
            style={{
              padding: '8px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 'var(--radius)',
              border: `1px solid ${charColour}50`,
              background: `${charColour}12`,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}
