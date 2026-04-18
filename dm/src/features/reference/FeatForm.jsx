import React from 'react'
import { inputStyle, labelStyle } from './ReferenceFormPrimitives.jsx'

const CLASS_OPTIONS = ['', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const ABILITIES = ['', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export default function FeatForm({ value, onChange }) {
  const feat = value || {}
  const abilityMin = feat.ability_score_minimum || { ability: '', minimum: '' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={feat.name || ''} onChange={(e) => onChange({ ...feat, name: e.target.value })} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Prerequisite</label>
        <input style={inputStyle} value={feat.prerequisite || ''} placeholder="e.g. 4th level, or Strength 13 or higher" onChange={(e) => onChange({ ...feat, prerequisite: e.target.value || null })} />
      </div>
      <div>
        <label style={labelStyle}>Ability Minimum</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={inputStyle} value={abilityMin.ability || ''} onChange={(e) => onChange({ ...feat, ability_score_minimum: { ...abilityMin, ability: e.target.value || null } })}>
            {ABILITIES.map((a) => <option key={a} value={a}>{a || 'None'}</option>)}
          </select>
          <input type="number" style={inputStyle} value={abilityMin.minimum || ''} onChange={(e) => onChange({ ...feat, ability_score_minimum: { ...abilityMin, minimum: e.target.value ? parseInt(e.target.value, 10) : null } })} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Level Minimum</label>
        <input type="number" style={inputStyle} value={feat.level_minimum ?? ''} onChange={(e) => onChange({ ...feat, level_minimum: e.target.value ? parseInt(e.target.value, 10) : null })} />
      </div>
      <div>
        <label style={labelStyle}>Class Requirement</label>
        <select style={inputStyle} value={feat.class_requirement || ''} onChange={(e) => onChange({ ...feat, class_requirement: e.target.value || null })}>
          {CLASS_OPTIONS.map((cls) => <option key={cls} value={cls}>{cls || 'None'}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Source Book</label>
        <input style={inputStyle} value={feat.source_book || ''} onChange={(e) => onChange({ ...feat, source_book: e.target.value })} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} value={feat.description || ''} onChange={(e) => onChange({ ...feat, description: e.target.value })} />
      </div>
    </div>
  )
}
