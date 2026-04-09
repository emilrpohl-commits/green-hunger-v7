import React from 'react'
import SceneDisplay from './SceneDisplay'
import CombatFeed from './CombatFeed'
import PartyStatus from './PartyStatus'
import RevealedCards from './RevealedCards'
import ConnectionBadge from './ConnectionBadge'

export default function PartyView() {
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
      <RevealedCards />
      <SceneDisplay />
      <CombatFeed />
      <PartyStatus />
    </div>
  )
}
