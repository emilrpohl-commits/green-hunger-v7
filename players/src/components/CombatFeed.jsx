import React, { useEffect, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'

export default function CombatFeed() {
  const [feed, setFeed] = useState([])
  const [combatActive, setCombatActive] = useState(false)

  useEffect(() => {
    // Load initial combat state
    const loadInitial = async () => {
      try {
        const { data: stateData } = await supabase
          .from('combat_state')
          .select('*')
          .eq('id', 'session-1')
          .single()

        if (stateData) setCombatActive(stateData.active)

        const { data: feedData } = await supabase
          .from('combat_feed')
          .select('*')
          .eq('session_id', 'session-1')
          .eq('shared', true)
          .order('timestamp', { ascending: false })
          .limit(20)

        if (feedData) setFeed(feedData)
      } catch (e) {}
    }

    loadInitial()

    // Subscribe to combat state changes
    const stateChannel = supabase
      .channel('combat-state-player')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'combat_state',
        filter: 'id=eq.session-1'
      }, (payload) => {
        if (payload.new) setCombatActive(payload.new.active)
      })
      .subscribe()

    // Subscribe to new combat feed events
    const feedChannel = supabase
      .channel('combat-feed-player')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'combat_feed',
        filter: 'session_id=eq.session-1'
      }, (payload) => {
        if (payload.new && payload.new.shared) {
          setFeed(prev => [payload.new, ...prev].slice(0, 20))
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'combat_feed',
        filter: 'session_id=eq.session-1'
      }, (payload) => {
        const oldId = payload.old?.id
        if (oldId != null) {
          setFeed(prev => prev.filter(e => e.id !== oldId))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(stateChannel)
      supabase.removeChannel(feedChannel)
    }
  }, [])

  if (!combatActive && feed.length === 0) return null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: combatActive ? '2px solid rgba(196,64,64,0.5)' : '2px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        {combatActive && (
          <div style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: 'var(--danger)',
            boxShadow: '0 0 6px var(--danger)',
            animation: 'pulse 1.5s ease infinite'
          }} />
        )}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: combatActive ? '#c48060' : 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em'
        }}>
          {combatActive ? 'Combat' : 'Combat Log'}
        </span>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>

      {/* Feed */}
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {feed.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Waiting for combat to begin…
          </div>
        ) : (
          feed.map((event, i) => (
            <div key={event.id || i} style={{
              color: event.type === 'damage' ? '#c49070'
                : event.type === 'heal' ? 'var(--green-bright)'
                : event.type === 'round' ? 'var(--text-muted)'
                : event.type === 'system' ? '#c4a060'
                : 'var(--text-secondary)',
              fontFamily: event.type === 'round' ? 'var(--font-mono)' : 'var(--font-body)',
              fontSize: event.type === 'round' ? 11 : 14,
              borderTop: event.type === 'round' ? '1px solid var(--border)' : 'none',
              paddingTop: event.type === 'round' ? 6 : 0,
              marginTop: event.type === 'round' ? 4 : 0,
              opacity: i > 5 ? Math.max(0.3, 1 - (i - 5) * 0.12) : 1
            }}>
              {event.text}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
