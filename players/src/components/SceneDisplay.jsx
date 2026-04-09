import React, { useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'

export default function SceneDisplay() {
  const session = usePlayerStore(s => s.session)
  const currentSceneIndex = usePlayerStore(s => s.currentSceneIndex)
  const prevIndexRef = useRef(currentSceneIndex)

  const scene = session.scenes[currentSceneIndex]
  const changed = prevIndexRef.current !== currentSceneIndex

  useEffect(() => {
    prevIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  if (!scene) return null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: '2px solid var(--green-dim)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      animation: changed ? 'fadeIn 0.4s ease' : 'none'
    }}>
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
        Session One · Scene {currentSceneIndex + 1} of {session.scenes.length}
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

      {/* Scene subtitle */}
      <div style={{
        fontSize: 15,
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        lineHeight: 1.5
      }}>
        {scene.subtitle}
      </div>

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
