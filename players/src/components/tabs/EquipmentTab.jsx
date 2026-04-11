import React from 'react'
import { Section } from '../ui/Section'

export default function EquipmentTab({ char }) {
  return (
    <Section title="Equipment">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(Array.isArray(char.equipment) ? char.equipment : []).map(item => (
          <span key={item} style={{
            padding: '4px 10px',
            background: item.includes('Attuned') ? `${char.colour}18` : 'var(--bg-raised)',
            border: `1px solid ${item.includes('Attuned') ? char.colour + '40' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            fontSize: 12,
            color: item.includes('Attuned') ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
            {item}
          </span>
        ))}
      </div>
    </Section>
  )
}
