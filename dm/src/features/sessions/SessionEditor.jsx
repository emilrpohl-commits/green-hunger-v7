import React, { useState, useEffect, useRef } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { uploadSessionMapVideo } from '@shared/lib/sessionMapStorage.js'

export default function SessionEditor({ sessionId, onClose, onEditScene }) {
  const campaign = useCampaignStore(s => s.campaign)
  const sessions = useCampaignStore(s => s.sessions)
  const saveSession = useCampaignStore(s => s.saveSession)
  const deleteSession = useCampaignStore(s => s.deleteSession)
  const saveScene = useCampaignStore(s => s.saveScene)
  const deleteScene = useCampaignStore(s => s.deleteScene)

  const session = sessions.find(s => s.id === sessionId)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [mapUploadBusy, setMapUploadBusy] = useState(false)
  const mapVideoInputRef = useRef(null)

  useEffect(() => {
    if (session) {
      setForm({
        title: session.title || '',
        subtitle: session.subtitle || '',
        session_number: session.session_number || session.order || 1,
        estimated_duration: session.estimated_duration || '',
        recap: session.recap || '',
        objectives: session.objectives || [],
        contingency_notes: session.contingency_notes || '',
        post_session_notes: session.post_session_notes || '',
        notes: session.notes || '',
        session_maps: Array.isArray(session.session_maps) ? session.session_maps : [],
      })
    }
  }, [sessionId, sessions])

  if (!session) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Session not found.</div>

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }
  const taStyle = { ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveSession({ ...session, ...form })
    setSaving(false)
    setSaveMsg(result.error ? { type: 'error', text: result.error } : { type: 'ok', text: 'Saved' })
  }

  const handleAddScene = async () => {
    const result = await saveScene({
      session_id: session.id,
      order: (session.scenes?.length || 0) + 1,
      title: 'New Scene',
      scene_type: 'narrative',
      is_published: false,
    })
    if (result.data) onEditScene(result.data.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>←</button>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>
          Session {session.session_number}: {session.title}
        </div>
        {saveMsg && <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</span>}
        <button onClick={async () => {
          if (!window.confirm(`Delete session "${session.title}"? This will remove all scenes and beats. Cannot be undone.`)) return
          await deleteSession(sessionId)
          onClose()
        }} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(196,64,64,0.4)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 11, textTransform: 'uppercase' }}>
          Delete
        </button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{
            marginBottom: 18,
            padding: '12px 14px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
          }}
          >
            <div style={{ ...mono, fontSize: 9, color: 'var(--green-bright)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Where media lives
            </div>
            <strong style={{ color: 'var(--text-primary)' }}>This page — map videos:</strong> section below (MP4/WebM) for tactical/table video.{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Scene cover images</strong> live in scene edit → Scene tab. <strong>Optional beat images</strong> are in scene edit → Beats tab (save the beat first).
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ marginBottom: 14, gridColumn: '1/-1' }}>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Subtitle</label>
              <input style={inputStyle} value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Estimated Duration</label>
              <input style={inputStyle} value={form.estimated_duration || ''} onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} placeholder="3–4 hours" />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Recap</label>
            <textarea style={{ ...taStyle }} rows={3} value={form.recap || ''} onChange={e => setForm(f => ({ ...f, recap: e.target.value }))} placeholder="What happened last session…" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Objectives</label>
            <textarea style={{ ...taStyle }} rows={3} value={(form.objectives || []).join('\n')} onChange={e => setForm(f => ({ ...f, objectives: e.target.value.split('\n').filter(Boolean) }))} placeholder="One objective per line…" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Contingency Notes</label>
            <textarea style={{ ...taStyle }} rows={3} value={form.contingency_notes || ''} onChange={e => setForm(f => ({ ...f, contingency_notes: e.target.value }))} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Post-Session Notes</label>
            <textarea style={{ ...taStyle }} rows={3} value={form.post_session_notes || ''} onChange={e => setForm(f => ({ ...f, post_session_notes: e.target.value }))} />
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
            Maps (MP4 / WEBM)
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Dungeon Alchemist and similar exports. Stored in Supabase; Run mode → Maps tab to play. Save session after changes.
          </p>
          {!campaign?.id && (
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Load a campaign in the builder before uploading map videos.
            </div>
          )}
          <input
            ref={mapVideoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
            disabled={mapUploadBusy}
            aria-hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (!campaign?.id || !session?.id) {
                setSaveMsg({ type: 'error', text: 'Load a campaign and ensure this session is saved, then try again.' })
                return
              }
              setMapUploadBusy(true)
              try {
                const { storagePath } = await uploadSessionMapVideo({
                  file,
                  campaignId: campaign.id,
                  sessionId: session.id,
                })
                const name = window.prompt('Map name', file.name.replace(/\.[^.]+$/, '') || 'Map') || 'Map'
                const maps = [...(form.session_maps || [])]
                maps.push({
                  id: crypto.randomUUID(),
                  name,
                  videoUrl: storagePath,
                })
                setForm((f) => ({ ...f, session_maps: maps }))
              } catch (err) {
                setSaveMsg({ type: 'error', text: String(err?.message || err) })
              }
              setMapUploadBusy(false)
            }}
          />
          <button
            type="button"
            onClick={() => mapVideoInputRef.current?.click()}
            disabled={mapUploadBusy}
            style={{
              display: 'inline-block',
              marginBottom: 14,
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--green-mid)',
              background: 'var(--green-dim)',
              color: 'var(--green-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              cursor: mapUploadBusy ? 'wait' : 'pointer',
              opacity: mapUploadBusy ? 0.6 : 1,
            }}
          >
            {mapUploadBusy ? 'Uploading…' : 'Choose map video (MP4 / WebM)'}
          </button>
          {(form.session_maps || []).map((m, idx) => (
            <div key={m.id || idx} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, padding: '10px 12px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={m.name || ''}
                onChange={(e) => {
                  const maps = [...(form.session_maps || [])]
                  maps[idx] = { ...maps[idx], name: e.target.value }
                  setForm((f) => ({ ...f, session_maps: maps }))
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const maps = (form.session_maps || []).filter((_, j) => j !== idx)
                  setForm((f) => ({ ...f, session_maps: maps }))
                }}
                style={{ padding: '6px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', background: 'transparent', border: '1px solid rgba(196,64,64,0.35)', borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          ))}

          {/* Scenes */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
            Scenes
          </div>

          {(session.scenes || []).map((scene, i) => (
            <div key={scene.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{scene.title}</div>
                {scene.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{scene.subtitle}</div>}
              </div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>{scene.beats?.length || 0} beats</div>
              <button onClick={() => onEditScene(scene.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
              <button onClick={async () => { if (!window.confirm(`Delete "${scene.title}"? This cannot be undone.`)) return; await deleteScene(scene.id) }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
            </div>
          ))}

          <button onClick={handleAddScene} style={{ padding: '8px 16px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', ...mono, fontSize: 10, textTransform: 'uppercase', width: '100%', marginTop: 8 }}>
            + Add Scene
          </button>
        </div>
      </div>
    </div>
  )
}
