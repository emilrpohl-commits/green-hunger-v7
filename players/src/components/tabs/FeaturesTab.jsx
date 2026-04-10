import React from 'react'
import { Section } from '../ui/Section'

export default function FeaturesTab({ char }) {
  return (
    <>
      {char.features.map(f => (
        <Section key={f.name} title={f.name}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: char.colour || 'var(--green-bright)', marginBottom: 8 }}>{f.uses}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.description}</div>
        </Section>
      ))}

      {char.magicItems && char.magicItems.length > 0 && char.magicItems.map(item => (
        <Section key={item.name} title={`✦ ${item.name}`}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.description}</div>
        </Section>
      ))}

      <Section title="Background">
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>{char.backstory}</div>
      </Section>

      <Section title="Senses & Languages">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}><strong>Senses:</strong> {char.senses}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Languages:</strong> {char.languages}</div>
      </Section>
    </>
  )
}
