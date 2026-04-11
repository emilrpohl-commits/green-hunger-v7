import React, { useState } from 'react'
import { uploadAudioFile } from '@shared/lib/audioStorage.js'
import { pushToast } from '../../../stores/toastStore.js'

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src = url
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
  })
}

export default function AudioUploadPanel({ campaignId, onSaveAsset }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('sfx')
  const [tags, setTags] = useState('')
  const [loopDefault, setLoopDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      const uploaded = await uploadAudioFile({
        file,
        campaignId,
        category: type,
      })
      const duration = await readAudioDuration(file)
      const save = await onSaveAsset?.({
        name: name.trim() || file.name.replace(/\.[^.]+$/, ''),
        type,
        storage_path: uploaded.storagePath,
        duration_seconds: duration,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        loop_default: loopDefault,
        volume_default: 1,
      })
      if (save?.error) throw new Error(save.error)
      pushToast('Audio uploaded.', 'ok')
      setMsg('Uploaded')
      setFile(null)
      setName('')
      setTags('')
      setLoopDefault(false)
    } catch (e) {
      const errText = String(e?.message || e)
      pushToast(errText, 'error')
      setMsg(errText)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,audio/webm"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Track name" style={input} />
      <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
        <option value="background">Background</option>
        <option value="sfx">Sound effect</option>
      </select>
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags (comma separated)" style={input} />
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={loopDefault} onChange={(e) => setLoopDefault(e.target.checked)} style={{ marginRight: 6 }} />
        Loop by default
      </label>
      <button type="button" onClick={submit} disabled={!file || busy} style={btn}>
        {busy ? 'Uploading...' : 'Upload audio'}
      </button>
      {msg && <div style={{ fontSize: 11, color: msg === 'Uploaded' ? 'var(--green-bright)' : 'var(--danger)' }}>{msg}</div>}
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
  padding: '6px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--green-mid)',
  background: 'var(--green-dim)',
  color: 'var(--green-bright)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}
