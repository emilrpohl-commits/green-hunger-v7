import React, { useMemo, useState } from 'react'
import { Section } from '../ui/Section'
import FilterChipRow from '../ui/FilterChipRow.jsx'
import { ENTITY_FILTER_LABELS, matchesEntityFilter, featureToFilterTags } from '../../lib/entityFilters.js'
import { usePlayerStore } from '../../stores/playerStore'
import DiceInlineText from '@shared/components/combat/DiceInlineText.jsx'
import { createPlayerDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

export default function FeaturesTab({ char }) {
  const pushRoll = usePlayerStore((s) => s.pushRoll)
  const [featFilter, setFeatFilter] = useState('all')
  const handleInlineRoll = createPlayerDiceRollHandler({
    pushRoll,
    rollerName: char?.name || 'Player',
    defaultContextLabel: `${char?.name || 'Character'}: features`,
  })
  const filteredFeatures = useMemo(
    () => (char.features || []).filter((f) => matchesEntityFilter(featFilter, featureToFilterTags(f))),
    [char.features, featFilter]
  )

  return (
    <>
      <FilterChipRow options={ENTITY_FILTER_LABELS} value={featFilter} onChange={setFeatFilter} accent={char.colour} />

      {filteredFeatures.map(f => (
        <Section key={f.name} title={f.name}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: char.colour || 'var(--green-bright)', marginBottom: 8 }}>{f.uses}</div>
          <DiceInlineText
            text={f.description}
            contextLabel={`${char?.name || 'Character'}: ${f.name}`}
            onRoll={handleInlineRoll}
            style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}
          />
        </Section>
      ))}

      {char.magicItems && char.magicItems.length > 0 && char.magicItems.map(item => (
        <Section key={item.name} title={`✦ ${item.name}`}>
          <DiceInlineText
            text={item.description}
            contextLabel={`${char?.name || 'Character'}: ${item.name}`}
            onRoll={handleInlineRoll}
            style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}
          />
        </Section>
      ))}

      <Section title="Background">
        <DiceInlineText
          text={char.backstory}
          contextLabel={`${char?.name || 'Character'}: background`}
          onRoll={handleInlineRoll}
          style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}
        />
      </Section>

      <Section title="Senses & Languages">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}><strong>Senses:</strong> {char.senses}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Languages:</strong> {char.languages}</div>
      </Section>
    </>
  )
}
