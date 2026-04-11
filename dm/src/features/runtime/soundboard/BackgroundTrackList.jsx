import React from 'react'

export default function BackgroundTrackList({
  items = [],
  currentBackgroundTrackId,
  onPlay,
  onFav,
  favouriteIds = [],
  selectedPlaylistId = null,
  playlistMap = new Map(),
}) {
  const visible = selectedPlaylistId
    ? (playlistMap.get(selectedPlaylistId) || [])
    : items
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visible.map((asset) => {
        const active = currentBackgroundTrackId === asset.id
        const fav = favouriteIds.includes(asset.id)
        return (
          <div
            key={asset.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 6,
              alignItems: 'center',
              padding: '4px 6px',
              borderRadius: 'var(--radius)',
              background: active ? 'var(--green-glow)' : 'var(--bg-raised)',
              border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
            }}
          >
            <div style={{ fontSize: 12, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{asset.name}</div>
            <button type="button" onClick={() => onPlay(asset)} style={btn}>
              {active ? 'Replay' : 'Play'}
            </button>
            <button type="button" onClick={() => onFav(asset.id)} style={btn} title="Toggle favorite">
              {fav ? '★' : '☆'}
            </button>
          </div>
        )
      })}
      {visible.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No background tracks yet.</div>
      )}
    </div>
  )
}

const btn = {
  padding: '2px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}
