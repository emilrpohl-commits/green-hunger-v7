import React from 'react'

export function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 12
    }}>
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em'
      }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

export function RollBtn({ onClick, colour, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? '2px 7px' : '3px 9px',
        fontFamily: 'var(--font-mono)',
        fontSize: small ? 9 : 10,
        background: 'transparent',
        border: `1px solid ${colour}50`,
        borderRadius: 'var(--radius)',
        color: colour,
        cursor: 'pointer',
        letterSpacing: '0.06em',
        flexShrink: 0
      }}
    >
      d20
    </button>
  )
}
