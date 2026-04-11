import React from 'react'
import { findDiceExpressionsInText, rollDiceExpression } from '@shared/lib/combat/diceExpressions.js'

const chipStyle = {
  display: 'inline',
  padding: '0 4px',
  margin: '0 1px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '0.92em',
  lineHeight: 1.4,
  verticalAlign: 'baseline',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 3,
  color: 'var(--text-secondary, #bbb)',
  cursor: 'pointer',
}

/**
 * Renders text with dice expressions as subtle inline roll buttons.
 *
 * @param {{
 *   text: string,
 *   onRoll?: (result: { total: number, rolls: number[], mod: number, expr: string, contextLabel?: string }) => void,
 *   contextLabel?: string,
 *   style?: React.CSSProperties,
 * }} props
 */
export default function DiceRichText({ text, onRoll, contextLabel, style }) {
  const s = String(text || '')
  const matches = findDiceExpressionsInText(s)
  if (!matches.length || typeof onRoll !== 'function') {
    return <span style={style}>{s}</span>
  }

  const nodes = []
  let last = 0
  matches.forEach((m, i) => {
    if (m.start > last) {
      nodes.push(<span key={`t-${i}-${last}`}>{s.slice(last, m.start)}</span>)
    }
    const label = s.slice(m.start, m.end)
    nodes.push(
      <button
        key={`d-${i}-${m.start}`}
        type="button"
        title="Roll"
        style={chipStyle}
        onClick={() => {
          const rolled = rollDiceExpression(m.normalized)
          if (!rolled) return
          onRoll({
            ...rolled,
            expr: m.normalized,
            contextLabel,
          })
        }}
      >
        {label}
      </button>,
    )
    last = m.end
  })
  if (last < s.length) {
    nodes.push(<span key={`end-${last}`}>{s.slice(last)}</span>)
  }
  return <span style={style}>{nodes}</span>
}
