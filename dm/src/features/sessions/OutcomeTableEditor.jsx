import React from 'react'
import { mono, inputBase, btnSm } from './outlinerStyles'

export default function OutcomeTableEditor({ value, onChange }) {
  let rows = []
  try {
    rows = Array.isArray(value) ? value : JSON.parse(value || '[]')
  } catch {
    rows = []
  }

  const update = (i, field, val) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
    onChange(next)
  }
  const addRow = () => onChange([...rows, { outcome: '', consequence: '' }])
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i))

  const thStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 6px', textAlign: 'left', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }
  const tdStyle = { padding: '3px 4px', verticalAlign: 'top' }
  const cellInput = { ...inputBase, padding: '5px 7px', fontSize: 12 }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={thStyle}>Outcome</th>
            <th style={thStyle}>Consequence</th>
            <th style={{ ...thStyle, width: 20 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}><input value={row.outcome || ''} onChange={e => update(i, 'outcome', e.target.value)} style={cellInput} /></td>
              <td style={tdStyle}><input value={row.consequence || ''} onChange={e => update(i, 'consequence', e.target.value)} style={cellInput} /></td>
              <td style={tdStyle}>
                <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, padding: '2px 4px' }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} style={{ ...btnSm, borderStyle: 'dashed' }}>+ Add Outcome</button>
    </div>
  )
}
