import React from 'react'

/**
 * @param {{ label: string, current: number, max: number, resetType?: string, displayType?: 'pips'|'counter'|'toggle' }} resource
 */
export function ResourcePips({
  resource,
  onIncrement,
  onDecrement,
  readOnly = false,
  compact = false,
}) {
  const { label, current, max, resetType, displayType = 'pips' } = resource
  const safeMax = Math.max(0, Number(max) || 0)
  const cur = Math.min(safeMax, Math.max(0, Number(current) ?? 0))
  const remaining = displayType === 'toggle' ? (cur > 0 ? 1 : 0) : cur
  const total = displayType === 'toggle' ? 1 : safeMax

  if (displayType === 'toggle') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={labelStyle(compact)}>{label}</span>
        <button
          type="button"
          disabled={readOnly || !onIncrement}
          onClick={() => onIncrement?.()}
          style={{
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            borderRadius: 'var(--radius)',
            border: `1px solid ${remaining ? 'var(--green-mid)' : 'var(--border)'}`,
            background: remaining ? 'var(--green-dim)' : 'transparent',
            color: remaining ? 'var(--green-bright)' : 'var(--text-muted)',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {remaining ? 'On' : 'Off'}
        </button>
        {resetType && <span style={hintStyle}>{resetType}</span>}
      </div>
    )
  }

  if (displayType === 'counter') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={labelStyle(compact)}>{label}</span>
        <button type="button" disabled={readOnly || !onDecrement || cur <= 0} onClick={() => onDecrement?.()} style={mini}>
          −
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', minWidth: 36, textAlign: 'center' }}>
          {cur}/{safeMax}
        </span>
        <button type="button" disabled={readOnly || !onIncrement || cur >= safeMax} onClick={() => onIncrement?.()} style={mini}>
          +
        </button>
        {resetType && <span style={hintStyle}>{resetType}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={labelStyle(compact)}>{label}</span>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {Array.from({ length: safeMax }).map((_, i) => (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => {
              const used = safeMax - remaining
              if (i < used && onIncrement) onIncrement()
              else if (i >= used && onDecrement && remaining > 0) onDecrement()
            }}
            style={{
              width: compact ? 8 : 10,
              height: compact ? 8 : 10,
              borderRadius: '50%',
              border: '1px solid var(--green-dim)',
              background: i < remaining ? 'var(--green-mid)' : 'transparent',
              cursor: readOnly ? 'default' : 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 9 : 10, color: 'var(--text-muted)' }}>
        {remaining}/{safeMax}
      </span>
    </div>
  )
}

const labelStyle = (compact) => ({
  fontFamily: 'var(--font-mono)',
  fontSize: compact ? 9 : 10,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  minWidth: compact ? 0 : 52,
})

const hintStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  color: 'var(--text-muted)',
  opacity: 0.85,
}

const mini = {
  padding: '2px 8px',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}

/**
 * Horizontal control bar for spell slots + class resources.
 * @param {Array<{ level?: string|number, max: number, used: number }>} spellSlots — object entries as { level, ...slot }
 */
export function ResourceStrip({
  spellSlots = null,
  classResources = [],
  onSpellSlotClick,
  readOnly = false,
  compact = false,
}) {
  const spellEntries = spellSlots && typeof spellSlots === 'object'
    ? Object.entries(spellSlots).map(([level, slot]) => ({
        label: `L${level}`,
        current: (slot?.max ?? 0) - (slot?.used ?? 0),
        max: slot?.max ?? 0,
        displayType: 'pips',
        level,
        _slot: slot,
      }))
    : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 6 : 8,
        padding: compact ? '8px 0 0' : '10px 0 0',
      }}
    >
      {spellEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 10 : 14, alignItems: 'center' }}>
          <span style={{ ...labelStyle(compact), width: '100%', marginBottom: -4 }}>Spell slots</span>
          {spellEntries.map((r) => (
            <div key={r.level} style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={labelStyle(compact)}>Lvl {r.level}</span>
              {onSpellSlotClick && !readOnly && (
                <button
                  type="button"
                  title="Use one slot"
                  disabled={r.current <= 0}
                  onClick={() => onSpellSlotClick(r.level, 'use')}
                  style={{
                    ...mini,
                    padding: compact ? '1px 6px' : '2px 8px',
                    fontSize: compact ? 11 : 12,
                    lineHeight: 1,
                    opacity: r.current <= 0 ? 0.4 : 1,
                    cursor: r.current <= 0 ? 'default' : 'pointer',
                  }}
                >
                  −
                </button>
              )}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {Array.from({ length: r.max }).map((_, i) => {
                  const remaining = r.current
                  const filled = i < remaining
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onSpellSlotClick?.(r.level, filled ? 'restore' : 'use')}
                      style={{
                        width: compact ? 8 : 10,
                        height: compact ? 8 : 10,
                        borderRadius: '50%',
                        border: '1px solid var(--green-dim)',
                        background: filled ? 'var(--green-mid)' : 'transparent',
                        cursor: readOnly ? 'default' : 'pointer',
                        padding: 0,
                      }}
                    />
                  )
                })}
              </div>
              {onSpellSlotClick && !readOnly && (
                <button
                  type="button"
                  title="Restore one slot"
                  disabled={r.current >= r.max}
                  onClick={() => onSpellSlotClick(r.level, 'restore')}
                  style={{
                    ...mini,
                    padding: compact ? '1px 6px' : '2px 8px',
                    fontSize: compact ? 11 : 12,
                    lineHeight: 1,
                    opacity: r.current >= r.max ? 0.4 : 1,
                    cursor: r.current >= r.max ? 'default' : 'pointer',
                  }}
                >
                  +
                </button>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                {r.current}/{r.max}
              </span>
            </div>
          ))}
        </div>
      )}
      {classResources?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...labelStyle(compact), marginBottom: -2 }}>Class</span>
          {classResources.map((res, idx) => (
            <ResourcePips key={res.label + idx} resource={res} readOnly={readOnly} compact={compact} />
          ))}
        </div>
      )}
    </div>
  )
}
