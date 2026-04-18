import React from 'react'
import { inputStyle, labelStyle } from './ReferenceFormPrimitives.jsx'

const CLASS_OPTIONS = ['', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const RECHARGE_OPTIONS = ['', 'Short Rest', 'Long Rest', 'Per Turn']

export default function ClassFeatureForm({ value, onChange }) {
  const feature = value || {}
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Feature Name</label>
        <input style={inputStyle} value={feature.name || ''} onChange={(e) => onChange({ ...feature, name: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>Class</label>
        <select style={inputStyle} value={feature.class_name || ''} onChange={(e) => onChange({ ...feature, class_name: e.target.value || null })}>
          {CLASS_OPTIONS.map((option) => <option key={option} value={option}>{option || 'Select class'}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Level Gained</label>
        <input type="number" min={1} max={20} style={inputStyle} value={feature.level ?? ''} onChange={(e) => onChange({ ...feature, level: e.target.value ? parseInt(e.target.value, 10) : null })} />
      </div>
      <div>
        <label style={labelStyle}>Subclass (optional)</label>
        <input style={inputStyle} value={feature.subclass_name || ''} onChange={(e) => onChange({ ...feature, subclass_name: e.target.value || null, feature_type: e.target.value ? 'subclass' : (feature.feature_type || 'class') })} />
      </div>
      <div>
        <label style={labelStyle}>Recharge</label>
        <select style={inputStyle} value={feature.recharge || ''} onChange={(e) => onChange({ ...feature, recharge: e.target.value || null })}>
          {RECHARGE_OPTIONS.map((option) => <option key={option} value={option}>{option || 'None'}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Uses Formula</label>
        <input style={inputStyle} value={feature.uses_formula || ''} onChange={(e) => onChange({ ...feature, uses_formula: e.target.value || null })} placeholder="e.g. equal to your Proficiency Bonus" />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} value={feature.description || ''} onChange={(e) => onChange({ ...feature, description: e.target.value })} />
      </div>
    </div>
  )
}
