import React, { useState } from 'react'
import { useDmToolboxStore } from '../../../stores/dmToolboxStore.js'
import ImprovisedDamageTool from './ImprovisedDamageTool.jsx'
import DCTool from './DCTool.jsx'
import ObjectDurabilityTool from './ObjectDurabilityTool.jsx'
import ToolboxMobCombat from '../ToolboxMobCombat.jsx'

/**
 * Run-mode strip: damage, DC, objects, mob combat — without opening the full toolbox.
 */
export default function QuickRulingsMiniDrawer() {
  const open = useDmToolboxStore((s) => s.quickRulingsDrawerOpen)
  const collapsed = useDmToolboxStore((s) => s.quickRulingsDrawerCollapsed)
  const setOpen = useDmToolboxStore((s) => s.setQuickRulingsDrawerOpen)
  const toggleCollapsed = useDmToolboxStore((s) => s.toggleQuickRulingsDrawerCollapsed)

  const [section, setSection] = useState('damage')

  if (!open) return null

  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.35)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Quick rulings (collapsed)
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={toggleCollapsed}
            style={miniBtn}
          >
            Expand
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{ ...miniBtn, borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-muted)' }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'damage', label: 'Damage' },
    { id: 'dc', label: 'DC' },
    { id: 'object', label: 'Object' },
    { id: 'mob', label: 'Mob' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 380,
        maxHeight: 'min(48vh, 420px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-deep)',
        borderTop: '1px solid var(--green-mid)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--bg-surface)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--green-bright)', letterSpacing: '0.06em' }}>
          Quick rulings
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button" onClick={toggleCollapsed} style={miniBtn}>
            Collapse
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{ ...miniBtn, borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-muted)' }}
          >
            Close
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${section === t.id ? 'var(--green-mid)' : 'var(--border)'}`,
              background: section === t.id ? 'var(--green-dim)' : 'transparent',
              color: section === t.id ? 'var(--green-bright)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 }}>
        {section === 'damage' && <ImprovisedDamageTool compact />}
        {section === 'dc' && <DCTool compact />}
        {section === 'object' && <ObjectDurabilityTool compact />}
        {section === 'mob' && <ToolboxMobCombat compact />}
      </div>
    </div>
  )
}

const miniBtn = {
  padding: '5px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--green-mid)',
  background: 'var(--green-dim)',
  color: 'var(--green-bright)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  cursor: 'pointer',
}
