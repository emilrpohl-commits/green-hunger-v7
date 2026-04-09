import React, { useEffect, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'

const TONE_STYLE = {
  narrative: { accent: '#4a7a42', text: '#8ab880' },
  ominous:   { accent: '#5a3a70', text: '#9a7ab0' },
  danger:    { accent: '#7a2020', text: '#c07060' },
  npc:       { accent: '#204060', text: '#6090b0' },
  item:      { accent: '#705020', text: '#b09050' },
  lore:      { accent: '#303830', text: '#708068' },
  location:  { accent: '#204030', text: '#60906a' }
}

export default function RevealedCards() {
  const [reveals, setReveals] = useState([])

  useEffect(() => {
    const sessionRunId = getSessionRunId()
    // Load existing reveals
    const load = async () => {
      try {
        const { data } = await supabase
          .from('reveals')
          .select('*')
          .eq('session_id', sessionRunId)
          .eq('visibility', 'player_visible')
          .order('revealed_at', { ascending: false })

        if (data) setReveals(data)
      } catch (e) {}
    }
    load()

    // Subscribe to new reveals
    const channel = supabase
      .channel('reveals-player')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reveals',
        filter: `session_id=eq.${sessionRunId}`
      }, (payload) => {
        if (payload.new && payload.new.visibility !== 'dm_only') {
          setReveals(prev => [payload.new, ...prev])
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'reveals'
      }, (payload) => {
        if (payload.old) {
          setReveals(prev => prev.filter(r => r.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (reveals.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reveals.map((reveal, i) => {
        const style = TONE_STYLE[reveal.tone] || TONE_STYLE.lore
        const isNew = i === 0

        return (
          <div
            key={reveal.id}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${style.accent}`,
              borderLeft: `3px solid ${style.text}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              animation: isNew ? 'revealIn 0.5s ease' : 'none',
              opacity: i > 3 ? Math.max(0.4, 1 - (i - 3) * 0.15) : 1
            }}
          >
            <style>{`
              @keyframes revealIn {
                from {
                  opacity: 0;
                  transform: translateY(-8px);
                  border-color: ${style.text};
                  box-shadow: 0 0 20px ${style.accent};
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                  box-shadow: none;
                }
              }
            `}</style>

            {/* Category */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: style.text,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 6,
              opacity: 0.8
            }}>
              {reveal.category}
            </div>

            {/* Title */}
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
              marginBottom: 10
            }}>
              {reveal.title}
            </div>

            {/* Content */}
            <div style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              lineHeight: 1.75
            }}>
              {reveal.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
