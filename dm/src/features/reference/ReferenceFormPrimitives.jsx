import React from 'react'

export const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

export const mono = { fontFamily: 'var(--font-mono)' }

export const labelStyle = {
  ...mono,
  fontSize: 9,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  display: 'block',
  marginBottom: 5,
}

export function SectionDivider({ label }) {
  return (
    <div style={{ margin: '16px 0 10px', ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {label}
    </div>
  )
}

export function NameDescListField({ label, items, onChange }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((item, idx) => (
          <div key={`${label}-${idx}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8, background: 'var(--bg-raised)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                style={inputStyle}
                placeholder="Name"
                value={item?.name || ''}
                onChange={(e) => {
                  const next = list.slice()
                  next[idx] = { ...(next[idx] || {}), name: e.target.value }
                  onChange(next)
                }}
              />
              <button
                type="button"
                onClick={() => onChange(list.filter((_, i) => i !== idx))}
                style={{ ...mono, fontSize: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '0 10px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Description"
              value={item?.description || ''}
              onChange={(e) => {
                const next = list.slice()
                next[idx] = { ...(next[idx] || {}), description: e.target.value }
                onChange(next)
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...list, { name: '', description: '' }])}
        style={{ marginTop: 8, ...mono, fontSize: 10, textTransform: 'uppercase', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer' }}
      >
        + Add Item
      </button>
    </div>
  )
}

export function StringListField({ label, items, onChange, maxItems = null }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'grid', gap: 6 }}>
        {list.map((item, idx) => (
          <div key={`${label}-${idx}`} style={{ display: 'flex', gap: 8 }}>
            <input
              style={inputStyle}
              value={item || ''}
              onChange={(e) => {
                const next = list.slice()
                next[idx] = e.target.value
                onChange(next)
              }}
            />
            <button
              type="button"
              onClick={() => onChange(list.filter((_, i) => i !== idx))}
              style={{ ...mono, fontSize: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '0 10px', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {(maxItems == null || list.length < maxItems) && (
        <button
          type="button"
          onClick={() => onChange([...list, ''])}
          style={{ marginTop: 8, ...mono, fontSize: 10, textTransform: 'uppercase', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer' }}
        >
          + Add Item
        </button>
      )}
    </div>
  )
}
