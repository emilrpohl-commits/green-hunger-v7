import React, { useState } from 'react'
import { rollChaseComplication, CHASE_COMPLICATIONS } from '@shared/lib/dmToolbox/quickRulingsData.js'

export default function ChaseComplicationsTool({ compact = false }) {
  const [last, setLast] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Chase complications
      </div>
      <button
        type="button"
        onClick={() => setLast(rollChaseComplication())}
        style={{
          alignSelf: 'flex-start',
          padding: '10px 16px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--green-mid)',
          background: 'var(--green-dim)',
          color: 'var(--green-bright)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        Roll complication
      </button>
      {last && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(140, 120, 200, 0.35)',
            background: 'rgba(35, 30, 50, 0.35)',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>#{last.index} · </span>
          {last.text}
        </div>
      )}
      {!compact && (
        <details style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase' }}>
            Full table ({CHASE_COMPLICATIONS.length})
          </summary>
          <ol style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {CHASE_COMPLICATIONS.map((line, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{line}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
