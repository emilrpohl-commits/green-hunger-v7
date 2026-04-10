import React from 'react'
import { mono, inputBase, taBase, btnSm } from './outlinerStyles'

export default function SkillCheckTableEditor({ value, onChange }) {
  let rows = []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : (value || [])
    rows = Array.isArray(parsed) ? parsed : []
  } catch {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
        style={taBase}
        placeholder="Mechanical effect…"
      />
    )
  }

  const update = (i, field, val) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
    onChange(JSON.stringify(next))
  }
  const addRow = () => onChange(JSON.stringify([...rows, { trigger: '', skill: '', dc: '', whatTheyLearn: '' }]))
  const removeRow = (i) => onChange(JSON.stringify(rows.filter((_, idx) => idx !== i)))

  const thStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 6px', textAlign: 'left', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }
  const tdStyle = { padding: '3px 4px', verticalAlign: 'top' }
  const cellInput = (w) => ({ ...inputBase, padding: '5px 7px', fontSize: 12, width: w || '100%' })

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={thStyle}>Trigger</th>
            <th style={thStyle}>Skill / Save</th>
            <th style={{ ...thStyle, width: 52 }}>DC</th>
            <th style={thStyle}>What They Learn</th>
            <th style={{ ...thStyle, width: 20 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}><input value={row.trigger || ''} onChange={e => update(i, 'trigger', e.target.value)} style={cellInput()} /></td>
              <td style={tdStyle}><input value={row.skill || ''} onChange={e => update(i, 'skill', e.target.value)} style={cellInput(160)} /></td>
              <td style={tdStyle}><input value={row.dc || ''} onChange={e => update(i, 'dc', e.target.value)} style={cellInput(64)} placeholder="12 or Auto" /></td>
              <td style={tdStyle}><input value={row.whatTheyLearn || row.result || ''} onChange={e => update(i, 'whatTheyLearn', e.target.value)} style={cellInput()} /></td>
              <td style={tdStyle}>
                <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, padding: '2px 4px' }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} style={{ ...btnSm, borderStyle: 'dashed' }}>+ Add Check</button>
    </div>
  )
}
