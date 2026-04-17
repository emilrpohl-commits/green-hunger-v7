import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import PortraitUploadField from '../../components/PortraitUploadField.jsx'

function blankNpc() {
  return {
    name: '',
    role: '',
    affiliation: '',
    description: '',
    personality: '',
    motivation: '',
    secret: '',
    stat_block_id: null,
    portrait_url: '',
    portrait_original_storage_path: null,
    portrait_crop: { unit: 'relative', x: 0.12, y: 0.08, width: 0.76, height: 0.84, zoom: 1.0 },
    portrait_thumb_storage_path: null,
    faction_id: null,
    tags: [],
    notes: '',
  }
}

export default function NpcLibrary() {
  const campaign = useCampaignStore(s => s.campaign)
  const npcs = useCampaignStore(s => s.npcs)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const saveNpc = useCampaignStore(s => s.saveNpc)
  const deleteNpc = useCampaignStore(s => s.deleteNpc)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankNpc())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const baselineRef = useRef(null)
  const [autosaveStatus, setAutosaveStatus] = useState(null)
  const formRef = useRef(form)
  formRef.current = form

  const npcSnapshot = useMemo(() => JSON.stringify(form), [form])

  useEffect(() => {
    if (editing === null || editing === '__new__' || baselineRef.current === null) return undefined
    if (npcSnapshot === baselineRef.current) return undefined
    if (!(form.name || '').trim()) return undefined
    const t = setTimeout(async () => {
      setAutosaveStatus('saving')
      const f = formRef.current
      const result = await saveNpc({ ...f, id: editing })
      if (result.error) {
        setAutosaveStatus('error')
        setSaveMsg({ type: 'error', text: result.error })
        return
      }
      baselineRef.current = JSON.stringify(f)
      setAutosaveStatus('saved')
      setTimeout(() => setAutosaveStatus((s) => (s === 'saved' ? null : s)), 2200)
    }, 2500)
    return () => clearTimeout(t)
  }, [npcSnapshot, editing, saveNpc, form.name])

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }
  const taStyle = { ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }

  const filtered = npcs.filter(n => !search || n.name.toLowerCase().includes(search.toLowerCase()) || (n.role || '').toLowerCase().includes(search.toLowerCase()))

  const startEdit = (npc) => {
    const next = npc ? { ...blankNpc(), ...npc } : blankNpc()
    setForm(next)
    setEditing(npc?.id || '__new__')
    setSaveMsg(null)
    baselineRef.current = JSON.stringify(next)
    setAutosaveStatus(null)
  }

  const handleSave = async () => {
    if (!(form.name || '').trim()) {
      setSaveMsg({ type: 'error', text: 'Name is required before saving.' })
      return
    }
    setSaving(true)
    const result = await saveNpc({ ...form, id: editing !== '__new__' ? editing : undefined })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else {
      setSaveMsg({ type: 'ok', text: 'Saved' })
      baselineRef.current = JSON.stringify(form)
      setAutosaveStatus(null)
      setEditing(null)
    }
  }

  if (editing !== null) {
    return (
      <div style={{ padding: 24, maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>←</button>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
            {editing === '__new__' ? 'New NPC' : `Edit: ${form.name}`}
          </div>
          {saveMsg && <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</span>}
          {editing !== '__new__' && autosaveStatus === 'saving' && (
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>Autosaving…</span>
          )}
          {editing !== '__new__' && autosaveStatus === 'saved' && (
            <span style={{ ...mono, fontSize: 10, color: 'var(--green-bright)' }}>All changes saved</span>
          )}
          {editing !== '__new__' && autosaveStatus === 'error' && (
            <span style={{ ...mono, fontSize: 10, color: 'var(--danger)' }}>Autosave failed</span>
          )}
          {editing !== '__new__' && npcSnapshot !== baselineRef.current && (form.name || '').trim() && (
            <span style={{ ...mono, fontSize: 10, color: 'var(--warning)' }}>Unsaved</span>
          )}
          {editing === '__new__' && (
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>Save once to enable autosave</span>
          )}
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ marginBottom: 14, gridColumn: '1/-1' }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Role</label>
            <input style={inputStyle} value={form.role || ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Druid, Quest Giver, Villain…" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Affiliation</label>
            <input style={inputStyle} value={form.affiliation || ''} onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))} placeholder="The Weald, Talona's cult…" />
          </div>
          <div style={{ marginBottom: 14, gridColumn: '1/-1' }}>
            <label style={labelStyle}>Stat Block (optional)</label>
            <select style={inputStyle} value={form.stat_block_id || ''} onChange={e => setForm(f => ({ ...f, stat_block_id: e.target.value || null }))}>
              <option value="">None</option>
              {statBlocks.map(sb => <option key={sb.id} value={sb.id}>{sb.name} (CR {sb.cr})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14, gridColumn: '1/-1' }}>
            <PortraitUploadField
              label="Portrait (Stage 7)"
              campaignId={campaign?.id}
              entityType="npcs"
              entityId={editing === '__new__' ? (form.name || '__new__') : editing}
              storagePath={form.portrait_original_storage_path}
              crop={form.portrait_crop}
              legacyUrl={form.portrait_url || null}
              onChange={({ storagePath, crop, publicUrl }) => setForm((f) => ({
                ...f,
                portrait_original_storage_path: storagePath,
                portrait_crop: crop,
                portrait_thumb_storage_path: null,
                portrait_url: publicUrl || f.portrait_url || '',
              }))}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...taStyle }} rows={3} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Appearance, voice, mannerisms…" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Personality</label>
          <textarea style={{ ...taStyle }} rows={2} value={form.personality || ''} onChange={e => setForm(f => ({ ...f, personality: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Motivation</label>
          <textarea style={{ ...taStyle }} rows={2} value={form.motivation || ''} onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Secret (DM Only)</label>
          <textarea style={{ ...taStyle, background: 'rgba(40,50,36,0.5)', color: '#d4a080' }} rows={2} value={form.secret || ''} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} placeholder="What they're not telling anyone…" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...taStyle }} rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>NPCs</div>
        <button onClick={() => startEdit(null)} style={{ padding: '8px 18px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ New NPC</button>
      </div>
      <input type="text" placeholder="Search NPCs…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '9px 14px', marginBottom: 20, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

      {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No NPCs yet.</div>}

      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map(npc => (
          <div key={npc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{npc.name}</div>
              {npc.role && <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{npc.role}{npc.affiliation ? ` · ${npc.affiliation}` : ''}</div>}
            </div>
            <button onClick={() => startEdit(npc)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
            <button
              onClick={() => {
                const label = (npc.name || '').trim() || 'this NPC'
                if (
                  !window.confirm(
                    `Permanently delete "${label}"?\n\n` +
                      'This removes the NPC record and portrait storage references from this campaign. This cannot be undone.',
                  )
                )
                  return
                deleteNpc(npc.id)
              }}
              style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
