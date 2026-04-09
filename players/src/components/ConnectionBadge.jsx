import React from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function ConnectionBadge() {
  const connected = usePlayerStore(s => s.connected)
  const lastUpdated = usePlayerStore(s => s.lastUpdated)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 7, height: 7,
        borderRadius: '50%',
        background: connected ? 'var(--green-bright)' : 'var(--text-muted)',
        boxShadow: connected ? '0 0 6px var(--green-bright)' : 'none',
        transition: 'all 0.4s ease'
      }} />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: connected ? 'var(--green-bright)' : 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      }}>
        {connected ? 'live' : 'connecting…'}
      </span>
    </div>
  )
}
