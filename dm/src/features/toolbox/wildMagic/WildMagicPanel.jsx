import React, { useState } from 'react'
import { useDmToolboxStore } from '../../../stores/dmToolboxStore.js'
import WildMagicRoller from './WildMagicRoller.jsx'
import WildMagicHistory from './WildMagicHistory.jsx'
import ActiveWildMagicEffects from './ActiveWildMagicEffects.jsx'
import WildMagicEffectList from './WildMagicEffectList.jsx'

export default function WildMagicPanel({ compact = false }) {
  const [showTable, setShowTable] = useState(false)
  const history = useDmToolboxStore((s) => s.wildMagicHistory)
  const active = useDmToolboxStore((s) => s.wildMagicActive)
  const removeWildMagicActive = useDmToolboxStore((s) => s.removeWildMagicActive)
  const clearWildMagicHistory = useDmToolboxStore((s) => s.clearWildMagicHistory)
  const clearWildMagicActive = useDmToolboxStore((s) => s.clearWildMagicActive)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 22 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 560 }}>
        Roll → result → actionable output. Ongoing surges land in <strong style={{ color: 'var(--text-primary)' }}>active effects</strong>; instants stay on the card only.
      </p>

      <WildMagicRoller compact={compact} />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: compact ? 14 : 18 }}>
        <ActiveWildMagicEffects items={active} onRemove={removeWildMagicActive} />
        {active.length > 0 && (
          <button type="button" onClick={clearWildMagicActive} style={ghostSmall}>
            Clear all active
          </button>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: compact ? 14 : 18 }}>
        <WildMagicHistory entries={history} onClear={clearWildMagicHistory} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: compact ? 14 : 18 }}>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          style={ghostSmall}
        >
          {showTable ? '▼ Hide full table' : '▶ Browse full table (grouped)'}
        </button>
        {showTable && (
          <div style={{ marginTop: 12 }}>
            <WildMagicEffectList compact={compact} />
          </div>
        )}
      </div>
    </div>
  )
}

const ghostSmall = {
  marginTop: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '6px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
