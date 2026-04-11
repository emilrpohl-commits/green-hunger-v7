import React, { useState } from 'react'
import { DC_TABLE } from '@shared/lib/dmToolbox/quickRulingsData.js'

export default function DCTool({ compact = false }) {
  const [selected, setSelected] = useState('medium')
  const row = DC_TABLE.find((r) => r.id === selected) || DC_TABLE[2]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Difficulty class
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DC_TABLE.map((r) => (
          <button key={r.id} type="button" onClick={() => setSelected(r.id)} style={pill(selected === r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={outBox}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: 'var(--green-bright)', fontWeight: 700, lineHeight: 1 }}>
          {row.dc}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 8 }}>{row.label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          {row.hint}
        </div>
      </div>
    </div>
  )
}

const outBox = {
  padding: '14px 16px',
  borderRadius: 'var(--radius)',
  border: '1px solid rgba(100, 140, 200, 0.35)',
  background: 'rgba(25, 32, 48, 0.4)',
}

function pill(active) {
  return {
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    background: active ? 'var(--green-dim)' : 'var(--bg-raised)',
    color: active ? 'var(--green-bright)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
  }
}
