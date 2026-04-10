import React, { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../stores/playerStore'

const SESSION_ERROR_COPY = {
  no_active_session: 'The DM has not set a live session yet. Scene text will appear once they select a session in the DM console. If the DM is in seedless mode, they must load a campaign before sessions exist.',
  session_not_found: 'The live session ID from the server could not be loaded. Ask the DM to re-select the session or confirm the campaign was loaded successfully.',
  incomplete_narrative: 'This session has no player-facing scenes in the database yet.',
  load_failed: 'Could not load session content from the server. Check your connection and try again.',
}

const BEAT_TONE = {
  combat:      { label: 'Combat',      accent: 'var(--danger)',      bg: 'rgba(176,48,48,0.08)',  border: 'rgba(176,48,48,0.25)' },
  encounter:   { label: 'Encounter',   accent: 'var(--danger)',      bg: 'rgba(176,48,48,0.08)',  border: 'rgba(176,48,48,0.25)' },
  exploration: { label: 'Exploration', accent: '#60906a',            bg: 'rgba(96,144,106,0.07)', border: 'rgba(96,144,106,0.20)' },
  narrative:   { label: 'Narrative',   accent: 'var(--text-secondary)', bg: 'rgba(122,128,112,0.06)', border: 'var(--border)' },
  social:      { label: 'Social',      accent: '#6090b0',            bg: 'rgba(96,144,176,0.07)', border: 'rgba(96,144,176,0.20)' },
  puzzle:      { label: 'Puzzle',      accent: '#9a7ab0',            bg: 'rgba(154,122,176,0.08)', border: 'rgba(154,122,176,0.22)' },
  rest:        { label: 'Rest',        accent: 'var(--warning)',     bg: 'rgba(176,144,48,0.06)', border: 'rgba(176,144,48,0.18)' },
}

function getBeatTone(type) {
  if (!type) return BEAT_TONE.narrative
  return BEAT_TONE[type.toLowerCase()] || BEAT_TONE.narrative
}

export default function SceneDisplay() {
  const session = usePlayerStore(s => s.session)
  const sessionHydrationError = usePlayerStore(s => s.sessionHydrationError)
  const sessionHydrationDetail = usePlayerStore(s => s.sessionHydrationDetail)
  const currentSceneIndex = usePlayerStore(s => s.currentSceneIndex)
  const currentBeatIndex = usePlayerStore(s => s.currentBeatIndex)
  const prevSceneRef = useRef(currentSceneIndex)
  const [transitioning, setTransitioning] = useState(false)

  const scene = session?.scenes?.[currentSceneIndex]
  const beats = scene?.beats || []
  const currentBeat = beats[currentBeatIndex]
  const sceneChanged = prevSceneRef.current !== currentSceneIndex

  useEffect(() => {
    if (sceneChanged) {
      setTransitioning(true)
      const t = setTimeout(() => setTransitioning(false), 500)
      prevSceneRef.current = currentSceneIndex
      return () => clearTimeout(t)
    }
  }, [currentSceneIndex, sceneChanged])

  if (sessionHydrationError && !session) {
    return (
      <div className="scene-card scene-card--error">
        <div className="scene-label scene-label--warning">Session unavailable</div>
        <p className="scene-error-text">
          {SESSION_ERROR_COPY[sessionHydrationError] || SESSION_ERROR_COPY.load_failed}
        </p>
        {import.meta.env.DEV && sessionHydrationDetail && (
          <pre className="scene-debug">{String(sessionHydrationDetail)}</pre>
        )}
      </div>
    )
  }

  if (!scene) return null

  const totalScenes = session.scenes.length
  const progressPct = ((currentSceneIndex + 1) / totalScenes) * 100
  const tone = getBeatTone(currentBeat?.type)

  return (
    <div className={`scene-card ${transitioning ? 'scene-card--entering' : ''}`}>
      {/* Decorative top glow */}
      <div className="scene-glow" />

      {/* Session + scene header */}
      <div className="scene-header">
        <span className="scene-label">
          {session.title || 'Session'}
        </span>
        <span className="scene-label">
          Scene {currentSceneIndex + 1} of {totalScenes}
        </span>
      </div>

      {/* Scene title */}
      <h2 className="scene-title">{scene.title}</h2>

      {/* Scene description (player-safe subtitle) */}
      {scene.subtitle && (
        <div className="scene-description">{scene.subtitle}</div>
      )}

      {/* Current beat */}
      {currentBeat && (currentBeat.title || currentBeat.playerText) && (
        <div
          className="scene-beat"
          style={{ background: tone.bg, borderColor: tone.border }}
        >
          <div className="scene-beat__header">
            <span
              className="scene-beat__type"
              style={{ color: tone.accent }}
            >
              {tone.label}
            </span>
            {currentBeat.title && (
              <span className="scene-beat__title">{currentBeat.title}</span>
            )}
          </div>
          {currentBeat.playerText && (
            <div className="scene-beat__text">{currentBeat.playerText}</div>
          )}
        </div>
      )}

      {/* Scene progress */}
      <div className="scene-progress">
        <div className="scene-progress__track">
          <div
            className="scene-progress__fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="scene-progress__markers">
          {session.scenes.map((_, i) => (
            <div
              key={i}
              className={`scene-progress__dot ${i <= currentSceneIndex ? 'scene-progress__dot--reached' : ''} ${i === currentSceneIndex ? 'scene-progress__dot--active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
