import React, { useState, useEffect } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { mono, label9, inputBase, taBase, btnSm, btnDanger, btnGreen } from './outlinerStyles'
import LabelField from './LabelField'
import OutcomeTableEditor from './OutcomeTableEditor'
import BeatRow from './BeatRow'
import BranchRow from './BranchRow'

const SCENE_TYPES = ['narrative', 'combat', 'exploration', 'social', 'puzzle', 'transition']

const SCENE_TYPE_COLOURS = {
  narrative: 'var(--text-muted)',
  combat: 'var(--danger)',
  exploration: 'var(--green-bright)',
  social: '#a0b0ff',
  puzzle: '#d4a080',
  transition: 'var(--text-muted)',
}

export default function SceneRow({ scene, sessionId, sceneIndex, totalScenes, allScenes, statBlocks }) {
  const saveScene = useCampaignStore(s => s.saveScene)
  const deleteScene = useCampaignStore(s => s.deleteScene)
  const saveBeat = useCampaignStore(s => s.saveBeat)
  const saveBranch = useCampaignStore(s => s.saveBranch)
  const sessions = useCampaignStore(s => s.sessions)

  const [expanded, setExpanded] = useState(true)
  const [editingMeta, setEditingMeta] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [expandedBeatId, setExpandedBeatId] = useState(null)
  const [expandedBranchId, setExpandedBranchId] = useState(null)

  useEffect(() => {
    setForm({
      title: scene.title || '',
      subtitle: scene.subtitle || '',
      scene_type: scene.scene_type || 'narrative',
      estimated_time: scene.estimated_time || '',
      slug: scene.slug || '',
      purpose: scene.purpose || '',
      summary: scene.summary || '',
      player_description: scene.player_description || '',
      dm_notes: scene.dm_notes || '',
      entry_conditions: scene.entry_conditions || '',
      environment: scene.environment || '',
      fallback_notes: scene.fallback_notes || '',
      fail_forward_notes: scene.fail_forward_notes || '',
      outcomes: scene.outcomes || [],
      is_published: scene.is_published || false,
    })
  }, [scene.id])

  const update = (field, val) => { setSaveMsg(null); setForm(f => ({ ...f, [field]: val })) }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveScene({ ...scene, ...form })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else { setSaveMsg({ type: 'ok', text: 'Saved' }); setEditingMeta(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete scene "${scene.title}" and all its beats? This cannot be undone.`)) return
    await deleteScene(scene.id)
  }

  const handleAddBeat = async () => {
    const beats = scene.beats || []
    const result = await saveBeat({
      scene_id: scene.id,
      order: beats.length + 1,
      title: 'New Beat',
      type: 'narrative',
      content: '',
    })
    if (result.data) setExpandedBeatId(result.data.id)
  }

  const handleAddBranch = async () => {
    const result = await saveBranch({
      scene_id: scene.id,
      order: (scene.branches || []).length + 1,
      label: '',
      condition_type: 'explicit',
    })
    if (result.data) setExpandedBranchId(result.data.id)
  }

  const typeColour = SCENE_TYPE_COLOURS[scene.scene_type] || 'var(--text-muted)'
  const beats = scene.beats || []
  const branches = scene.branches || []

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px 7px 14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 5,
        cursor: 'pointer',
      }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, padding: '0 2px', flexShrink: 0 }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span onClick={() => setExpanded(e => !e)} style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginRight: 6 }}>{sceneIndex + 1}.</span>
          {scene.title}
        </span>
        <span style={{ ...mono, fontSize: 9, color: typeColour, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          {scene.scene_type}
        </span>
        {scene.estimated_time && (
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
            {scene.estimated_time}
          </span>
        )}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={() => setEditingMeta(v => !v)} style={{ ...btnSm, color: editingMeta ? 'var(--green-bright)' : 'var(--text-secondary)' }}>
            {editingMeta ? 'close' : 'Edit'}
          </button>
          <button onClick={handleAddBeat} style={btnSm}>+ Beat</button>
          <button onClick={handleDelete} style={btnDanger}>Delete</button>
        </div>
      </div>

      {editingMeta && (
        <div style={{ margin: '4px 0 8px 24px', padding: '16px 18px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label9}>Title</label>
              <input value={form.title} onChange={e => update('title', e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={label9}>Subtitle</label>
              <input value={form.subtitle} onChange={e => update('subtitle', e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={label9}>Scene Type</label>
              <select value={form.scene_type} onChange={e => update('scene_type', e.target.value)} style={inputBase}>
                {SCENE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label9}>Estimated Time</label>
              <input value={form.estimated_time} onChange={e => update('estimated_time', e.target.value)} style={inputBase} placeholder="20–30 min" />
            </div>
            <div>
              <label style={label9}>Slug</label>
              <input value={form.slug} onChange={e => update('slug', e.target.value)} style={inputBase} placeholder="s2-darcy" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <input type="checkbox" id={`pub-${scene.id}`} checked={form.is_published} onChange={e => update('is_published', e.target.checked)} />
              <label htmlFor={`pub-${scene.id}`} style={{ ...label9, marginBottom: 0, cursor: 'pointer' }}>Published to Players</label>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <LabelField label="Purpose (DM only)">
            <textarea value={form.purpose} onChange={e => update('purpose', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Summary (DM only)">
            <textarea value={form.summary} onChange={e => update('summary', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Player Description">
            <textarea value={form.player_description} onChange={e => update('player_description', e.target.value)} rows={3} style={{ ...taBase, color: '#d4a080', fontStyle: 'italic' }} />
          </LabelField>
          <LabelField label="DM Notes">
            <textarea value={form.dm_notes} onChange={e => update('dm_notes', e.target.value)} rows={3} style={taBase} />
          </LabelField>
          <LabelField label="Entry Conditions">
            <textarea value={form.entry_conditions} onChange={e => update('entry_conditions', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Environment">
            <textarea value={form.environment} onChange={e => update('environment', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Fallback Notes">
            <textarea value={form.fallback_notes} onChange={e => update('fallback_notes', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Fail-Forward Notes">
            <textarea value={form.fail_forward_notes} onChange={e => update('fail_forward_notes', e.target.value)} rows={2} style={taBase} />
          </LabelField>
          <LabelField label="Outcomes">
            <OutcomeTableEditor value={form.outcomes} onChange={v => update('outcomes', v)} />
          </LabelField>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={handleSave} disabled={saving} style={btnGreen}>
              {saving ? 'Saving…' : 'Save Scene'}
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
        <div style={{ paddingTop: 4 }}>
          {beats.map((beat, i) => (
            <BeatRow
              key={beat.id}
              beat={beat}
              index={i}
              total={beats.length}
              sceneId={scene.id}
              statBlocks={statBlocks}
              expandedBeatId={expandedBeatId}
              setExpandedBeatId={setExpandedBeatId}
            />
          ))}

          {beats.length === 0 && (
            <div style={{ paddingLeft: 28, fontSize: 12, color: 'var(--text-muted)', paddingBottom: 6 }}>
              No beats yet. <button onClick={handleAddBeat} style={{ ...btnSm, fontSize: 10 }}>+ Add Beat</button>
            </div>
          )}

          {branches.length > 0 && (
            <div style={{ marginTop: 4, marginBottom: 4 }}>
              {branches.map(branch => (
                <BranchRow
                  key={branch.id}
                  branch={branch}
                  sceneId={scene.id}
                  allScenes={allScenes}
                  expandedBranchId={expandedBranchId}
                  setExpandedBranchId={setExpandedBranchId}
                />
              ))}
            </div>
          )}

          <div style={{ paddingLeft: 28, paddingTop: 2, paddingBottom: 6 }}>
            <button onClick={handleAddBranch} style={{ ...btnSm, borderStyle: 'dashed', fontSize: 9, color: 'var(--warning)', borderColor: 'rgba(196,160,64,0.4)' }}>
              + Add Branch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
