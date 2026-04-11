import React, { useMemo, useState } from 'react'
import { OBJECT_MATERIALS, OBJECT_SIZES, OBJECT_HP } from '@shared/lib/dmToolbox/quickRulingsData.js'

export default function ObjectDurabilityTool({ compact = false }) {
  const [materialId, setMaterialId] = useState('wood')
  const [size, setSize] = useState('medium')
  const [durability, setDurability] = useState('resilient')

  const mat = OBJECT_MATERIALS.find((m) => m.id === materialId) || OBJECT_MATERIALS[2]
  const hpEntry = useMemo(() => {
    const row = OBJECT_HP[size] || OBJECT_HP.medium
    return row[durability] || row.resilient
  }, [size, durability])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Object AC &amp; HP
      </div>

      <div>
        <div style={lab}>Material</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {OBJECT_MATERIALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaterialId(m.id)}
              style={rowBtn(materialId === m.id)}
            >
              <span>{m.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-bright)' }}>AC {m.ac}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={lab}>Size</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {OBJECT_SIZES.map((s) => (
              <button key={s} type="button" onClick={() => setSize(s)} style={pill(size === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={lab}>Durability</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['fragile', 'resilient'].map((d) => (
              <button key={d} type="button" onClick={() => setDurability(d)} style={pill(durability === d, true)}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={outBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>AC</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--green-bright)', fontWeight: 700 }}>{mat.ac}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>HP</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--warning)', fontWeight: 700 }}>
            ~{hpEntry.avg} ({hpEntry.dice})
          </span>
        </div>
      </div>
    </div>
  )
}

const lab = { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }
const outBox = {
  padding: '12px 14px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
}

function rowBtn(active) {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    background: active ? 'var(--green-dim)' : 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    cursor: 'pointer',
  }
}

function pill(active, pad) {
  return {
    padding: pad ? '8px 14px' : '6px 10px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    background: active ? 'var(--green-dim)' : 'var(--bg-raised)',
    color: active ? 'var(--green-bright)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    textTransform: 'uppercase',
    cursor: 'pointer',
  }
}
