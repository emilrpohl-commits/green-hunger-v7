import React, { useState } from 'react'
import { uploadSceneImageFile, getSceneMediaPublicUrl } from '@shared/lib/sceneMediaStorage.js'
import { useCampaignStore } from '../stores/campaignStore.js'

/**
 * Primary cover + optional extra URLs (future gallery). Cover stored as image_url on scene.
 */
export default function SceneMediaUploader({ sceneId, imageUrl, sceneImages = [], onChangeCover, onChangeGallery, labelStyle, inputStyle }) {
  const campaign = useCampaignStore((s) => s.campaign)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const resolved = imageUrl ? getSceneMediaPublicUrl(imageUrl) : null

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !campaign?.id || !sceneId) return
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!ok) {
      setErr('Use JPG, PNG, or WEBP')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const { storagePath } = await uploadSceneImageFile({
        file,
        campaignId: campaign.id,
        sceneId,
      })
      onChangeCover?.(storagePath)
    } catch (er) {
      setErr(String(er?.message || er))
    }
    setBusy(false)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={labelStyle}>Scene cover image</div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Shown in Run mode behind beat content (dark overlay). JPG / PNG / WEBP, Supabase Storage.
      </p>
      {resolved && (
        <div style={{ marginBottom: 10, position: 'relative', maxWidth: 320, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img src={resolved} alt="" style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label style={{
          padding: '8px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--green-mid)',
          background: 'var(--green-dim)',
          color: 'var(--green-bright)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
        >
          {busy ? 'Uploading…' : 'Upload cover'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} disabled={busy || !sceneId} />
        </label>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onChangeCover?.('')}
            style={{ ...inputStyle, padding: '8px 12px', width: 'auto', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 11 }}
          >
            Clear cover
          </button>
        )}
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)' }}>{err}</div>}
      {Array.isArray(sceneImages) && sceneImages.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {sceneImages.length} extra image(s) in data — gallery UI can expand later.
        </div>
      )}
      {onChangeGallery && !sceneImages?.length && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          Optional <code style={{ fontSize: 10 }}>scene_images</code> JSON array is supported in the database for future multi-image scenes.
        </div>
      )}
    </div>
  )
}
