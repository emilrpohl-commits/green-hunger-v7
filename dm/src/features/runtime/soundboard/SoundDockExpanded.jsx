import React from 'react'
import AudioNowPlaying from './AudioNowPlaying.jsx'
import BackgroundTrackList from './BackgroundTrackList.jsx'
import SfxTriggerGrid from './SfxTriggerGrid.jsx'
import PlaylistManager from './PlaylistManager.jsx'
import AudioUploadPanel from './AudioUploadPanel.jsx'
import VolumeControls from './VolumeControls.jsx'
import RecentSounds from './RecentSounds.jsx'
import FavouriteSounds from './FavouriteSounds.jsx'
import { useState } from 'react'

const TABS = [
  { id: 'now', label: 'Now' },
  { id: 'background', label: 'Background' },
  { id: 'sfx', label: 'SFX' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'library', label: 'Library' },
]

export default function SoundDockExpanded(props) {
  const {
    selectedTab,
    setSelectedTab,
    onCollapse,
  } = props

  const [editingAssetId, setEditingAssetId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftTags, setDraftTags] = useState('')
  const [draftType, setDraftType] = useState('sfx')

  const beginEdit = (asset) => {
    setEditingAssetId(asset.id)
    setDraftName(asset.name || '')
    setDraftTags(Array.isArray(asset.tags) ? asset.tags.join(', ') : '')
    setDraftType(asset.type === 'background' ? 'background' : 'sfx')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green-bright)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sound Dock
        </div>
        <button type="button" onClick={onCollapse} style={btn}>Collapse</button>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id)}
            style={{
              ...btn,
              background: selectedTab === tab.id ? 'var(--green-dim)' : 'transparent',
              border: `1px solid ${selectedTab === tab.id ? 'var(--green-mid)' : 'var(--border)'}`,
              color: selectedTab === tab.id ? 'var(--green-bright)' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <VolumeControls
        masterVolume={props.masterVolume}
        backgroundVolume={props.backgroundVolume}
        sfxVolume={props.sfxVolume}
        setMasterVolume={props.setMasterVolume}
        setBackgroundVolume={props.setBackgroundVolume}
        setSfxVolume={props.setSfxVolume}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Crossfade (ms)
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={50}
          value={Number(props.crossfadeMs) || 0}
          onChange={(e) => props.setCrossfadeMs?.(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
          {Number(props.crossfadeMs) || 0} ms
        </div>
      </div>

      {selectedTab === 'now' && (
        <>
          <AudioNowPlaying {...props} />
          <FavouriteSounds
            items={props.favouriteAssets}
            onTrigger={(asset) => props.triggerSfx(asset, { loop: false })}
          />
          <RecentSounds
            items={props.recentAssets}
            onTrigger={(asset) => asset.type === 'background'
              ? props.playBackground(asset)
              : props.triggerSfx(asset, { loop: false })}
          />
        </>
      )}

      {selectedTab === 'background' && (
        <BackgroundTrackList
          items={props.backgroundAssets}
          currentBackgroundTrackId={props.currentBackgroundTrackId}
          onPlay={props.playBackground}
          onFav={props.toggleFavourite}
          favouriteIds={props.favouriteAssetIds}
          selectedPlaylistId={props.selectedBackgroundPlaylistId}
          playlistMap={props.playlistAssetMap}
        />
      )}

      {selectedTab === 'sfx' && (
        <SfxTriggerGrid
          items={props.sfxAssets}
          onTrigger={(asset) => props.triggerSfx(asset, { loop: false })}
          onLoop={(asset) => props.triggerSfx(asset, { loop: true })}
          onStopLooped={props.stopLoopedSfx}
          activeLoopedSfxIds={props.activeLoopedSfxIds}
          onFav={props.toggleFavourite}
          favouriteIds={props.favouriteAssetIds}
          selectedPlaylistId={props.selectedSfxPlaylistId}
          playlistMap={props.playlistAssetMap}
        />
      )}

      {selectedTab === 'playlists' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <PlaylistManager
            type="background"
            assets={props.backgroundAssets}
            playlists={props.playlists}
            playlistItems={props.playlistItems}
            selectedPlaylistId={props.selectedBackgroundPlaylistId}
            onSelectPlaylist={props.setSelectedBackgroundPlaylistId}
            onSavePlaylist={props.saveAudioPlaylist}
            onDeletePlaylist={props.deleteAudioPlaylist}
            onDuplicatePlaylist={props.duplicateAudioPlaylist}
            onSetPlaylistItems={props.setAudioPlaylistItems}
          />
          <PlaylistManager
            type="sfx"
            assets={props.sfxAssets}
            playlists={props.playlists}
            playlistItems={props.playlistItems}
            selectedPlaylistId={props.selectedSfxPlaylistId}
            onSelectPlaylist={props.setSelectedSfxPlaylistId}
            onSavePlaylist={props.saveAudioPlaylist}
            onDeletePlaylist={props.deleteAudioPlaylist}
            onDuplicatePlaylist={props.duplicateAudioPlaylist}
            onSetPlaylistItems={props.setAudioPlaylistItems}
          />
        </div>
      )}

      {selectedTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AudioUploadPanel
            campaignId={props.campaignId}
            onSaveAsset={props.saveAudioAsset}
          />
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Library manager
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflow: 'auto' }}>
              {[...props.backgroundAssets, ...props.sfxAssets].map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    padding: 6,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-raised)',
                  }}
                >
                  {editingAssetId === asset.id ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <input value={draftName} onChange={(e) => setDraftName(e.target.value)} style={input} />
                      <input value={draftTags} onChange={(e) => setDraftTags(e.target.value)} style={input} />
                      <select value={draftType} onChange={(e) => setDraftType(e.target.value)} style={input}>
                        <option value="background">background</option>
                        <option value="sfx">sfx</option>
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          style={btn}
                          onClick={async () => {
                            await props.saveAudioAsset({
                              ...asset,
                              name: draftName,
                              tags: draftTags.split(',').map((t) => t.trim()).filter(Boolean),
                              type: draftType,
                            })
                            setEditingAssetId(null)
                          }}
                        >
                          Save
                        </button>
                        <button type="button" style={btn} onClick={() => setEditingAssetId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{asset.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                          {asset.type} {asset.tags?.length ? `· ${asset.tags.join(', ')}` : ''}
                        </div>
                      </div>
                      <button type="button" style={btn} onClick={() => beginEdit(asset)}>Edit</button>
                      <button type="button" style={{ ...btn, color: 'var(--danger)' }} onClick={() => props.deleteAudioAsset(asset.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
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

const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '5px 7px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-deep)',
  color: 'var(--text-primary)',
  fontSize: 11,
}
