import React, { useState } from 'react'

const toneBorder = {
  beneficial: 'rgba(100, 160, 120, 0.45)',
  harmful: 'rgba(180, 90, 90, 0.45)',
  chaotic: 'rgba(160, 140, 200, 0.45)',
}

const toneLabel = {
  beneficial: '#a8d4b8',
  harmful: '#e0a0a0',
  chaotic: '#c8b8e8',
}

const typeLabel = {
  instant: 'Instant',
  duration: 'Duration',
  triggered: 'Triggered',
}

export default function WildMagicResultCard({
  roll,
  title,
  description,
  duration,
  type,
  tone = 'chaotic',
  animate = false,
  compact = false,
}) {
  const [open, setOpen] = useState(!compact)

  return (
    <div
      className={animate ? 'wm-result-pop' : undefined}
      style={{
        borderRadius: 'var(--radius)',
        border: `1px solid ${toneBorder[tone] || toneBorder.chaotic}`,
        background: 'linear-gradient(145deg, rgba(30, 38, 32, 0.95), rgba(14, 18, 14, 0.98))',
        padding: compact ? '12px 14px' : '16px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? 28 : 36,
              fontWeight: 700,
              color: 'var(--green-bright)',
              lineHeight: 1,
              textShadow: '0 0 24px rgba(100, 200, 120, 0.25)',
            }}
          >
            🎲 {roll}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 15 : 17, color: 'var(--text-primary)', maxWidth: 420 }}>
            {title}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={tagStyle(typeLabel[type] || '#aaa')}>{typeLabel[type] || type}</span>
          <span style={tagStyle(toneLabel[tone] || '#aaa')}>{tone}</span>
          {duration && (
            <span style={tagStyle('var(--warning)')}>{duration}</span>
          )}
        </div>
      </div>

      {compact && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            marginTop: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {open ? '▼ Hide details' : '▶ Full effect'}
        </button>
      )}

      {open && (
        <p style={{
          margin: compact ? '10px 0 0' : '14px 0 0',
          fontSize: compact ? 12 : 13,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
        }}
        >
          {description}
        </p>
      )}
    </div>
  )
}

function tagStyle(color) {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '3px 8px',
    borderRadius: 999,
    border: `1px solid ${color}55`,
    color,
    background: `${color}12`,
  }
}
