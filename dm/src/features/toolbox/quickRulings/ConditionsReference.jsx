import React, { useMemo, useState } from 'react'
import { CONDITIONS_REFERENCE } from '@shared/lib/dmToolbox/quickRulingsData.js'

export default function ConditionsReference({ compact = false }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return CONDITIONS_REFERENCE
    return CONDITIONS_REFERENCE.filter((c) => c.name.toLowerCase().includes(s) || c.summary.toLowerCase().includes(s))
  }, [q])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Conditions
      </div>
      <input
        type="search"
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '8px 10px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--bg-raised)',
          color: 'var(--text-primary)',
          fontSize: 12,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: compact ? 220 : 400, overflowY: 'auto' }}>
        {filtered.map((c) => (
          <details
            key={c.name}
            style={{
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              padding: '8px 10px',
            }}
          >
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, listStyle: 'none' }}>
              {c.name}
            </summary>
            <p style={{ margin: '8px 0 4px', fontSize: 12, color: 'var(--green-bright)', lineHeight: 1.45 }}>{c.summary}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.full}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
