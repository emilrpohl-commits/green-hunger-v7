import React, { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { BEAT_TYPE_COLOURS } from '@shared/lib/constants.js'
import SoundDock from './soundboard/SoundDock.jsx'

export default function LeftRail({ onCollapse = null }) {
  const session = useSessionStore(s => s.session)
  const sessions = useSessionStore(s => s.sessions)
  const activeSessionId = useSessionStore(s => s.activeSessionId)
  const switchSession = useSessionStore(s => s.switchSession)
  const currentSceneIndex = useSessionStore(s => s.currentSceneIndex)
  const currentBeatIndex = useSessionStore(s => s.currentBeatIndex)
  const completedBeats = useSessionStore(s => s.completedBeats)
  const jumpToScene = useSessionStore(s => s.jumpToScene)
  const jumpToBeat = useSessionStore(s => s.jumpToBeat)
  const jumpToSceneById = useSessionStore(s => s.jumpToSceneById)

  // No session loaded yet
  if (!session) {
    return (
      <div style={{
        gridArea: 'left',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 8,
      }}>
        {onCollapse && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              type="button"
              onClick={onCollapse}
              title="Collapse sidebar"
              style={{
                padding: '4px 6px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              ◀
            </button>
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {sessions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              {sessions.map((s, i) => (
                <button key={s.id} onClick={() => switchSession(s.id)} style={{
                  padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer',
                  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>
                  Session {i + 1}
                </button>
              ))}
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              No sessions
            </span>
          )}
        </div>
        <SoundDock compact />
      </div>
    )
  }

  return (
    <div style={{
      gridArea: 'left',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* Session switcher */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Session
          </div>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              title="Collapse sidebar"
              style={{
                padding: '3px 6px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              ◀
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {sessions.map((s, i) => (
            <button key={s.id} onClick={() => switchSession(s.id)} style={{
              flex: 1, padding: '6px 0',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              background: activeSessionId === s.id ? 'var(--green-dim)' : 'var(--bg-raised)',
              border: `1px solid ${activeSessionId === s.id ? 'var(--green-mid)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: activeSessionId === s.id ? 'var(--green-bright)' : 'var(--text-muted)',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
              transition: 'var(--transition)'
            }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Scene list */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0, maxHeight: '40%', overflow: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Scenes
        </div>
        {(session?.scenes || []).map((scene, i) => (
          <button key={scene.id} onClick={() => jumpToScene(i)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '5px 8px', borderRadius: 'var(--radius)',
            background: currentSceneIndex === i ? 'var(--bg-hover)' : 'transparent',
            color: currentSceneIndex === i ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 12, fontFamily: 'var(--font-body)',
            borderLeft: currentSceneIndex === i ? '2px solid var(--green-bright)' : '2px solid transparent',
            marginBottom: 2, transition: 'var(--transition)'
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginRight: 5 }}>
              {i + 1}
            </span>
            {scene.title}
          </button>
        ))}
      </div>

      {/* Beat list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 8px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Beats — {session?.scenes?.[currentSceneIndex]?.title}
        </div>
        {session?.scenes?.[currentSceneIndex]?.beats.map((beat, i) => {
          const isActive = currentBeatIndex === i
          const isDone = completedBeats.has(beat.id)
          return (
            <button key={beat.id} onClick={() => jumpToBeat(i)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              width: '100%', textAlign: 'left', padding: '5px 8px',
              borderRadius: 'var(--radius)',
              background: isActive ? 'var(--green-glow)' : 'transparent',
              color: isDone ? 'var(--text-muted)' : isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 12, fontFamily: 'var(--font-body)',
              marginBottom: 2, transition: 'var(--transition)',
              textDecoration: isDone ? 'line-through' : 'none'
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: BEAT_TYPE_COLOURS[beat.type] || 'var(--text-muted)',
                flexShrink: 0, marginTop: 5
              }} />
              {beat.title}
            </button>
          )
        })}

        {/* Branch options for scenes with branching */}
        {session?.scenes?.[currentSceneIndex]?.branches && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              ⤵ Branch
            </div>
            {session.scenes[currentSceneIndex].branches.map((branch) => (
              <button key={branch.targetId} onClick={() => jumpToSceneById(branch.targetId)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 8px', marginBottom: 5,
                background: 'rgba(196,160,64,0.07)',
                border: '1px solid rgba(196,160,64,0.3)',
                borderRadius: 'var(--radius)',
                color: 'var(--warning)',
                fontSize: 11, fontFamily: 'var(--font-body)',
                cursor: 'pointer'
              }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{branch.label}</div>
                {branch.description && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{branch.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <SoundDock compact />
    </div>
  )
}
