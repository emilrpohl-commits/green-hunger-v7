/**
 * Session Outliner — Part 1 of MASTER-BRIEF
 *
 * Single-pane always-visible outliner replacing the drill-down
 * Sessions → Session → Scene → Beats tab → Beat form flow.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { useSessionStore } from '../../stores/sessionStore'

// ─── Enums ───────────────────────────────────────────────────────────────────
const SCENE_TYPES = ['narrative', 'combat', 'exploration', 'social', 'puzzle', 'transition']
const BEAT_TYPES = ['narrative', 'prompt', 'check', 'decision', 'combat', 'reveal', 'transition']
const BRANCH_CONDITION_TYPES = ['explicit', 'implicit', 'conditional']

const SCENE_TYPE_COLOURS = {
  narrative: 'var(--text-muted)',
  combat: 'var(--danger)',
  exploration: 'var(--green-bright)',
  social: '#a0b0ff',
  puzzle: '#d4a080',
  transition: 'var(--text-muted)',
}

const BEAT_TYPE_COLOURS = {
  narrative: 'var(--text-muted)',
  prompt: 'var(--green-mid)',
  check: 'var(--info)',
  decision: 'var(--warning)',
  combat: 'var(--danger)',
  reveal: 'var(--rot-bright)',
  transition: 'var(--text-muted)',
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const mono = { fontFamily: 'var(--font-mono)' }
const label9 = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }
const inputBase = { width: '100%', padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const taBase = { ...inputBase, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }
const btnSm = { padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }
const btnDanger = { ...btnSm, border: '1px solid rgba(196,64,64,0.35)', color: 'var(--danger)' }
const btnGreen = { padding: '6px 14px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }

function LabelField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={label9}>{label}</label>
      {children}
    </div>
  )
}

// ─── SkillCheckTableEditor ────────────────────────────────────────────────────
function SkillCheckTableEditor({ value, onChange }) {
  let rows = []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : (value || [])
    rows = Array.isArray(parsed) ? parsed : []
  } catch {
    // fallback to plain text if not parseable
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
        style={taBase}
        placeholder="Mechanical effect…"
      />
    )
  }

  const update = (i, field, val) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: field === 'dc' ? (parseInt(val) || '') : val } : r)
    onChange(JSON.stringify(next))
  }
  const addRow = () => onChange(JSON.stringify([...rows, { trigger: '', skill: '', dc: '', result: '' }]))
  const removeRow = (i) => onChange(JSON.stringify(rows.filter((_, idx) => idx !== i)))

  const thStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 6px', textAlign: 'left', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }
  const tdStyle = { padding: '3px 4px', verticalAlign: 'top' }
  const cellInput = (w) => ({ ...inputBase, padding: '5px 7px', fontSize: 12, width: w || '100%' })

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={thStyle}>Trigger</th>
            <th style={thStyle}>Skill / Save</th>
            <th style={{ ...thStyle, width: 52 }}>DC</th>
            <th style={thStyle}>What They Learn</th>
            <th style={{ ...thStyle, width: 20 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}><input value={row.trigger || ''} onChange={e => update(i, 'trigger', e.target.value)} style={cellInput()} /></td>
              <td style={tdStyle}><input value={row.skill || ''} onChange={e => update(i, 'skill', e.target.value)} style={cellInput(160)} /></td>
              <td style={tdStyle}><input value={row.dc || ''} onChange={e => update(i, 'dc', e.target.value)} style={cellInput(48)} type="number" /></td>
              <td style={tdStyle}><input value={row.result || ''} onChange={e => update(i, 'result', e.target.value)} style={cellInput()} /></td>
              <td style={tdStyle}>
                <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, padding: '2px 4px' }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} style={{ ...btnSm, borderStyle: 'dashed' }}>+ Add Check</button>
    </div>
  )
}

// ─── OutcomeTableEditor ───────────────────────────────────────────────────────
function OutcomeTableEditor({ value, onChange }) {
  let rows = []
  try {
    rows = Array.isArray(value) ? value : JSON.parse(value || '[]')
  } catch {
    rows = []
  }

  const update = (i, field, val) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
    onChange(next)
  }
  const addRow = () => onChange([...rows, { outcome: '', consequence: '' }])
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i))

  const thStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 6px', textAlign: 'left', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }
  const tdStyle = { padding: '3px 4px', verticalAlign: 'top' }
  const cellInput = { ...inputBase, padding: '5px 7px', fontSize: 12 }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={thStyle}>Outcome</th>
            <th style={thStyle}>Consequence</th>
            <th style={{ ...thStyle, width: 20 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}><input value={row.outcome || ''} onChange={e => update(i, 'outcome', e.target.value)} style={cellInput} /></td>
              <td style={tdStyle}><input value={row.consequence || ''} onChange={e => update(i, 'consequence', e.target.value)} style={cellInput} /></td>
              <td style={tdStyle}>
                <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, padding: '2px 4px' }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} style={{ ...btnSm, borderStyle: 'dashed' }}>+ Add Outcome</button>
    </div>
  )
}

// ─── BeatRow ──────────────────────────────────────────────────────────────────
function BeatRow({ beat, index, total, sceneId, statBlocks, expandedBeatId, setExpandedBeatId }) {
  const saveBeat = useCampaignStore(s => s.saveBeat)
  const deleteBeat = useCampaignStore(s => s.deleteBeat)
  const reorderBeats = useCampaignStore(s => s.reorderBeats)
  const refreshSession = useCampaignStore(s => s.refreshSession)
  const sessions = useCampaignStore(s => s.sessions)

  const isExpanded = expandedBeatId === beat.id
  const [form, setForm] = useState({ ...beat })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const dirty = useRef(false)

  useEffect(() => { setForm({ ...beat }) }, [beat.id])

  const update = (field, val) => {
    dirty.current = true
    setSaveMsg(null)
    setForm(f => ({ ...f, [field]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveBeat({ ...form })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else { setSaveMsg({ type: 'ok', text: 'Saved' }); dirty.current = false }
  }

  const handleCollapse = async () => {
    if (dirty.current) await handleSave()
    setExpandedBeatId(null)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete beat "${beat.title}"?`)) return
    await deleteBeat(beat.id)
  }

  const handleMove = async (dir) => {
    const scene = sessions.flatMap(s => s.scenes || []).find(sc => sc.id === sceneId)
    if (!scene) return
    const beats = [...(scene.beats || [])]
    const i = beats.findIndex(b => b.id === beat.id)
    if (dir === 'up' && i === 0) return
    if (dir === 'down' && i === beats.length - 1) return
    const j = dir === 'up' ? i - 1 : i + 1
    ;[beats[i], beats[j]] = [beats[j], beats[i]]
    await reorderBeats(sceneId, beats.map(b => b.id))
  }

  const colour = BEAT_TYPE_COLOURS[beat.type] || 'var(--text-muted)'
  const showCheck = beat.type === 'check' || beat.type === 'prompt'
  const showContent = ['narrative', 'prompt', 'reveal', 'decision'].includes(form.type)

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Beat header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 8px 5px 28px',
        background: isExpanded ? 'rgba(100,200,100,0.05)' : 'transparent',
        borderRadius: 4,
        borderLeft: isExpanded ? '2px solid var(--green-dim)' : '2px solid transparent',
      }}>
        <span style={{ ...mono, fontSize: 9, textTransform: 'uppercase', color: colour, minWidth: 64, letterSpacing: '0.06em' }}>
          {beat.type}
        </span>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {beat.title || '(untitled)'}
        </span>
        {beat.stat_block_id && <span style={{ fontSize: 11, color: 'var(--danger)' }}>⚔</span>}
        {beat.mechanical_effect && beat.mechanical_effect !== '[]' && beat.mechanical_effect !== 'null' && (
          <span style={{ fontSize: 11, color: 'var(--info)' }}>🎲</span>
        )}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={() => handleMove('up')} disabled={index === 0} style={{ ...btnSm, padding: '2px 5px', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
          <button onClick={() => handleMove('down')} disabled={index === total - 1} style={{ ...btnSm, padding: '2px 5px', opacity: index === total - 1 ? 0.3 : 1 }}>▼</button>
          <button
            onClick={() => isExpanded ? handleCollapse() : setExpandedBeatId(beat.id)}
            style={{ ...btnSm, padding: '2px 6px', color: isExpanded ? 'var(--green-bright)' : 'var(--text-muted)' }}
          >
            {isExpanded ? '▴' : '▾'}
          </button>
          <button onClick={handleDelete} style={{ ...btnDanger, padding: '2px 6px' }}>×</button>
        </div>
      </div>

      {/* Beat expand panel */}
      {isExpanded && (
        <div style={{
          margin: '0 0 8px 28px',
          padding: '14px 16px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 6,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label9}>Title</label>
              <input value={form.title || ''} onChange={e => update('title', e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={label9}>Type</label>
              <select value={form.type || 'narrative'} onChange={e => update('type', e.target.value)} style={inputBase}>
                {BEAT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label9}>Trigger Text</label>
              <input value={form.trigger_text || ''} onChange={e => update('trigger_text', e.target.value)} style={inputBase} placeholder="When players enter…" />
            </div>
          </div>

          {showContent && (
            <LabelField label="Content (read aloud)">
              <textarea value={form.content || ''} onChange={e => update('content', e.target.value)} rows={4} style={{ ...taBase, color: '#d4a080', fontStyle: 'italic' }} />
            </LabelField>
          )}

          {(form.type === 'narrative' || form.type === 'prompt') && (
            <LabelField label="Player-Facing Text">
              <textarea value={form.player_text || ''} onChange={e => update('player_text', e.target.value)} rows={2} style={taBase} />
            </LabelField>
          )}

          <LabelField label="DM Notes">
            <textarea value={form.dm_notes || ''} onChange={e => update('dm_notes', e.target.value)} rows={3} style={taBase} />
          </LabelField>

          {showCheck ? (
            <LabelField label="Mechanical Effect (skill checks)">
              <SkillCheckTableEditor value={form.mechanical_effect} onChange={v => update('mechanical_effect', v)} />
            </LabelField>
          ) : (form.type === 'decision' || form.type === 'transition') ? (
            <LabelField label="Mechanical Effect">
              <textarea value={form.mechanical_effect || ''} onChange={e => update('mechanical_effect', e.target.value)} rows={2} style={taBase} />
            </LabelField>
          ) : null}

          {form.type === 'combat' && (
            <LabelField label="Stat Block">
              <select value={form.stat_block_id || ''} onChange={e => update('stat_block_id', e.target.value || null)} style={inputBase}>
                <option value="">None</option>
                {(statBlocks || []).map(sb => (
                  <option key={sb.id} value={sb.id}>{sb.name} (CR {sb.cr})</option>
                ))}
              </select>
            </LabelField>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <button onClick={handleSave} disabled={saving} style={btnGreen}>
              {saving ? 'Saving…' : 'Save Beat'}
            </button>
            {saveMsg && (
              <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>
                {saveMsg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BranchRow ────────────────────────────────────────────────────────────────
function BranchRow({ branch, sceneId, allScenes, expandedBranchId, setExpandedBranchId }) {
  const saveBranch = useCampaignStore(s => s.saveBranch)
  const deleteBranch = useCampaignStore(s => s.deleteBranch)

  const isExpanded = expandedBranchId === branch.id
  const [form, setForm] = useState({ ...branch })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  useEffect(() => { setForm({ ...branch }) }, [branch.id])

  const update = (field, val) => { setSaveMsg(null); setForm(f => ({ ...f, [field]: val })) }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveBranch({ ...form })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else { setSaveMsg({ type: 'ok', text: 'Saved' }); setExpandedBranchId(null) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete branch "${branch.label}"?`)) return
    await deleteBranch(branch.id)
  }

  const targetScene = allScenes.find(s => s.id === branch.target_scene_id)
  const otherScenes = allScenes.filter(s => s.id !== sceneId)

  return (
    <div style={{ marginBottom: 4, paddingLeft: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(196,160,64,0.06)', border: '1px solid rgba(196,160,64,0.25)', borderRadius: 4 }}>
        <span style={{ color: 'var(--warning)', fontSize: 12 }}>→</span>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--warning)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {branch.label || '(no label)'}
        </span>
        {targetScene && (
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)' }}>
            Target: {targetScene.title}
          </span>
        )}
        <button onClick={() => setExpandedBranchId(isExpanded ? null : branch.id)} style={{ ...btnSm, color: isExpanded ? 'var(--warning)' : 'var(--text-muted)' }}>
          {isExpanded ? 'close' : 'edit'}
        </button>
        <button onClick={handleDelete} style={btnDanger}>×</button>
      </div>

      {isExpanded && (
        <div style={{ padding: '12px 14px', background: 'var(--bg-raised)', border: '1px solid rgba(196,160,64,0.25)', borderRadius: 4, marginTop: 4 }}>
          <LabelField label="Label">
            <input value={form.label || ''} onChange={e => update('label', e.target.value)} style={inputBase} placeholder="Left Path — The Druid's Cabin" />
          </LabelField>
          <LabelField label="Description">
            <textarea value={form.description || ''} onChange={e => update('description', e.target.value)} rows={1} style={taBase} />
          </LabelField>
          <LabelField label="Condition Text">
            <textarea value={form.condition_text || ''} onChange={e => update('condition_text', e.target.value)} rows={1} style={taBase} />
          </LabelField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={label9}>Condition Type</label>
              <select value={form.condition_type || 'explicit'} onChange={e => update('condition_type', e.target.value)} style={inputBase}>
                {BRANCH_CONDITION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label9}>Target Scene</label>
              <select value={form.target_scene_id || ''} onChange={e => update('target_scene_id', e.target.value || null)} style={inputBase}>
                <option value="">— select —</option>
                {otherScenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={btnGreen}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setExpandedBranchId(null)} style={btnSm}>Cancel</button>
            {saveMsg && (
              <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>
                {saveMsg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SceneRow ─────────────────────────────────────────────────────────────────
function SceneRow({ scene, sessionId, sceneIndex, totalScenes, allScenes, statBlocks }) {
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
      {/* Scene header */}
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

      {/* Scene metadata panel (inline) */}
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

      {/* Beats + branches */}
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

          {/* Branches */}
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

// ─── SessionRow ───────────────────────────────────────────────────────────────
function SessionRow({ session, allScenes, statBlocks, onImport }) {
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
    if (!window.confirm(`Delete session "${session.title}" and all its scenes/beats? This cannot be undone.`)) return
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
      {/* Session header */}
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
          <button onClick={handleDelete} style={{ ...btnDanger, fontSize: 10 }}>Delete</button>
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
                Import from DOCX
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session metadata panel */}
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

      {/* Scenes */}
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

// ─── SessionOutliner (main export) ────────────────────────────────────────────
export default function SessionOutliner({ onImport }) {
  const sessions = useCampaignStore(s => s.sessions)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const createSession = useCampaignStore(s => s.createSession)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)

  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const allScenes = sessions.flatMap(s => s.scenes || [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    setCreateError(null)
    const result = await createSession(newTitle.trim())
    setCreating(false)
    if (result.error) {
      setCreateError(result.error)
    } else {
      setNewTitle('')
      syncContentFromDb(useCampaignStore.getState().sessions)
    }
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', flex: 1 }}>
          Sessions
        </div>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="New session title…"
          style={{ ...inputBase, width: 200 }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newTitle.trim()}
          style={{ ...btnGreen, opacity: (creating || !newTitle.trim()) ? 0.5 : 1 }}
        >
          {creating ? 'Creating…' : '+ Session'}
        </button>
        <button
          onClick={() => onImport && onImport(null)}
          style={{ ...btnSm, padding: '7px 14px', fontSize: 10, border: '1px solid var(--border-bright)', color: 'var(--text-secondary)' }}
        >
          Import DOCX
        </button>
      </div>

      {createError && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(196,64,64,0.08)', border: '1px solid var(--danger)', borderRadius: 4, ...mono, fontSize: 11, color: 'var(--danger)' }}>
          {createError}
        </div>
      )}

      {sessions.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No sessions yet. Create one above or import a DOCX session document.
        </div>
      )}

      {sessions.map(session => (
        <SessionRow
          key={session.id}
          session={session}
          allScenes={allScenes}
          statBlocks={statBlocks}
          onImport={onImport}
        />
      ))}
    </div>
  )
}
