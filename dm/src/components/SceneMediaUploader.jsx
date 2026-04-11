import React, { useRef, useState } from 'react'
import { uploadSceneImageFile, uploadBeatImageFile, getSceneMediaPublicUrl } from '@shared/lib/sceneMediaStorage.js'
import { useCampaignStore } from '../stores/campaignStore.js'

/**
 * Primary cover + optional extra URLs (future gallery). Cover stored as image_url on scene.
 */
export default function SceneMediaUploader({ sceneId, imageUrl, sceneImages = [], onChangeCover, onChangeGallery, labelStyle, inputStyle }) {
  const campaign = useCampaignStore((s) => s.campaign)
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const resolved = imageUrl ? getSceneMediaPublicUrl(imageUrl) : null
  const canUpload = !!(campaign?.id && sceneId)

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!canUpload) {
      setErr(!campaign?.id ? 'Load a campaign first, then open this scene again.' : 'Scene id missing — save the scene or reload.')
      return
    }
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
      {!canUpload && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {!campaign?.id
            ? 'Choose or load a campaign in the builder before uploading scene images.'
            : 'This scene has no id yet — save the session or reload after migration.'}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onChange={onPick}
        disabled={busy}
        aria-hidden
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{
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
          {busy ? 'Uploading…' : 'Choose image file'}
        </button>
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

/** Optional beat illustration (stored as illustration_url on beat row). */
export function BeatIllustrationUploader({ sceneId, beatId, illustrationUrl, onChange, labelStyle, inputStyle }) {
  const campaign = useCampaignStore((s) => s.campaign)
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const resolved = illustrationUrl ? getSceneMediaPublicUrl(illustrationUrl) : null
  const canUpload = !!(campaign?.id && sceneId && beatId)

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!canUpload) {
      setErr(!beatId ? 'Save the beat once, then upload an illustration.' : !campaign?.id ? 'Load a campaign first.' : 'Scene id missing.')
      return
    }
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!ok) {
      setErr('Use JPG, PNG, or WEBP')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const { storagePath } = await uploadBeatImageFile({
        file,
        campaignId: campaign.id,
        sceneId,
        beatId,
      })
      onChange?.(storagePath)
    } catch (er) {
      setErr(String(er?.message || er))
    }
    setBusy(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>Beat illustration (optional)</div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        JPG / PNG / WEBP in the same storage bucket as scene covers. Save the beat after upload.
      </p>
      {resolved && (
        <div style={{ marginBottom: 10, position: 'relative', maxWidth: 280, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img src={resolved} alt="" style={{ width: '100%', display: 'block', maxHeight: 120, objectFit: 'cover' }} />
        </div>
      )}
      {!canUpload && beatId && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {!campaign?.id ? 'Choose or load a campaign before uploading.' : 'Scene id missing — reload the editor.'}
        </div>
      )}
      {!beatId && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Save this beat once so it has an id, then you can attach an illustration.
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onChange={onPick}
        disabled={busy}
        aria-hidden
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{
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
          {busy ? 'Uploading…' : 'Choose beat image'}
        </button>
        {illustrationUrl && (
          <button
            type="button"
            onClick={() => onChange?.('')}
            style={{ ...inputStyle, padding: '8px 12px', width: 'auto', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 11 }}
          >
            Clear image
          </button>
        )}
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)' }}>{err}</div>}
    </div>
  )
}
