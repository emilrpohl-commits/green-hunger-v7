import React, { useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'

const SESSION_ERROR_COPY = {
  no_active_session: 'The DM has not set a live session yet. Scene text will appear once they select a session in the DM console.',
  session_not_found: 'The live session ID from the server could not be loaded. Ask the DM to re-select the session.',
  incomplete_narrative: 'This session has no player-facing scenes in the database yet.',
  load_failed: 'Could not load session content from the server. Check your connection and try again.',
}

export default function SceneDisplay() {
  const session = usePlayerStore(s => s.session)
  const sessionHydrationError = usePlayerStore(s => s.sessionHydrationError)
  const sessionHydrationDetail = usePlayerStore(s => s.sessionHydrationDetail)
  const currentSceneIndex = usePlayerStore(s => s.currentSceneIndex)
  const currentBeatIndex = usePlayerStore(s => s.currentBeatIndex)
  const prevIndexRef = useRef(currentSceneIndex)

  const scene = session?.scenes?.[currentSceneIndex]
  const beats = scene?.beats || []
  const currentBeat = beats[currentBeatIndex]
  const changed = prevIndexRef.current !== currentSceneIndex

  useEffect(() => {
    prevIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  if (sessionHydrationError && !session) {
    return (
      <div
        className="gh-scene-display w-full max-w-3xl mx-auto px-4 py-5 md:px-8 md:py-6"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: '2px solid rgba(196,160,64,0.5)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Session unavailable
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {SESSION_ERROR_COPY[sessionHydrationError] || SESSION_ERROR_COPY.load_failed}
        </p>
        {import.meta.env.DEV && sessionHydrationDetail && (
          <pre style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
            {String(sessionHydrationDetail)}
          </pre>
        )}
      </div>
    )
  }

  if (!scene) return null

  return (
    <div
      className="gh-scene-display w-full max-w-3xl mx-auto px-4 py-5 md:px-8 md:py-6"
      style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: '2px solid var(--green-dim)',
      borderRadius: 'var(--radius-lg)',
      animation: changed ? 'fadeIn 0.4s ease' : 'none'
    }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Session label */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 10
      }}>
        {session.title || 'Session'} · Scene {currentSceneIndex + 1} of {session.scenes.length}
      </div>

      {/* Scene title */}
      <h2 style={{
        fontSize: 22,
        color: 'var(--text-primary)',
        letterSpacing: '0.06em',
        marginBottom: 6
      }}>
        {scene.title}
      </h2>

      {/* Scene subtitle / player-safe description */}
      <div style={{
        fontSize: 15,
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        lineHeight: 1.5
      }}>
        {scene.subtitle}
      </div>

      {/* Current beat (Phase 2F): title + player_text only */}
      {currentBeat && (currentBeat.title || currentBeat.playerText) && (
        <div style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            Current beat{currentBeat.type ? ` · ${currentBeat.type}` : ''}
          </div>
          {currentBeat.title && (
            <div style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 6, fontWeight: 600 }}>
              {currentBeat.title}
            </div>
          )}
          {currentBeat.playerText ? (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {currentBeat.playerText}
            </div>
          ) : null}
        </div>
      )}

      {/* Scene progress bar */}
      <div style={{
        marginTop: 16,
        height: 2,
        background: 'var(--border)',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${((currentSceneIndex + 1) / session.scenes.length) * 100}%`,
          background: 'var(--green-mid)',
          borderRadius: 1,
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  )
}
