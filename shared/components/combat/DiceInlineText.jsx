import React, { useMemo } from 'react'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { parseDiceText, rollNormalizedExpression } from '@shared/lib/diceText/parser.js'
import { sanitizeUserText } from '@shared/lib/sanitizeUserText.js'

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
 * @param {{
 *  text: string,
 *  onRoll?: (result: {
 *    total: number,
 *    rolls: number[],
 *    mod: number,
 *    normalized: string,
 *    expr: string,
 *    contextLabel?: string,
 *    effectKind?: string,
 *    damageTypes?: string[],
 *    halfOnSuccess?: boolean,
 *    displayAverage?: number | null,
 *    hasAveragePrefix?: boolean,
 *  }) => void,
 *  contextLabel?: string,
 *  style?: React.CSSProperties,
 *  preserveWhitespace?: boolean,
 *  className?: string,
 *  disabled?: boolean,
 * }} props
 */
export default function DiceInlineText({
  text,
  onRoll,
  contextLabel,
  style,
  preserveWhitespace = true,
  className,
  disabled = false,
}) {
  const s = sanitizeUserText(text)
  const parsed = useMemo(() => parseDiceText(s), [s])
  const canRoll = featureFlags.uiDiceTextRolls !== false && typeof onRoll === 'function' && !disabled

  if (!parsed.matches.length || !canRoll) {
    return (
      <span className={className} style={{ whiteSpace: preserveWhitespace ? 'pre-wrap' : 'normal', ...style }}>
        {s}
      </span>
    )
  }

  return (
    <span className={className} style={{ whiteSpace: preserveWhitespace ? 'pre-wrap' : 'normal', ...style }}>
      {parsed.segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={`t-${i}`}>{seg.value}</span>
        const label = seg.label || seg.expr || seg.normalized
        return (
          <button
            key={`d-${i}-${seg.start}`}
            type="button"
            title="Roll dice"
            style={chipStyle}
            onClick={() => {
              const rolled = rollNormalizedExpression(seg.normalized)
              if (!rolled) return
              onRoll({
                ...rolled,
                normalized: seg.normalized,
                expr: seg.expr,
                contextLabel,
                effectKind: seg.effectKind,
                damageTypes: seg.damageTypes,
                halfOnSuccess: seg.halfOnSuccess,
                displayAverage: seg.displayAverage,
                hasAveragePrefix: seg.hasAveragePrefix,
              })
            }}
          >
            {label}
          </button>
        )
      })}
    </span>
  )
}

