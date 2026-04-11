import React, { useState } from 'react'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { useSessionStore } from '../../stores/sessionStore'
import { useCampaignStore } from '../../stores/campaignStore'
import { useDmToolboxStore } from '../../stores/dmToolboxStore.js'
import RulesLookupPanel from '@shared/components/rules/RulesLookupPanel.jsx'

export default function TopBar({ onSwitchToBuilder, onOpenToolbox }) {
  const [rulesLookupOpen, setRulesLookupOpen] = useState(false)
  const setQuickRulingsOpen = useDmToolboxStore((s) => s.setQuickRulingsDrawerOpen)
  const rollWildMagic = useDmToolboxStore((s) => s.rollWildMagic)
  const syncStatus = useSessionStore(s => s.syncStatus)
  const session = useSessionStore(s => s.session)
  const campaign = useCampaignStore(s => s.campaign)
  const currentSceneIndex = useSessionStore(s => s.currentSceneIndex)
  const scene = session?.scenes?.[currentSceneIndex]

  const syncColour = {
    idle: 'var(--text-muted)',
    syncing: 'var(--warning)',
    synced: 'var(--green-bright)',
    error: 'var(--danger)'
  }[syncStatus]

  const syncLabel = {
    idle: '—',
    syncing: 'syncing…',
    synced: 'synced',
    error: 'sync error'
  }[syncStatus]

  return (
    <>
    <RulesLookupPanel open={rulesLookupOpen} onClose={() => setRulesLookupOpen(false)} />
    <div
      className="md:px-6 md:gap-5"
      style={{
      gridArea: 'topbar',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      gap: 16
    }}
    >
      {/* Left: Campaign title */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          letterSpacing: '0.1em',
          color: 'var(--green-bright)',
          textTransform: 'uppercase'
        }}>
          {featureFlags.appTitle}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {campaign?.title || session?.title || 'No session loaded'}
        </span>
      </div>

      {/* Centre: Current scene */}
      <div style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        fontStyle: 'italic'
      }}>
        {scene?.title}
      </div>

      {/* Right: Builder toggle + Sync status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onOpenToolbox && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setRulesLookupOpen(true)}
              title="Search SRD rules glossary"
              style={{
                padding: '4px 10px', border: '1px solid var(--border)', cursor: 'pointer',
                borderRadius: 'var(--radius)', background: 'transparent',
                color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Rules
            </button>
            <button
              type="button"
              onClick={() => setQuickRulingsOpen(true)}
              title="Quick rulings strip — damage, DC, objects, mob"
              style={{
                padding: '4px 10px', border: '1px solid var(--border)', cursor: 'pointer',
                borderRadius: 'var(--radius)', background: 'transparent',
                color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Rulings
            </button>
            <button
              type="button"
              onClick={() => {
                rollWildMagic()
                onOpenToolbox('wild')
              }}
              title="Roll wild magic (d100) and open the Wild Magic toolbox tab"
              style={{
                padding: '4px 10px', border: '1px solid rgba(180, 120, 220, 0.45)', cursor: 'pointer',
                borderRadius: 'var(--radius)', background: 'rgba(140, 80, 180, 0.12)',
                color: '#d8b8e8', fontFamily: 'var(--font-mono)',
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Wild surge
            </button>
            <button
              type="button"
              onClick={() => onOpenToolbox('wild')}
              title="Full DM toolbox (includes Wild Magic)"
              style={{
                padding: '4px 12px', border: '1px solid var(--green-mid)', cursor: 'pointer',
                borderRadius: 'var(--radius)', background: 'var(--green-dim)',
                color: 'var(--green-bright)', fontFamily: 'var(--font-mono)',
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Toolbox
            </button>
          </div>
        )}
        {onSwitchToBuilder && (
          <button
            onClick={onSwitchToBuilder}
            style={{
              padding: '4px 12px', border: '1px solid var(--border)', cursor: 'pointer',
              borderRadius: 'var(--radius)', background: 'transparent',
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            Builder
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: syncColour,
            transition: 'background 0.3s'
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: syncColour,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            {syncLabel}
          </span>
        </div>
      </div>
    </div>
    </>
  )
}
