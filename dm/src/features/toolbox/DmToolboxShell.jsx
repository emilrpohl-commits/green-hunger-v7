import React, { useState } from 'react'
import ToolboxMobCombat from './ToolboxMobCombat.jsx'
import ToolboxAoE from './ToolboxAoE.jsx'
import ToolboxEncounterBudget from './ToolboxEncounterBudget.jsx'
import WildMagicPanel from './wildMagic/WildMagicPanel.jsx'
import QuickRulingsPanel from './quickRulings/QuickRulingsPanel.jsx'
import QuickTablesPanel from './quickRulings/QuickTablesPanel.jsx'

const TABS = [
  { id: 'wild', label: 'Wild magic' },
  { id: 'mob', label: 'Mob combat' },
  { id: 'aoe', label: 'Area of effect' },
  { id: 'budget', label: 'Encounter budget' },
  { id: 'rulings', label: 'Quick rulings' },
  { id: 'tables', label: 'Quick tables' },
]

export default function DmToolboxShell({ compact = false, initialTab = 'wild' }) {
  const [tab, setTab] = useState(initialTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: compact ? '100%' : 'auto', minHeight: compact ? 0 : '60vh' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
        marginBottom: 16,
      }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${tab === t.id ? 'var(--green-mid)' : 'var(--border)'}`,
              background: tab === t.id ? 'var(--green-dim)' : 'transparent',
              color: tab === t.id ? 'var(--green-bright)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? 9 : 10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: compact ? 4 : 8 }}>
        {tab === 'wild' && <WildMagicPanel compact={compact} />}
        {tab === 'mob' && <ToolboxMobCombat compact={compact} />}
        {tab === 'aoe' && <ToolboxAoE compact={compact} />}
        {tab === 'budget' && <ToolboxEncounterBudget compact={compact} />}
        {tab === 'rulings' && <QuickRulingsPanel compact={compact} />}
        {tab === 'tables' && <QuickTablesPanel compact={compact} />}
      </div>
    </div>
  )
}
