import React, { useState } from 'react'

const TABLES = [
  {
    id: 'cover',
    title: 'Cover',
    rows: [
      ['Half cover', '+2 AC / Dex saves'],
      ['Three-quarters', '+5 AC / Dex saves'],
      ['Total cover', 'Can’t be targeted directly'],
    ],
  },
  {
    id: 'light',
    title: 'Light (vision)',
    rows: [
      ['Bright', 'Normal vision'],
      ['Dim', 'Lightly obscured (disadvantage on Perception relying on sight)'],
      ['Darkness', 'Heavily obscured (blinded unless special senses)'],
    ],
  },
  {
    id: 'exhaustion',
    title: 'Exhaustion levels',
    rows: [
      ['1', 'Disadvantage on ability checks'],
      ['2', 'Speed halved'],
      ['3', 'Disadvantage on saves & attacks'],
      ['4', 'HP maximum halved'],
      ['5', 'Speed reduced to 0'],
      ['6', 'Death'],
    ],
  },
  {
    id: 'improv',
    title: 'Improvised damage (reminder)',
    rows: [
      ['Minor → Catastrophic', 'Use Quick Rulings → Improvised damage for level-scaled d10 counts'],
    ],
  },
]

export default function QuickTablesPanel({ compact = false }) {
  const [open, setOpen] = useState(() => new Set(TABLES.map((t) => t.id)))

  const toggle = (id) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          maxWidth: 520,
        }}
      >
        Static reference snippets for mid-session lookup (DMG-style shorthand).
      </p>
      {TABLES.map((t) => {
        const isOpen = open.has(t.id)
        return (
          <div
            key={t.id}
            style={{
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(t.id)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: compact ? '8px 10px' : '10px 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--green-bright)',
                fontFamily: 'var(--font-mono)',
                fontSize: compact ? 9 : 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {t.title}
              <span style={{ color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                <tbody>
                  {t.rows.map(([a, b], i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td
                        style={{
                          padding: '8px 12px',
                          verticalAlign: 'top',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--warning)',
                          width: '34%',
                        }}
                      >
                        {a}
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', lineHeight: 1.45 }}>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}
