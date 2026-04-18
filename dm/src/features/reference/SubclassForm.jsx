import React, { useState } from 'react'
import { inputStyle, labelStyle } from './ReferenceFormPrimitives.jsx'
import ClassFeatureForm from './ClassFeatureForm.jsx'

const CLASS_OPTIONS = ['', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']

export default function SubclassForm({ value, onChange }) {
  const subclass = value || {}
  const features = Array.isArray(subclass.features) ? subclass.features : []
  const [tab, setTab] = useState('core')
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['core', 'features'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: tab === t ? 'var(--green-dim)' : 'transparent', color: tab === t ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>{t}</button>
        ))}
      </div>
      {tab === 'core' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Subclass Name</label>
            <input style={inputStyle} value={subclass.name || ''} onChange={(e) => onChange({ ...subclass, name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Class</label>
            <select style={inputStyle} value={subclass.class_name || ''} onChange={(e) => onChange({ ...subclass, class_name: e.target.value || null })}>
              {CLASS_OPTIONS.map((option) => <option key={option} value={option}>{option || 'Select class'}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Flavor Text</label>
            <input style={inputStyle} value={subclass.flavor || ''} onChange={(e) => onChange({ ...subclass, flavor: e.target.value || null })} placeholder="e.g. Arcane Tradition" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} value={subclass.description || ''} onChange={(e) => onChange({ ...subclass, description: e.target.value })} />
          </div>
        </div>
      )}
      {tab === 'features' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {features.map((feature, idx) => (
            <div key={`feature-${idx}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 10, background: 'var(--bg-raised)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Feature {idx + 1}
                </div>
                <button type="button" onClick={() => onChange({ ...subclass, features: features.filter((_, i) => i !== idx) })} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', padding: '2px 8px' }}>×</button>
              </div>
              <ClassFeatureForm
                value={feature}
                onChange={(nextFeature) => {
                  const next = features.slice()
                  next[idx] = nextFeature
                  onChange({ ...subclass, features: next })
                }}
              />
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...subclass, features: [...features, { name: '', class_name: subclass.class_name || null, level: null, subclass_name: subclass.name || null, description: '', feature_type: 'subclass' }] })} style={{ width: 'fit-content', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>+ Add Feature</button>
        </div>
      )}
    </div>
  )
}
