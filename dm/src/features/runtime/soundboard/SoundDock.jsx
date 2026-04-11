import React, { useEffect, useMemo, useRef } from 'react'
import { useCampaignStore } from '../../../stores/campaignStore'
import { useAudioStore } from '../../../stores/audioStore'
import { useSessionStore } from '../../../stores/sessionStore'
import { getAudioPublicUrl } from '@shared/lib/audioStorage.js'
import { pushToast } from '../../../stores/toastStore.js'
import SoundDockCollapsed from './SoundDockCollapsed.jsx'
import SoundDockExpanded from './SoundDockExpanded.jsx'

export default function SoundDock({ compact = false, showAssociations = true }) {
  const campaign = useCampaignStore((s) => s.campaign)
  const assetsRaw = useCampaignStore((s) => s.audioAssets || [])
  const playlists = useCampaignStore((s) => s.audioPlaylists || [])
  const playlistItems = useCampaignStore((s) => s.audioPlaylistItems || [])
  const saveAudioAsset = useCampaignStore((s) => s.saveAudioAsset)
  const deleteAudioAsset = useCampaignStore((s) => s.deleteAudioAsset)
  const saveAudioPlaylist = useCampaignStore((s) => s.saveAudioPlaylist)
  const deleteAudioPlaylist = useCampaignStore((s) => s.deleteAudioPlaylist)
  const duplicateAudioPlaylist = useCampaignStore((s) => s.duplicateAudioPlaylist)
  const setAudioPlaylistItems = useCampaignStore((s) => s.setAudioPlaylistItems)
  const saveScene = useCampaignStore((s) => s.saveScene)
  const saveEncounter = useCampaignStore((s) => s.saveEncounter)
  const encounters = useCampaignStore((s) => s.encounters || [])

  const session = useSessionStore((s) => s.session)
  const currentSceneIndex = useSessionStore((s) => s.currentSceneIndex)
  const currentBeatIndex = useSessionStore((s) => s.currentBeatIndex)
  const currentScene = session?.scenes?.[currentSceneIndex] || null
  const currentBeat = currentScene?.beats?.[currentBeatIndex] || null

  const {
    masterVolume,
    backgroundVolume,
    sfxVolume,
    muted,
    dockExpanded,
    selectedTab,
    selectedBackgroundPlaylistId,
    selectedSfxPlaylistId,
    currentBackgroundTrackId,
    backgroundIsPlaying,
    backgroundLoop,
    backgroundPositionSec,
    backgroundDurationSec,
    crossfadeMs,
    soundDockEncounterTargetId,
    activeLoopedSfxIds,
    recentAssetIds,
    favouriteAssetIds,
    hydrateEngine,
    setDockExpanded,
    setSelectedTab,
    setSelectedBackgroundPlaylistId,
    setSelectedSfxPlaylistId,
    setMasterVolume,
    setBackgroundVolume,
    setSfxVolume,
    setMuted,
    toggleFavourite,
    refreshBackgroundState,
    playBackground,
    pauseBackground,
    stopBackground,
    resumeBackground,
    seekBackground,
    setBackgroundLoop,
    setCrossfadeMs,
    setSoundDockEncounterTargetId,
    triggerSfx,
    stopLoopedSfx,
    stopAllSfx,
    panicMuteAll,
  } = useAudioStore()

  const assets = useMemo(
    () => (assetsRaw || []).map((a) => ({
      ...a,
      url: getAudioPublicUrl(a.storage_path),
    })),
    [assetsRaw]
  )
  const assetById = useMemo(() => {
    const map = new Map()
    assets.forEach((a) => map.set(a.id, a))
    return map
  }, [assets])
  const backgroundAssets = useMemo(() => assets.filter((a) => a.type === 'background'), [assets])
  const sfxAssets = useMemo(() => assets.filter((a) => a.type !== 'background'), [assets])

  const playlistAssetMap = useMemo(() => {
    const grouped = new Map()
    ;(playlistItems || []).forEach((it) => {
      if (!grouped.has(it.playlist_id)) grouped.set(it.playlist_id, [])
      const asset = assetById.get(it.asset_id)
      if (asset) grouped.get(it.playlist_id).push({ ...asset, _position: it.position || 0 })
    })
    for (const [key, list] of grouped.entries()) {
      grouped.set(key, [...list].sort((a, b) => (a._position || 0) - (b._position || 0)))
    }
    return grouped
  }, [playlistItems, assetById])

  const currentBackground = currentBackgroundTrackId ? assetById.get(currentBackgroundTrackId) : null
  const recentAssets = recentAssetIds.map((id) => assetById.get(id)).filter(Boolean)
  const favouriteAssets = favouriteAssetIds.map((id) => assetById.get(id)).filter(Boolean)

  useEffect(() => {
    hydrateEngine()
  }, [])

  useEffect(() => {
    if (!backgroundIsPlaying) return
    const t = setInterval(() => refreshBackgroundState(), 1000)
    return () => clearInterval(t)
  }, [backgroundIsPlaying])

  useEffect(() => {
    const handler = (e) => {
      if (!dockExpanded) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1 || n > 9) return
      const target = favouriteAssets[n - 1]
      if (!target) return
      if (target.type === 'background') playBackground(target, { loop: backgroundLoop })
      else triggerSfx(target, { loop: false })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dockExpanded, favouriteAssets, backgroundLoop, playBackground, triggerSfx])

  const linkedEncounter = currentBeat?.encounter_id
    ? encounters.find((e) => e.id === currentBeat.encounter_id)
    : null

  const prefilledEncounterRef = useRef(false)
  useEffect(() => {
    if (prefilledEncounterRef.current) return
    if (soundDockEncounterTargetId) {
      prefilledEncounterRef.current = true
      return
    }
    if (linkedEncounter?.id) {
      setSoundDockEncounterTargetId(linkedEncounter.id)
      prefilledEncounterRef.current = true
    }
  }, [soundDockEncounterTargetId, linkedEncounter?.id, setSoundDockEncounterTargetId])

  const suggested = currentScene
    ? {
        bgPlaylistId: currentScene.default_background_playlist_id || null,
        bgAssetId: currentScene.default_background_asset_id || null,
        sfxPlaylistId: currentScene.default_sfx_playlist_id || null,
      }
    : { bgPlaylistId: null, bgAssetId: null, sfxPlaylistId: null }

  const applySceneSuggestions = async () => {
    if (suggested.bgPlaylistId) setSelectedBackgroundPlaylistId(suggested.bgPlaylistId)
    if (suggested.sfxPlaylistId) setSelectedSfxPlaylistId(suggested.sfxPlaylistId)
    if (suggested.bgAssetId) {
      const bg = assetById.get(suggested.bgAssetId)
      if (bg) await playBackground(bg, { loop: backgroundLoop })
    }
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: compact ? '6px 8px' : '8px 10px',
      background: 'var(--bg-card)',
      flexShrink: 0,
      maxHeight: dockExpanded ? (compact ? '52vh' : '48vh') : 'none',
      overflow: dockExpanded ? 'auto' : 'hidden',
    }}
    >
      {!dockExpanded ? (
        <SoundDockCollapsed
          onExpand={() => setDockExpanded(true)}
          currentBackgroundName={currentBackground?.name}
          muted={muted}
          setMuted={setMuted}
          stopBackground={stopBackground}
          activeLoopedSfxCount={activeLoopedSfxIds.length}
        />
      ) : (
        <SoundDockExpanded
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          onCollapse={() => setDockExpanded(false)}
          masterVolume={masterVolume}
          backgroundVolume={backgroundVolume}
          sfxVolume={sfxVolume}
          setMasterVolume={setMasterVolume}
          setBackgroundVolume={setBackgroundVolume}
          setSfxVolume={setSfxVolume}
          backgroundAsset={currentBackground}
          backgroundIsPlaying={backgroundIsPlaying}
          backgroundLoop={backgroundLoop}
          backgroundPositionSec={backgroundPositionSec}
          backgroundDurationSec={backgroundDurationSec}
          crossfadeMs={crossfadeMs}
          setCrossfadeMs={setCrossfadeMs}
          pauseBackground={pauseBackground}
          stopBackground={stopBackground}
          resumeBackground={resumeBackground}
          setBackgroundLoop={setBackgroundLoop}
          seekBackground={seekBackground}
          panicMuteAll={panicMuteAll}
          stopAllSfx={stopAllSfx}
          activeLoopedSfxIds={activeLoopedSfxIds}
          favouriteAssets={favouriteAssets}
          recentAssets={recentAssets}
          triggerSfx={triggerSfx}
          playBackground={playBackground}
          backgroundAssets={backgroundAssets}
          sfxAssets={sfxAssets}
          currentBackgroundTrackId={currentBackgroundTrackId}
          toggleFavourite={toggleFavourite}
          favouriteAssetIds={favouriteAssetIds}
          selectedBackgroundPlaylistId={selectedBackgroundPlaylistId}
          selectedSfxPlaylistId={selectedSfxPlaylistId}
          playlistMap={playlistAssetMap}
          playlistAssetMap={playlistAssetMap}
          stopLoopedSfx={stopLoopedSfx}
          playlists={playlists}
          playlistItems={playlistItems}
          setSelectedBackgroundPlaylistId={setSelectedBackgroundPlaylistId}
          setSelectedSfxPlaylistId={setSelectedSfxPlaylistId}
          saveAudioPlaylist={saveAudioPlaylist}
          deleteAudioPlaylist={deleteAudioPlaylist}
          duplicateAudioPlaylist={duplicateAudioPlaylist}
          setAudioPlaylistItems={setAudioPlaylistItems}
          campaignId={campaign?.id}
          saveAudioAsset={saveAudioAsset}
          deleteAudioAsset={deleteAudioAsset}
        />
      )}
      {showAssociations && dockExpanded && currentScene && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Scene audio hooks
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <button type="button" style={tinyBtn} onClick={applySceneSuggestions}>Load Suggested</button>
            <button
              type="button"
              style={tinyBtn}
              onClick={async () => {
                const res = await saveScene({
                  id: currentScene.id,
                  default_background_asset_id: currentBackgroundTrackId || null,
                  default_background_playlist_id: selectedBackgroundPlaylistId || null,
                  default_sfx_playlist_id: selectedSfxPlaylistId || null,
                })
                if (res?.error) pushToast(res.error, 'error')
                else pushToast('Scene defaults saved.', 'ok')
              }}
            >
              Save Scene Defaults
            </button>
            <button
              type="button"
              style={tinyBtn}
              onClick={async () => {
                const targetId = soundDockEncounterTargetId
                if (!targetId) {
                  pushToast('Choose an encounter before saving defaults.', 'error')
                  return
                }
                const target = encounters.find((e) => e.id === targetId)
                if (!target) {
                  pushToast('Selected encounter not found.', 'error')
                  return
                }
                const res = await saveEncounter({
                  ...target,
                  default_background_asset_id: currentBackgroundTrackId || null,
                  default_background_playlist_id: selectedBackgroundPlaylistId || null,
                  default_sfx_playlist_id: selectedSfxPlaylistId || null,
                })
                if (res?.error) pushToast(res.error, 'error')
                else pushToast(`Encounter defaults saved: ${target.title || targetId}.`, 'ok')
              }}
              title="Save defaults to the encounter selected below"
            >
              Save Encounter Defaults
            </button>
          </div>
          {linkedEncounter && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>
              Beat links: {linkedEncounter.title || linkedEncounter.id}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Encounter for defaults
            </label>
            <select
              value={soundDockEncounterTargetId || ''}
              onChange={(e) => setSoundDockEncounterTargetId(e.target.value || null)}
              style={select}
            >
              <option value="">Select encounter…</option>
              {encounters.map((e) => (
                <option key={e.id} value={e.id}>{e.title || e.id}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedBackgroundPlaylistId || ''}
              onChange={(e) => setSelectedBackgroundPlaylistId(e.target.value || null)}
              style={select}
            >
              <option value="">BG Playlist...</option>
              {playlists.filter((p) => p.type === 'background').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={selectedSfxPlaylistId || ''}
              onChange={(e) => setSelectedSfxPlaylistId(e.target.value || null)}
              style={select}
            >
              <option value="">SFX Bank...</option>
              {playlists.filter((p) => p.type === 'sfx').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      {dockExpanded && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
            Tip: keys 1-9 trigger favorite sounds while dock is open.
          </div>
        </div>
      )}
    </div>
  )
}

const tinyBtn = {
  padding: '3px 8px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  cursor: 'pointer',
}

const select = {
  width: '100%',
  padding: '4px 6px',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)',
  fontSize: 11,
}
