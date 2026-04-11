import React from 'react'

export default function SfxTriggerGrid({
  items = [],
  onTrigger,
  onLoop,
  onStopLooped,
  activeLoopedSfxIds = [],
  onFav,
  favouriteIds = [],
  selectedPlaylistId = null,
  playlistMap = new Map(),
}) {
  const visible = selectedPlaylistId
    ? (playlistMap.get(selectedPlaylistId) || [])
    : items
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {visible.map((asset) => {
        const isLooped = activeLoopedSfxIds.includes(asset.id)
        const fav = favouriteIds.includes(asset.id)
        return (
          <div
            key={asset.id}
            style={{
              padding: 6,
              borderRadius: 'var(--radius)',
              border: `1px solid ${isLooped ? 'var(--green-mid)' : 'var(--border)'}`,
              background: isLooped ? 'var(--green-glow)' : 'var(--bg-raised)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{asset.name}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => onTrigger(asset)} style={btn}>Play</button>
              <button
                type="button"
                onClick={() => (isLooped ? onStopLooped(asset.id) : onLoop(asset))}
                style={btn}
              >
                {isLooped ? 'Stop' : 'Loop'}
              </button>
              <button type="button" onClick={() => onFav(asset.id)} style={btn} title="Toggle favorite">
                {fav ? '★' : '☆'}
              </button>
            </div>
          </div>
        )
      })}
      {visible.length === 0 && (
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-muted)' }}>No SFX in this list.</div>
      )}
    </div>
  )
}

const btn = {
  padding: '2px 6px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}
