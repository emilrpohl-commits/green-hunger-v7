import React, { useState, useEffect } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { sessionArchiveConfirmMessage } from './deleteScopeCopy.js'
import { useSessionStore } from '../../stores/sessionStore'
import { mono, label9, inputBase, taBase, btnSm, btnDanger, btnGreen } from './outlinerStyles'
import LabelField from './LabelField'
import SceneRow from './SceneRow'

export default function SessionRow({ session, allScenes, statBlocks, onImport }) {
  const saveSession = useCampaignStore(s => s.saveSession)
  const deleteSession = useCampaignStore(s => s.deleteSession)
  const saveScene = useCampaignStore(s => s.saveScene)
  const refreshSession = useCampaignStore(s => s.refreshSession)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)
  const sessions = useCampaignStore(s => s.sessions)

  const [expanded, setExpanded] = useState(true)
  const [editingMeta, setEditingMeta] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  useEffect(() => {
    setForm({
      title: session.title || '',
      subtitle: session.subtitle || '',
      estimated_duration: session.estimated_duration || '',
      recap: session.recap || '',
      objectives: Array.isArray(session.objectives) ? session.objectives.join('\n') : (session.objectives || ''),
      contingency_notes: session.contingency_notes || '',
      post_session_notes: session.post_session_notes || '',
      notes: session.notes || '',
    })
  }, [session.id])

  const update = (field, val) => { setSaveMsg(null); setForm(f => ({ ...f, [field]: val })) }

  const handleSave = async () => {
    setSaving(true)
    const objectives = form.objectives.split('\n').map(s => s.trim()).filter(Boolean)
    const result = await saveSession({ ...session, ...form, objectives })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else {
      setSaveMsg({ type: 'ok', text: 'Saved' })
      setEditingMeta(false)
      syncContentFromDb(useCampaignStore.getState().sessions)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(sessionArchiveConfirmMessage(session))) return
    await deleteSession(session.id)
    syncContentFromDb(useCampaignStore.getState().sessions)
  }

  const handleAddScene = async () => {
    await saveScene({
      session_id: session.id,
      order: (session.scenes || []).length + 1,
      title: 'New Scene',
      scene_type: 'narrative',
      is_published: false,
    })
    syncContentFromDb(useCampaignStore.getState().sessions)
  }

  const sessionNum = session.session_number || session.order || '?'
  const scenes = session.scenes || []

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-bright)',
        borderRadius: 6,
        borderLeft: '3px solid var(--green-dim)',
      }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green-bright)', fontSize: 11, padding: '0 2px', flexShrink: 0 }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <div onClick={() => setExpanded(e => !e)} style={{ flex: 1, cursor: 'pointer', overflow: 'hidden' }}>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 8 }}>
            Session {sessionNum}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)' }}>
            {session.title}
          </span>
          {session.subtitle && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: 8 }}>
              — {session.subtitle}
            </span>
          )}
        </div>
        <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {scenes.length} scenes
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, position: 'relative' }}>
          <button onClick={() => setEditingMeta(v => !v)} style={{ ...btnSm, color: editingMeta ? 'var(--green-bright)' : 'var(--text-secondary)', fontSize: 10 }}>
            {editingMeta ? 'close' : 'Edit'}
          </button>
          <button onClick={handleDelete} style={{ ...btnDanger, fontSize: 10 }}>Archive</button>
          <button
            onClick={() => setShowMoreMenu(v => !v)}
            style={{ ...btnSm, fontSize: 12 }}
          >
            ⋯
          </button>
          {showMoreMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 20,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 0', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
            }}>
              <button
                onClick={() => { setShowMoreMenu(false); onImport && onImport(session.id) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}
              >
                Import from Markdown
              </button>
            </div>
          )}
        </div>
      </div>

      {editingMeta && (
        <div style={{ margin: '4px 0 8px 0', padding: '16px 18px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label9}>Title</label>
              <input value={form.title} onChange={e => update('title', e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={label9}>Subtitle</label>
              <input value={form.subtitle} onChange={e => update('subtitle', e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={label9}>Estimated Duration</label>
              <input value={form.estimated_duration} onChange={e => update('estimated_duration', e.target.value)} style={inputBase} placeholder="3–4 hours" />
            </div>
          </div>
          <LabelField label="Recap">
            <textarea value={form.recap} onChange={e => update('recap', e.target.value)} rows={3} style={taBase} placeholder="What happened last session…" />
          </LabelField>
          <LabelField label="Objectives (one per line)">
            <textarea value={form.objectives} onChange={e => update('objectives', e.target.value)} rows={3} style={taBase} placeholder="One objective per line…" />
          </LabelField>
          <LabelField label="Contingency Notes">
            <textarea value={form.contingency_notes} onChange={e => update('contingency_notes', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Post-Session Notes">
            <textarea value={form.post_session_notes} onChange={e => update('post_session_notes', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Background Notes (DM only)">
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} style={taBase} />
          </LabelField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={btnGreen}>
              {saving ? 'Saving…' : 'Save Session'}
            </button>
            <button onClick={() => setEditingMeta(false)} style={btnSm}>Cancel</button>
            {saveMsg && (
              <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>
                {saveMsg.text}
              </span>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div style={{ paddingLeft: 16, paddingTop: 6 }}>
          {scenes.map((scene, i) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              sessionId={session.id}
              sceneIndex={i}
              totalScenes={scenes.length}
              allScenes={allScenes}
              statBlocks={statBlocks}
            />
          ))}
          <button
            onClick={handleAddScene}
            style={{ ...btnSm, borderStyle: 'dashed', marginTop: 6, padding: '6px 14px', fontSize: 11, width: '100%', textAlign: 'center' }}
          >
            + Add Scene
          </button>
        </div>
      )}
    </div>
  )
}
