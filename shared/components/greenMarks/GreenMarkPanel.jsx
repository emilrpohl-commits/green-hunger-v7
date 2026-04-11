import React from 'react'
import GreenMarkEffectList from './GreenMarkEffectList.jsx'
import GreenMarkTriggerActions from './GreenMarkTriggerActions.jsx'

/**
 * DM panel: count, +/-, full effects, triggers.
 */
export default function GreenMarkPanel({
  characterId,
  characterName,
  current = 0,
  maxMarks = 10,
  onAdjust,
  onMarkLastTriggered,
  showTriggers = true,
}) {
  const c = Math.max(0, Math.min(maxMarks, Math.floor(Number(current) || 0)))

  return (
    <div
      style={{
        marginTop: 10,
        padding: '12px 12px',
        borderRadius: 'var(--radius)',
        border: '1px solid rgba(90, 130, 75, 0.35)',
        background: 'rgba(20, 32, 22, 0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Green marks — {characterName || characterId}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            aria-label="Remove one green mark"
            onClick={() => onAdjust?.(characterId, -1)}
            style={iconBtn}
          >
            −
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#c4e8b0', minWidth: 28, textAlign: 'center' }}>{c}</span>
          <button
            type="button"
            aria-label="Add one green mark"
            onClick={() => onAdjust?.(characterId, 1)}
            style={iconBtn}
          >
            +
          </button>
        </div>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Adjust with +/−. Optional cap in tactical JSON: <code style={{ fontSize: 9 }}>greenMarksState.max</code> (default {maxMarks}).
      </p>

      <div style={{ marginTop: 12 }}>
        <GreenMarkEffectList current={c} />
      </div>

      {showTriggers && c > 0 && (
        <GreenMarkTriggerActions
          current={c}
          characterName={characterName}
          onMarkLastTriggered={() => onMarkLastTriggered?.(characterId)}
        />
      )}
    </div>
  )
}

const iconBtn = {
  width: 28,
  height: 28,
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--green-bright)',
  fontSize: 16,
  lineHeight: 1,
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
}
