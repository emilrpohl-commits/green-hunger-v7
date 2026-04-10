import React, { useMemo, useState } from 'react'
import {
  defaultPortraitCrop,
  getPortraitPublicUrl,
  normalizePortraitCrop,
  uploadPortraitFile,
} from '@shared/lib/portraitStorage.js'

export default function PortraitUploadField({
  label = 'Portrait',
  campaignId,
  entityType,
  entityId,
  storagePath,
  crop,
  legacyUrl,
  onChange,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const normalizedCrop = useMemo(() => normalizePortraitCrop(crop), [crop])
  const previewUrl = useMemo(
    () => getPortraitPublicUrl(storagePath) || legacyUrl || null,
    [storagePath, legacyUrl],
  )

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const updateCrop = (key, raw) => {
    const next = normalizePortraitCrop({ ...normalizedCrop, [key]: Number(raw) })
    onChange({
      storagePath: storagePath || null,
      crop: next,
      publicUrl: getPortraitPublicUrl(storagePath),
    })
  }

  const handleUpload = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { storagePath: nextPath, publicUrl } = await uploadPortraitFile({
        file,
        campaignId,
        entityType,
        entityId,
        variant: 'original',
      })
      onChange({
        storagePath: nextPath,
        crop: normalizedCrop || defaultPortraitCrop(),
        publicUrl,
      })
    } catch (e) {
      setError(String(e?.message || e))
    }
    setBusy(false)
  }

  const handleClear = () => {
    onChange({
      storagePath: null,
      crop: defaultPortraitCrop(),
      publicUrl: null,
    })
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <label
          style={{
            padding: '6px 12px',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 11,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)',
            ...mono,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ storagePath: storagePath || null, crop: defaultPortraitCrop(), publicUrl: getPortraitPublicUrl(storagePath) })}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            ...mono,
            fontSize: 10,
            textTransform: 'uppercase',
          }}
        >
          Reset crop
        </button>
        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: '1px solid rgba(196,64,64,0.3)',
            borderRadius: 'var(--radius)',
            color: 'var(--danger)',
            cursor: 'pointer',
            ...mono,
            fontSize: 10,
            textTransform: 'uppercase',
          }}
        >
          Clear
        </button>
      </div>

      {previewUrl && (
        <img
          src={previewUrl}
          alt={`${label} preview`}
          style={{
            marginBottom: 8,
            width: 120,
            height: 120,
            objectFit: 'cover',
            objectPosition: `${Math.round(normalizedCrop.x * 100)}% ${Math.round(normalizedCrop.y * 100)}%`,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            transform: `scale(${normalizedCrop.zoom})`,
            transformOrigin: 'center center',
          }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <label style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
          x
          <input style={inputStyle} type="number" min={0} max={1} step={0.01} value={normalizedCrop.x} onChange={(e) => updateCrop('x', e.target.value)} />
        </label>
        <label style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
          y
          <input style={inputStyle} type="number" min={0} max={1} step={0.01} value={normalizedCrop.y} onChange={(e) => updateCrop('y', e.target.value)} />
        </label>
        <label style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
          width
          <input style={inputStyle} type="number" min={0.01} max={1} step={0.01} value={normalizedCrop.width} onChange={(e) => updateCrop('width', e.target.value)} />
        </label>
        <label style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
          height
          <input style={inputStyle} type="number" min={0.01} max={1} step={0.01} value={normalizedCrop.height} onChange={(e) => updateCrop('height', e.target.value)} />
        </label>
        <label style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
          zoom
          <input style={inputStyle} type="number" min={0.1} max={4} step={0.1} value={normalizedCrop.zoom} onChange={(e) => updateCrop('zoom', e.target.value)} />
        </label>
      </div>

      {storagePath && (
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>
          {storagePath}
        </div>
      )}
      {error && (
        <div style={{ ...mono, fontSize: 10, color: 'var(--danger)', marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  )
}
