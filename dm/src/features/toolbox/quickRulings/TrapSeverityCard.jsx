import React from 'react'
import { TRAP_SEVERITY } from '@shared/lib/dmToolbox/quickRulingsData.js'

export default function TrapSeverityCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Trap &amp; hazard severity
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Classify the moment, then use <strong style={{ color: 'var(--text-secondary)' }}>Improvised damage</strong> for the right tier.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TRAP_SEVERITY.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: t.id === 'deadly' ? 'rgba(120, 40, 40, 0.12)' : 'var(--bg-raised)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green-bright)', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{t.effect}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
