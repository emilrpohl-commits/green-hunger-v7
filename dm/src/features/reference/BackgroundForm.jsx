import React from 'react'
import { inputStyle, labelStyle, StringListField } from './ReferenceFormPrimitives.jsx'

const SKILLS = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival']

export default function BackgroundForm({ value, onChange }) {
  const bg = value || {}
  const selectedSkills = Array.isArray(bg.skill_proficiencies) ? bg.skill_proficiencies : []
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={bg.name || ''} onChange={(e) => onChange({ ...bg, name: e.target.value })} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Skill Proficiencies</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
          {SKILLS.map((skill) => (
            <label key={skill} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedSkills.includes(skill)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selectedSkills, skill]
                    : selectedSkills.filter((s) => s !== skill)
                  onChange({ ...bg, skill_proficiencies: next })
                }}
              />
              {skill}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label style={labelStyle}>Tool Proficiencies</label>
        <input style={inputStyle} value={(bg.tool_proficiencies || []).join(', ')} onChange={(e) => onChange({ ...bg, tool_proficiencies: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
      </div>
      <div>
        <label style={labelStyle}>Choose Languages (N)</label>
        <input type="number" style={inputStyle} value={bg.language_choices ?? 0} onChange={(e) => onChange({ ...bg, language_choices: parseInt(e.target.value, 10) || 0 })} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Starting Equipment</label>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} value={bg.starting_equipment || ''} onChange={(e) => onChange({ ...bg, starting_equipment: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>Feature Name</label>
        <input style={inputStyle} value={bg.feature_name || ''} onChange={(e) => onChange({ ...bg, feature_name: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>Source Book</label>
        <input style={inputStyle} value={bg.source_book || ''} onChange={(e) => onChange({ ...bg, source_book: e.target.value })} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={labelStyle}>Feature Description</label>
        <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }} value={bg.feature_description || ''} onChange={(e) => onChange({ ...bg, feature_description: e.target.value })} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <StringListField label="Personality Traits (up to 8)" items={bg.personality_traits || []} onChange={(personality_traits) => onChange({ ...bg, personality_traits })} maxItems={8} />
      </div>
      <div>
        <StringListField label="Ideals (up to 6)" items={bg.ideals || []} onChange={(ideals) => onChange({ ...bg, ideals })} maxItems={6} />
      </div>
      <div>
        <StringListField label="Bonds (up to 6)" items={bg.bonds || []} onChange={(bonds) => onChange({ ...bg, bonds })} maxItems={6} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <StringListField label="Flaws (up to 6)" items={bg.flaws || []} onChange={(flaws) => onChange({ ...bg, flaws })} maxItems={6} />
      </div>
    </div>
  )
}
