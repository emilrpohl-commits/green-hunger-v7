import React, { useState, useEffect, useRef } from 'react'

/**
 * Fixed mini-bar when main tactical block scrolls out of view.
 */
export default function StickySummaryBar({
  visible,
  charColour = 'var(--green-mid)',
  curHp,
  maxHp,
  tempHp = 0,
  ac,
  conditions = [],
  concentration = false,
  concentrationSpell = '',
  resourceHint = '',
}) {
  if (!visible) return null
  const hpPct = maxHp > 0 ? (curHp / maxHp) * 100 : 0
  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: '8px 16px',
        background: 'rgba(12,14,12,0.92)',
        borderBottom: `1px solid ${charColour}55`,
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>
        <span style={{ color: curHp === 0 ? 'var(--danger)' : 'var(--green-bright)', fontWeight: 700 }}>{curHp}</span>
        {tempHp > 0 && <span style={{ color: 'var(--info)' }}>+{tempHp}</span>}
        <span style={{ color: 'var(--text-muted)' }}>/{maxHp}</span>
      </div>
      {ac != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>AC {ac}</span>
      )}
      {conditions.slice(0, 4).map((c) => (
        <span
          key={c}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {c}
        </span>
      ))}
      {conditions.length > 4 && (
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{conditions.length - 4}</span>
      )}
      {concentration && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)' }}>
          ◈ {concentrationSpell || 'Conc.'}
        </span>
      )}
      {resourceHint && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{resourceHint}</span>
      )}
      <div style={{ flex: 1, minWidth: 80, height: 4, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${hpPct}%`, height: '100%', background: charColour, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

export function useStickySummaryVisibility(rootMargin = '-80px 0px 0px 0px') {
  const sentinelRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    let obs
    try {
      obs = new IntersectionObserver(
        ([e]) => {
          setVisible(!e.isIntersecting)
        },
        { root: null, rootMargin, threshold: 0 }
      )
    } catch {
      // Bad rootMargin input should not crash the whole player app.
      setVisible(false)
      return undefined
    }
    obs.observe(el)
    return () => obs.disconnect()
  }, [rootMargin])

  return { sentinelRef, visible }
}
