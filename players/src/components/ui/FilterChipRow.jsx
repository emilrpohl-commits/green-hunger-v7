import React from 'react'

/**
 * @param {{ id: string, label: string }[]} options
 * @param {string} value
 * @param {(id: string) => void} onChange
 */
export default function FilterChipRow({ options, value, onChange, accent = 'var(--green-mid)' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              padding: '5px 11px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 20,
              border: `1px solid ${active ? accent : 'var(--border)'}`,
              background: active ? `${accent}22` : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
