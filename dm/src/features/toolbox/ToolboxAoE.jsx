import React, { useMemo, useState } from 'react'
import { AOE_SHAPES, estimateTargetsInAoE, shapeFootprintSquares } from '@shared/lib/dmToolbox/aoeEstimate.js'

const SIZES = [15, 20, 30, 40, 60, 90, 120]
const DENSITY = [
  { id: 'sparse', label: 'Sparse (spread out)' },
  { id: 'normal', label: 'Normal skirmish' },
  { id: 'tight', label: 'Tight cluster' },
]

export default function ToolboxAoE({ compact = false }) {
  const [shape, setShape] = useState('sphere')
  const [sizeFeet, setSizeFeet] = useState(20)
  const [density, setDensity] = useState('normal')
  const [showTable, setShowTable] = useState(false)

  const est = useMemo(
    () => estimateTargetsInAoE({ shape, sizeFeet, density }),
    [shape, sizeFeet, density]
  )
  const squares = shapeFootprintSquares(shape, sizeFeet)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 520 }}>
        Fast footprint → estimated creatures caught. Heuristic, not battle-map exact — good enough to call the scene.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
        <div>
          <div style={lab}>Shape</div>
          <select value={shape} onChange={(e) => setShape(e.target.value)} style={inp}>
            {AOE_SHAPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={lab}>Size (ft)</div>
          <select
            value={sizeFeet}
            onChange={(e) => setSizeFeet(Number(e.target.value))}
            style={inp}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>{s} ft</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: compact ? 'auto' : '1 / -1' }}>
          <div style={lab}>Density</div>
          <select value={density} onChange={(e) => setDensity(e.target.value)} style={inp}>
            {DENSITY.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={box}>
        <div style={row}>
          <span style={k}>≈ 5-ft squares (rough)</span>
          <span style={v}>{squares}</span>
        </div>
        <div style={row}>
          <span style={k}>Estimated targets</span>
          <span style={v}>{est}</span>
        </div>
      </div>

      <button type="button" onClick={() => setShowTable((x) => !x)} style={tog}>
        {showTable ? '▼ Hide size matrix' : '▶ Size × shape matrix'}
      </button>
      {showTable && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-raised)' }}>
                <th style={cell}>Shape \\ Size</th>
                {SIZES.filter((s) => s <= 60).map((s) => (
                  <th key={s} style={cell}>{s}′</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AOE_SHAPES.map((sh) => (
                <tr key={sh}>
                  <td style={cell}>{sh}</td>
                  {SIZES.filter((s) => s <= 60).map((s) => (
                    <td key={s} style={cell}>
                      {estimateTargetsInAoE({ shape: sh, sizeFeet: s, density })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const lab = { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }
const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: 12 }
const box = { padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(120, 100, 160, 0.3)', background: 'rgba(35, 30, 48, 0.3)' }
const row = { display: 'flex', justifyContent: 'space-between', marginBottom: 6 }
const k = { fontSize: 12, color: 'var(--text-secondary)' }
const v = { fontFamily: 'var(--font-mono)', fontSize: 16, color: '#c8b8e8', fontWeight: 700 }
const cell = { padding: '5px 6px', borderBottom: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)' }
const tog = { alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }
