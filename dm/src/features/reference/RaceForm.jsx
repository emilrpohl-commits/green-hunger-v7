import React, { useState } from 'react'
import { inputStyle, labelStyle, NameDescListField } from './ReferenceFormPrimitives.jsx'

const SIZE_OPTIONS = ['Tiny', 'Small', 'Medium', 'Large']
const ABILITY_OPTIONS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export default function RaceForm({ value, onChange }) {
  const race = value || {}
  const [tab, setTab] = useState('core')
  const bonuses = Array.isArray(race.ability_bonuses) ? race.ability_bonuses : []
  const subraces = Array.isArray(race.subraces) ? race.subraces : []
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['core', 'traits', 'subraces'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: tab === t ? 'var(--green-dim)' : 'transparent', color: tab === t ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>{t}</button>
        ))}
      </div>
      {tab === 'core' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={race.name || ''} onChange={(e) => onChange({ ...race, name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Size</label>
            <select style={inputStyle} value={race.size || 'Medium'} onChange={(e) => onChange({ ...race, size: e.target.value })}>{SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div>
            <label style={labelStyle}>Speed</label>
            <input type="number" style={inputStyle} value={race.speed ?? 30} onChange={(e) => onChange({ ...race, speed: parseInt(e.target.value, 10) || 30 })} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Ability Bonuses</label>
            <div style={{ display: 'grid', gap: 8 }}>
              {bonuses.map((bonus, idx) => (
                <div key={`bonus-${idx}`} style={{ display: 'flex', gap: 8 }}>
                  <select style={inputStyle} value={bonus.ability || 'STR'} onChange={(e) => {
                    const next = bonuses.slice()
                    next[idx] = { ...next[idx], ability: e.target.value }
                    onChange({ ...race, ability_bonuses: next })
                  }}>
                    {ABILITY_OPTIONS.map((ability) => <option key={ability} value={ability}>{ability}</option>)}
                  </select>
                  <input type="number" style={inputStyle} value={bonus.bonus ?? 1} onChange={(e) => {
                    const next = bonuses.slice()
                    next[idx] = { ...next[idx], bonus: parseInt(e.target.value, 10) || 0 }
                    onChange({ ...race, ability_bonuses: next })
                  }} />
                  <button type="button" onClick={() => onChange({ ...race, ability_bonuses: bonuses.filter((_, i) => i !== idx) })} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', padding: '0 10px' }}>×</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => onChange({ ...race, ability_bonuses: [...bonuses, { ability: 'STR', bonus: 1 }] })} style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>+ Add</button>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Languages (comma separated)</label>
            <input style={inputStyle} value={(race.languages || []).join(', ')} onChange={(e) => onChange({ ...race, languages: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
          </div>
          <div>
            <label style={labelStyle}>Age Description</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }} value={race.age_description || ''} onChange={(e) => onChange({ ...race, age_description: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Alignment Description</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }} value={race.alignment_description || ''} onChange={(e) => onChange({ ...race, alignment_description: e.target.value })} />
          </div>
        </div>
      )}
      {tab === 'traits' && (
        <NameDescListField label="Traits" items={race.traits || []} onChange={(traits) => onChange({ ...race, traits })} />
      )}
      {tab === 'subraces' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {(subraces || []).map((sub, idx) => (
            <div key={`subrace-${idx}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 10, background: 'var(--bg-raised)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input style={inputStyle} placeholder="Subrace name" value={sub.name || ''} onChange={(e) => {
                  const next = subraces.slice()
                  next[idx] = { ...(next[idx] || {}), name: e.target.value }
                  onChange({ ...race, subraces: next })
                }} />
                <button type="button" onClick={() => onChange({ ...race, subraces: subraces.filter((_, i) => i !== idx) })} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', padding: '0 10px' }}>×</button>
              </div>
              <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Description" value={sub.description || ''} onChange={(e) => {
                const next = subraces.slice()
                next[idx] = { ...(next[idx] || {}), description: e.target.value }
                onChange({ ...race, subraces: next })
              }} />
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...race, subraces: [...subraces, { name: '', description: '' }] })} style={{ width: 'fit-content', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>+ Add Subrace</button>
        </div>
      )}
    </div>
  )
}
