import React, { useMemo, useState } from 'react'

export default function PlaylistManager({
  type = 'background',
  assets = [],
  playlists = [],
  playlistItems = [],
  selectedPlaylistId,
  onSelectPlaylist,
  onSavePlaylist,
  onDeletePlaylist,
  onDuplicatePlaylist,
  onSetPlaylistItems,
}) {
  const [newName, setNewName] = useState('')
  const [draggingId, setDraggingId] = useState(null)

  const filteredPlaylists = useMemo(
    () => playlists.filter((p) => p.type === type),
    [playlists, type]
  )
  const selectedPlaylist = filteredPlaylists.find((p) => p.id === selectedPlaylistId) || null

  const orderedIds = useMemo(() => {
    if (!selectedPlaylistId) return []
    return playlistItems
      .filter((it) => it.playlist_id === selectedPlaylistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((it) => it.asset_id)
  }, [playlistItems, selectedPlaylistId])

  const itemIdSet = useMemo(() => new Set(orderedIds), [orderedIds])

  const filteredAssets = assets.filter((a) => a.type === type)
  const assetById = useMemo(() => {
    const m = new Map()
    filteredAssets.forEach((a) => m.set(a.id, a))
    return m
  }, [filteredAssets])

  const orderedInPlaylist = useMemo(
    () => orderedIds.map((id) => assetById.get(id)).filter(Boolean),
    [orderedIds, assetById]
  )

  const libraryOnly = useMemo(
    () => filteredAssets.filter((a) => !itemIdSet.has(a.id)),
    [filteredAssets, itemIdSet]
  )

  const commitOrder = (nextIds) => {
    if (!selectedPlaylist?.id) return
    onSetPlaylistItems?.({
      playlistId: selectedPlaylist.id,
      assetIds: nextIds,
    })
  }

  const moveOrdered = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    const arr = [...orderedIds]
    if (fromIndex >= arr.length || toIndex > arr.length) return
    const [removed] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, removed)
    commitOrder(arr)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`New ${type} playlist`}
          style={input}
        />
        <button
          type="button"
          onClick={async () => {
            const res = await onSavePlaylist?.({ name: newName, type })
            if (!res?.error) {
              setNewName('')
              onSelectPlaylist?.(res?.data?.id || null)
            }
          }}
          style={btn}
        >
          Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredPlaylists.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 4,
              alignItems: 'center',
              padding: 4,
              borderRadius: 'var(--radius)',
              background: p.id === selectedPlaylistId ? 'var(--green-glow)' : 'var(--bg-raised)',
              border: `1px solid ${p.id === selectedPlaylistId ? 'var(--green-mid)' : 'var(--border)'}`,
            }}
          >
            <button type="button" onClick={() => onSelectPlaylist?.(p.id)} style={{ ...btn, textAlign: 'left' }}>
              {p.name}
            </button>
            <button type="button" onClick={() => onDuplicatePlaylist?.(p.id)} style={btn}>Copy</button>
            <button
              type="button"
              onClick={() => onDeletePlaylist?.(p.id)}
              style={{ ...btn, color: 'var(--danger)' }}
            >
              Del
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              {playlistItems.filter((it) => it.playlist_id === p.id).length}
            </span>
          </div>
        ))}
      </div>

      {selectedPlaylist && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Playlist order (drag or use arrows)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
            {orderedInPlaylist.map((asset, index) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => {
                  setDraggingId(asset.id)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', asset.id)
                }}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromId = e.dataTransfer.getData('text/plain') || draggingId
                  setDraggingId(null)
                  if (!fromId) return
                  const fromIndex = orderedIds.indexOf(fromId)
                  if (fromIndex < 0) return
                  moveOrdered(fromIndex, index)
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto auto',
                  gap: 6,
                  alignItems: 'center',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius)',
                  background: draggingId === asset.id ? 'var(--green-dim)' : 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'grab',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>⋮⋮</span>
                <span>{asset.name}</span>
                <button type="button" style={btn} onClick={() => moveOrdered(index, index - 1)} disabled={index === 0} title="Move up">
                  ↑
                </button>
                <button type="button" style={btn} onClick={() => moveOrdered(index, index + 1)} disabled={index >= orderedIds.length - 1} title="Move down">
                  ↓
                </button>
                <button
                  type="button"
                  style={{ ...btn, color: 'var(--danger)' }}
                  onClick={() => commitOrder(orderedIds.filter((id) => id !== asset.id))}
                  title="Remove from playlist"
                >
                  ×
                </button>
              </div>
            ))}
            {orderedInPlaylist.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty — add tracks below.</div>
            )}
          </div>

          {libraryOnly.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                Add to playlist
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflow: 'auto' }}>
                {libraryOnly.map((asset) => (
                  <label
                    key={asset.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 4px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: 11,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => {
                        commitOrder([...orderedIds, asset.id])
                      }}
                    />
                    {asset.name}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: 12,
}

const btn = {
  padding: '3px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}
