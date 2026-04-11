import React from 'react'
import GreenMarkEffectCard from './GreenMarkEffectCard.jsx'
import { getActiveGreenMarkEffects, greenMarkVisualTier } from '../../lib/greenMarks.js'

export default function GreenMarkEffectList({ current, compact = false }) {
  const effects = getActiveGreenMarkEffects(current)
  const tier = greenMarkVisualTier(current)

  if (effects.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No active marks — the Hunger has not yet taken hold.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
      {effects.map((effect) => (
        <GreenMarkEffectCard key={effect.level} effect={effect} tier={tier} compact={compact} />
      ))}
    </div>
  )
}
