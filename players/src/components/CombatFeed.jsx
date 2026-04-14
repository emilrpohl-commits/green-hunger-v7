import React, { useEffect, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { decodeSavePrompt, decodeSavePromptStrict, decodePlayerSavePrompt, readSavePromptPayload } from '@shared/lib/combatRules.js'
import { mergeUniqueCombatFeedEvent } from '@shared/lib/combat/feedOrdering.js'
import { usePlayerStore } from '../stores/playerStore'

function formatPlayerFeedEvent(event) {
  if (!event) return null
  if (event.type === 'player-save-prompt') return null
  if (decodePlayerSavePrompt(event.text)) return null
  if (event.type === 'save-prompt-resolved') {
    const strict = decodeSavePromptStrict(event.text)
    const p = readSavePromptPayload(event) || (strict.ok ? strict.payload : decodeSavePrompt(event.text))
    if (!p) return '[System] Save prompt resolution failed to decode.'
    return p?.resolutionText ?? null
  }
  if (event.type === 'save-prompt') {
    const strict = decodeSavePromptStrict(event.text)
    const p = readSavePromptPayload(event) || (strict.ok ? strict.payload : decodeSavePrompt(event.text))
    if (p) {
      const names = (p.targets || []).map(t => t.name).filter(Boolean).join(', ')
      return `${p.casterName || 'Someone'} casts ${p.spellName || 'a spell'}: ${p.saveAbility} save DC ${p.saveDc}${names ? ` (${names})` : ''}`
    }
    return '[System] Save prompt failed to decode.'
  }
  return event.text
}

export default function CombatFeed() {
  const combatActive = usePlayerStore(s => s.combatActive)
  const [feed, setFeed] = useState([])

  useEffect(() => {
    const sessionRunId = getSessionRunId()

    const loadFeed = async () => {
      try {
        const { data: feedData } = await supabase
          .from('combat_feed')
          .select('*')
          .eq('session_id', sessionRunId)
          .eq('shared', true)
          .order('timestamp', { ascending: false })
          .limit(20)
        if (feedData) setFeed(feedData)
      } catch (e) { /* non-critical */ }
    }

    loadFeed()

    const feedChannel = supabase
      .channel('combat-feed-player')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'combat_feed',
        filter: `session_id=eq.${sessionRunId}`
      }, (payload) => {
        if (payload.new && payload.new.shared && (!payload.new.target_id || payload.new.target_id === 'all')) {
          setFeed((prev) => {
            return mergeUniqueCombatFeedEvent(prev, payload.new).slice(0, 20)
          })
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'combat_feed',
        filter: `session_id=eq.${sessionRunId}`
      }, (payload) => {
        const oldId = payload.old?.id
        if (oldId != null) {
          setFeed(prev => prev.filter(e => e.id !== oldId))
        }
      })
      .subscribe()

    return () => {
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

      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {feed.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Waiting for combat to begin…
          </div>
        ) : (
          (() => {
            const visible = feed.reduce((acc, event) => {
              const line = formatPlayerFeedEvent(event)
              if (line == null) return acc
              acc.push({ event, line })
              return acc
            }, [])
            if (visible.length === 0) {
              return (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No shared combat updates yet…
                </div>
              )
            }
            return visible.map(({ event, line }, i) => (
              <div key={event.id || i} style={{
                color: event.type === 'damage' ? '#c49070'
                  : event.type === 'heal' ? 'var(--green-bright)'
                  : event.type === 'round' ? 'var(--text-muted)'
                  : event.type === 'system' ? '#c4a060'
                  : event.type === 'save-prompt-resolved' ? 'var(--green-bright)'
                  : 'var(--text-secondary)',
                fontFamily: event.type === 'round' ? 'var(--font-mono)' : 'var(--font-body)',
                fontSize: event.type === 'round' ? 11 : 14,
                borderTop: event.type === 'round' ? '1px solid var(--border)' : 'none',
                paddingTop: event.type === 'round' ? 6 : 0,
                marginTop: event.type === 'round' ? 4 : 0,
                opacity: i > 5 ? Math.max(0.3, 1 - (i - 5) * 0.12) : 1
              }}>
                {line}
              </div>
            ))
          })()
        )}
      </div>
    </div>
  )
}
