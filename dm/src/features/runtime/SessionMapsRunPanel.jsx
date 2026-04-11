import React, { useState, useMemo } from 'react'
import { useSessionStore } from '../../stores/sessionStore.js'
import { getSessionMapPublicUrl } from '@shared/lib/sessionMapStorage.js'

function normalizeMaps(session) {
  const raw = session?.session_maps
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((m) => m && (m.videoUrl || m.video_url))
  return []
}

/**
 * Lazy-mounted video: only renders &lt;video&gt; when a map is selected.
 */
export default function SessionMapsRunPanel() {
  const session = useSessionStore((s) => s.session)
  const maps = useMemo(() => normalizeMaps(session), [session])
  const [idx, setIdx] = useState(0)
  const [loop, setLoop] = useState(true)
  const [playing, setPlaying] = useState(false)

  if (!maps.length) {
    return (
      <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
        No session maps uploaded. Add MP4 maps in Builder → Session → Maps (save session after upload).
      </div>
    )
  }

  const current = maps[Math.min(idx, maps.length - 1)]
  const videoUrl = getSessionMapPublicUrl(current.videoUrl || current.video_url)

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Session maps
      </div>
      <select
        value={idx}
        onChange={(e) => {
          setIdx(Number(e.target.value))
          setPlaying(false)
        }}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-primary)',
          fontSize: 12,
        }}
      >
        {maps.map((m, i) => (
          <option key={m.id || i} value={i}>{m.name || `Map ${i + 1}`}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          style={{
            padding: '6px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            background: 'var(--green-dim)',
            border: '1px solid var(--green-mid)',
            borderRadius: 'var(--radius)',
            color: 'var(--green-bright)',
            cursor: 'pointer',
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
      </div>
      {videoUrl && playing && (
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          playsInline
          loop={loop}
          preload="metadata"
          style={{
            width: '100%',
            maxHeight: 220,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: '#000',
          }}
          autoPlay
        />
      )}
      {videoUrl && !playing && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Press Play to load video (saves memory when idle).
        </div>
      )}
    </div>
  )
}
