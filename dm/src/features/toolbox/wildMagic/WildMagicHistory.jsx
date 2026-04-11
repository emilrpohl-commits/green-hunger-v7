import React from 'react'

export default function WildMagicHistory({ entries, onClear }) {
  if (!entries?.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No rolls yet — surge when ready.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Recent wild magic rolls
        </div>
        {onClear && (
          <button type="button" onClick={onClear} style={clearBtn}>
            Clear log
          </button>
        )}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map((e) => (
          <li
            key={e.historyId}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px 12px',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green-bright)', fontWeight: 700 }}>
              {e.roll}
            </span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{e.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                {e.description.slice(0, 120)}{e.description.length > 120 ? '…' : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const clearBtn = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '4px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
