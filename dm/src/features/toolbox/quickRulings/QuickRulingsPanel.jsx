import React from 'react'
import ImprovisedDamageTool from './ImprovisedDamageTool.jsx'
import ObjectDurabilityTool from './ObjectDurabilityTool.jsx'
import DCTool from './DCTool.jsx'
import EncounterMultiplierTool from './EncounterMultiplierTool.jsx'
import ConditionsReference from './ConditionsReference.jsx'
import TrapSeverityCard from './TrapSeverityCard.jsx'
import ChaseComplicationsTool from './ChaseComplicationsTool.jsx'

function Section({ title, children }) {
  return (
    <section
      style={{
        paddingBottom: 20,
        marginBottom: 20,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

export default function QuickRulingsPanel({ compact = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          maxWidth: 520,
        }}
      >
        Fast rulings under pressure — damage tiers, DCs, objects, encounter math, conditions, traps, chases.
      </p>

      <Section title="Improvised damage">
        <ImprovisedDamageTool compact={compact} />
      </Section>
      <Section title="Difficulty class">
        <DCTool compact={compact} />
      </Section>
      <Section title="Object durability">
        <ObjectDurabilityTool compact={compact} />
      </Section>
      <Section title="Encounter multipliers">
        <EncounterMultiplierTool compact={compact} showBudgetHint />
      </Section>
      <Section title="Conditions">
        <ConditionsReference compact={compact} />
      </Section>
      <Section title="Traps & hazards">
        <TrapSeverityCard />
      </Section>
      <Section title="Chase">
        <ChaseComplicationsTool compact={compact} />
      </Section>
    </div>
  )
}
