import React from 'react'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { useSessionStore } from '../../stores/sessionStore'
import { useCampaignStore } from '../../stores/campaignStore'

export default function TopBar({ onSwitchToBuilder }) {
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
  )
}
