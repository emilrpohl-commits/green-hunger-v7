import React from 'react'
import { usePlayerStore } from '../stores/playerStore'
import SceneDisplay from './SceneDisplay'
import CombatFeed from './CombatFeed'
import PartyStatus from './PartyStatus'
import RevealedCards from './RevealedCards'
import ConnectionBadge from './ConnectionBadge'

export default function PartyView() {
  const charactersLoadError = usePlayerStore(s => s.charactersLoadError)

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      width: '100%',
      padding: '20px 20px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ConnectionBadge />
      </div>
      {charactersLoadError && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(196,160,64,0.08)',
          border: '1px solid rgba(196,160,64,0.35)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--warning)',
          fontFamily: 'var(--font-mono)',
        }}>
          Character data may be incomplete ({charactersLoadError}). HP bars might not match the database until load succeeds — try refreshing.
        </div>
      )}
      <RevealedCards />
      <SceneDisplay />
      <CombatFeed />
      <PartyStatus />
    </div>
  )
}
