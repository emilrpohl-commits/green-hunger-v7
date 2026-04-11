import React from 'react'
import { greenMarkTriggerLabel } from '../../lib/greenMarks.js'

const tagBase = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  padding: '2px 6px',
  borderRadius: 'var(--radius)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

export default function GreenMarkEffectCard({ effect, tier = 1, compact = false }) {
  const triggerText = greenMarkTriggerLabel(effect)
  const borderGlow =
    tier >= 3
      ? 'rgba(80, 140, 70, 0.55)'
      : tier >= 2
        ? 'rgba(90, 130, 80, 0.4)'
        : 'var(--border)'

  return (
    <div
      style={{
        padding: compact ? '8px 10px' : '10px 12px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${borderGlow}`,
        background:
          tier >= 3
            ? 'linear-gradient(135deg, rgba(40, 60, 35, 0.5), rgba(20, 28, 18, 0.85))'
            : tier >= 2
              ? 'rgba(35, 50, 32, 0.35)'
              : 'var(--bg-raised)',
        boxShadow: tier >= 3 ? '0 0 20px rgba(60, 100, 50, 0.12)' : 'none',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: compact ? 9 : 10,
            color: tier >= 3 ? '#9ccc8a' : 'var(--green-bright)',
            fontWeight: 700,
          }}
        >
          Mark {effect.level}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 12 : 13, color: 'var(--text-primary)' }}>
          {effect.title}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {effect.mechanical && (
          <span style={{ ...tagBase, border: '1px solid rgba(180, 100, 100, 0.35)', color: '#c9a0a0' }}>Mechanical</span>
        )}
        {effect.narrative && (
          <span style={{ ...tagBase, border: '1px solid rgba(120, 140, 180, 0.35)', color: '#a8b8d8' }}>Narrative</span>
        )}
        {triggerText && (
          <span style={{ ...tagBase, border: '1px solid rgba(100, 160, 90, 0.4)', color: '#a8d4a0' }}>Triggered</span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: compact ? 11 : 12, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
        {effect.description}
      </p>
      {triggerText && (
        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 6,
          }}
        >
          <span style={{ color: 'var(--warning)' }}>When: </span>
          {triggerText}
        </div>
      )}
    </div>
  )
}
