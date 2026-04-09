import React, { useState, useEffect } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'

export default function SessionEditor({ sessionId, onClose, onEditScene }) {
  const sessions = useCampaignStore(s => s.sessions)
  const saveSession = useCampaignStore(s => s.saveSession)
  const deleteSession = useCampaignStore(s => s.deleteSession)
  const saveScene = useCampaignStore(s => s.saveScene)
  const deleteScene = useCampaignStore(s => s.deleteScene)

  const session = sessions.find(s => s.id === sessionId)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

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
