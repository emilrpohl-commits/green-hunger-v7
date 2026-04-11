import React from 'react'

/**
 * @param {{ actionAvailable?: boolean, bonusActionAvailable?: boolean, reactionAvailable?: boolean }} economy
 * @param {(kind: 'action'|'bonusAction'|'reaction') => void} [onToggle]
 */
export default function ActionEconomyTrack({
  economy = {},
  onToggle,
  readOnly = false,
  compact = false,
}) {
  const rows = [
    { key: 'action', label: 'Action', ready: economy.actionAvailable !== false },
    { key: 'bonusAction', label: 'Bonus', ready: economy.bonusActionAvailable !== false },
    { key: 'reaction', label: 'Reaction', ready: economy.reactionAvailable !== false },
  ]
  return (
    <div style={{ display: 'flex', gap: compact ? 6 : 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {rows.map(({ key, label, ready }) => (
        <button
          key={key}
          type="button"
          disabled={readOnly || !onToggle}
          onClick={() => onToggle?.(key)}
          style={{
            padding: compact ? '4px 10px' : '6px 14px',
            borderRadius: 20,
            border: `1px solid ${ready ? 'var(--green-mid)' : 'var(--border)'}`,
            background: ready ? 'var(--green-dim)' : 'transparent',
            color: ready ? 'var(--green-bright)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: compact ? 9 : 10,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: readOnly || !onToggle ? 'default' : 'pointer',
            minHeight: 36,
          }}
        >
          {label} {ready ? '●' : '○'}
        </button>
      ))}
    </div>
  )
}
