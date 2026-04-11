import React from 'react'

export default function ActiveWildMagicEffects({ items, onRemove }) {
  if (!items?.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
        No ongoing surge effects. Duration and triggered results appear here automatically.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Active wild magic effects
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((x) => (
          <li
            key={x.instanceId}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(160, 140, 200, 0.35)',
              background: 'rgba(40, 32, 55, 0.25)',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 8,
              alignItems: 'start',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green-bright)', marginBottom: 4 }}>
                Rolled {x.roll} · {x.type}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{x.title}</div>
              {x.duration && (
                <div style={{ fontSize: 10, color: 'var(--warning)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  ⏱ {x.duration} — track manually; remove when resolved
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                {x.description}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove?.(x.instanceId)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'rgba(196,64,64,0.12)',
                color: 'var(--danger)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                alignSelf: 'start',
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
