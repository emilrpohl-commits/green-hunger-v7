import React, { useMemo, useState } from 'react'
import { WILD_MAGIC_EFFECTS } from '@shared/lib/dmToolbox/wildMagicTable.js'

const GROUP_ORDER = ['beneficial', 'harmful', 'chaotic']

export default function WildMagicEffectList({ compact = false }) {
  const [query, setQuery] = useState('')
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? WILD_MAGIC_EFFECTS.filter(
        (e) =>
          e.title.toLowerCase().includes(q)
          || e.description.toLowerCase().includes(q)
          || `${e.range[0]}–${e.range[1]}`.includes(q)
      )
      : WILD_MAGIC_EFFECTS
    const g = { beneficial: [], harmful: [], chaotic: [] }
    for (const e of filtered) {
      g[e.tone]?.push(e)
    }
    return g
  }, [query])

  return (
    <div>
      <input
        type="search"
        placeholder="Filter table…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 320,
          marginBottom: 12,
          padding: '8px 10px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--bg-raised)',
          color: 'var(--text-primary)',
          fontSize: 12,
        }}
      />
      {GROUP_ORDER.map((tone) => {
        const list = grouped[tone] || []
        if (!list.length) return null
        return (
          <div key={tone} style={{ marginBottom: compact ? 12 : 18 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: tone === 'beneficial' ? '#9cbea8' : tone === 'harmful' ? '#c89898' : '#b8a8d8',
              marginBottom: 8,
            }}
            >
              {tone}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map((e) => (
                <details
                  key={e.id}
                  style={{
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-raised)',
                    padding: '6px 10px',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', listStyle: 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-bright)', marginRight: 8 }}>
                      {e.range[0]}–{e.range[1]}
                    </span>
                    {e.title}
                    {e.duration && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>({e.duration})</span>
                    )}
                  </summary>
                  <p style={{ margin: '8px 0 0', fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {e.description}
                  </p>
                </details>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
