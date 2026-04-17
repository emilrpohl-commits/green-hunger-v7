import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { BEAT_TYPES, BEAT_TYPE_COLOURS } from '@shared/lib/constants.js'
import SceneMediaUploader, { BeatIllustrationUploader } from '../../components/SceneMediaUploader.jsx'

const SCENE_TYPES = ['narrative', 'combat', 'exploration', 'social', 'puzzle', 'transition']
const BRANCH_CONDITION_TYPES = ['explicit', 'implicit', 'conditional']

function sceneFormSnapshot(scene, sceneForm) {
  if (!scene) return ''
  return JSON.stringify({
    title: sceneForm.title || '',
    subtitle: sceneForm.subtitle || '',
    scene_type: sceneForm.scene_type || 'narrative',
    subtype: sceneForm.subtype || '',
    purpose: sceneForm.purpose || '',
    summary: sceneForm.summary || '',
    player_description: sceneForm.player_description || '',
    dm_notes: sceneForm.dm_notes || '',
    entry_conditions: sceneForm.entry_conditions || '',
    environment: sceneForm.environment || '',
    estimated_time: sceneForm.estimated_time || '',
    fallback_notes: sceneForm.fallback_notes || '',
    fail_forward_notes: sceneForm.fail_forward_notes || '',
    scaling_notes: sceneForm.scaling_notes || '',
    is_published: !!sceneForm.is_published,
    slug: sceneForm.slug || '',
    image_url: sceneForm.image_url || '',
    scene_images: Array.isArray(sceneForm.scene_images) ? sceneForm.scene_images : [],
  })
}

export default function SceneEditor({ sceneId, sessionId, onClose }) {
  const sessions = useCampaignStore(s => s.sessions)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const saveScene = useCampaignStore(s => s.saveScene)
  const saveBeat = useCampaignStore(s => s.saveBeat)
  const deleteBeat = useCampaignStore(s => s.deleteBeat)
  const reorderBeats = useCampaignStore(s => s.reorderBeats)
  const saveBranch = useCampaignStore(s => s.saveBranch)
  const deleteBranch = useCampaignStore(s => s.deleteBranch)

  const [scene, setScene] = useState(null)
  const [sceneForm, setSceneForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [editBeat, setEditBeat] = useState(null)       // beat id being edited
  const [editBranch, setEditBranch] = useState(null)   // branch id being edited
  const [activeTab, setActiveTab] = useState('scene')  // 'scene' | 'beats' | 'branches'
  const baselineRef = useRef(null)
  const [autosaveStatus, setAutosaveStatus] = useState(null)

  // All scenes (for branch target picker)
  const allScenes = sessions.flatMap(s => s.scenes || [])

  useEffect(() => {
    const found = allScenes.find(s => s.id === sceneId)
    if (found) {
      setScene(found)
      const nextForm = {
        title: found.title || '',
        subtitle: found.subtitle || '',
        scene_type: found.scene_type || 'narrative',
        subtype: found.subtype || '',
        purpose: found.purpose || '',
        summary: found.summary || '',
        player_description: found.player_description || '',
        dm_notes: found.dm_notes || '',
        entry_conditions: found.entry_conditions || '',
        environment: found.environment || '',
        estimated_time: found.estimated_time || '',
        fallback_notes: found.fallback_notes || '',
        fail_forward_notes: found.fail_forward_notes || '',
        scaling_notes: found.scaling_notes || '',
        is_published: found.is_published || false,
        slug: found.slug || '',
        image_url: found.image_url || '',
        scene_images: Array.isArray(found.scene_images) ? found.scene_images : [],
      }
      setSceneForm(nextForm)
      baselineRef.current = sceneFormSnapshot(found, nextForm)
      setAutosaveStatus(null)
    }
  }, [sceneId, sessions])

  const updateForm = (field, value) => {
    setSceneForm(f => ({ ...f, [field]: value }))
    setSaveMsg(null)
  }

  const sceneSnap = useMemo(() => (scene ? sceneFormSnapshot(scene, sceneForm) : ''), [scene, sceneForm])

  const sceneRef = useRef(scene)
  const sceneFormRef = useRef(sceneForm)
  sceneRef.current = scene
  sceneFormRef.current = sceneForm

  useEffect(() => {
    if (!scene || baselineRef.current === null) return undefined
    if (sceneSnap === baselineRef.current) return undefined
    if (!(sceneForm.title || '').trim()) return undefined
    const t = setTimeout(async () => {
      setAutosaveStatus('saving')
      const sc = sceneRef.current
      const sf = sceneFormRef.current
      const result = await saveScene({ ...sc, ...sf })
      if (result.error) {
        setAutosaveStatus('error')
        setSaveMsg({ type: 'error', text: result.error })
        return
      }
      baselineRef.current = sceneFormSnapshot(sc, sf)
      setAutosaveStatus('saved')
      setTimeout(() => setAutosaveStatus((s) => (s === 'saved' ? null : s)), 2200)
    }, 2500)
    return () => clearTimeout(t)
  }, [sceneSnap, scene, saveScene, sceneForm.title])

  if (!scene) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Scene not found.
      </div>
    )
  }

  const handleSaveScene = async () => {
    if (!(sceneForm.title || '').trim()) {
      setSaveMsg({ type: 'error', text: 'Title is required before saving.' })
      return
    }
    setSaving(true)
    const result = await saveScene({ ...scene, ...sceneForm })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else {
      setSaveMsg({ type: 'ok', text: 'Saved' })
      baselineRef.current = sceneFormSnapshot(scene, sceneForm)
      setAutosaveStatus(null)
    }
  }

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'var(--bg-deep)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }
  const taStyle = { ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }

  const TABS = ['scene', 'beats', 'branches']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>
            {scene.title}
          </div>
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Scene · {scene.slug || scene.id?.slice(0, 8)}</div>
        </div>
        {saveMsg && (
          <div style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>
            {saveMsg.text}
          </div>
        )}
        {autosaveStatus === 'saving' && <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>Autosaving…</span>}
        {autosaveStatus === 'saved' && <span style={{ ...mono, fontSize: 10, color: 'var(--green-bright)' }}>All changes saved</span>}
        {autosaveStatus === 'error' && <span style={{ ...mono, fontSize: 10, color: 'var(--danger)' }}>Autosave failed</span>}
        {sceneSnap !== baselineRef.current && (sceneForm.title || '').trim() && (
          <span style={{ ...mono, fontSize: 10, color: 'var(--warning)' }}>Unsaved</span>
        )}
        <button
          onClick={handleSaveScene}
          disabled={saving}
          style={{ padding: '8px 20px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Scene'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            onMouseEnter={(e) => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-muted)' }}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', background: 'none',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--green-bright)' : '2px solid transparent',
              ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {tab}{tab === 'beats' ? ` (${scene.beats?.length || 0})` : ''}
            {tab === 'branches' ? ` (${scene.branches?.length || 0})` : ''}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeTab === 'scene' && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ marginBottom: 16, gridColumn: '1/-1' }}>
                <label style={labelStyle}>Title</label>
                <input style={inputStyle} value={sceneForm.title} onChange={e => updateForm('title', e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Subtitle</label>
                <input style={inputStyle} value={sceneForm.subtitle} onChange={e => updateForm('subtitle', e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Scene Type</label>
                <select style={inputStyle} value={sceneForm.scene_type} onChange={e => updateForm('scene_type', e.target.value)}>
                  {SCENE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Estimated Time</label>
                <input style={inputStyle} value={sceneForm.estimated_time} onChange={e => updateForm('estimated_time', e.target.value)} placeholder="20–30 min" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Slug (stable ID)</label>
                <input style={inputStyle} value={sceneForm.slug} onChange={e => updateForm('slug', e.target.value)} placeholder="s2-darcy" />
              </div>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sceneForm.is_published} onChange={e => updateForm('is_published', e.target.checked)} style={{ marginRight: 8 }} />
                  Published to Players
                </label>
              </div>
            </div>

            <Divider label="Purpose & Summary" />
            <TextareaField label="Purpose (DM only)" value={sceneForm.purpose} onChange={v => updateForm('purpose', v)} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
            <TextareaField label="Summary (DM only)" value={sceneForm.summary} onChange={v => updateForm('summary', v)} labelStyle={labelStyle} taStyle={taStyle} rows={3} />

            <Divider label="Scene Media" />
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Upload a <strong style={{ color: 'var(--text-secondary)' }}>cover image</strong> for this scene (shown to players in Run mode behind beat text).{' '}
              Session-level <strong>map videos</strong> are on the <strong>session</strong> editor (Builder → Sessions → open session → Maps). Optional <strong>beat illustrations</strong> are on each beat under the Beats tab (after you save the beat once).
            </p>
            <SceneMediaUploader
              sceneId={scene.id}
              imageUrl={sceneForm.image_url}
              sceneImages={sceneForm.scene_images}
              onChangeCover={(v) => updateForm('image_url', v)}
              labelStyle={labelStyle}
              inputStyle={inputStyle}
            />

            <Divider label="Player Content" />
            <TextareaField label="Player-Facing Description" value={sceneForm.player_description} onChange={v => updateForm('player_description', v)} labelStyle={labelStyle} taStyle={{ ...taStyle, color: '#d4a080', fontStyle: 'italic' }} rows={4} />

            <Divider label="DM Notes" />
            <TextareaField label="DM Notes" value={sceneForm.dm_notes} onChange={v => updateForm('dm_notes', v)} labelStyle={labelStyle} taStyle={taStyle} rows={4} />
            <TextareaField label="Entry Conditions" value={sceneForm.entry_conditions} onChange={v => updateForm('entry_conditions', v)} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
            <TextareaField label="Environment" value={sceneForm.environment} onChange={v => updateForm('environment', v)} labelStyle={labelStyle} taStyle={taStyle} rows={2} />

            <Divider label="Contingencies" />
            <TextareaField label="Fallback / If Players Get Stuck" value={sceneForm.fallback_notes} onChange={v => updateForm('fallback_notes', v)} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
            <TextareaField label="Fail-Forward" value={sceneForm.fail_forward_notes} onChange={v => updateForm('fail_forward_notes', v)} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
            <TextareaField label="Scaling Notes" value={sceneForm.scaling_notes} onChange={v => updateForm('scaling_notes', v)} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
          </div>
        )}

        {activeTab === 'beats' && (
          <BeatsPanel
            scene={scene}
            statBlocks={statBlocks}
            saveBeat={saveBeat}
            deleteBeat={deleteBeat}
            reorderBeats={reorderBeats}
            editBeat={editBeat}
            setEditBeat={setEditBeat}
            mono={mono}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            taStyle={taStyle}
          />
        )}

        {activeTab === 'branches' && (
          <BranchesPanel
            scene={scene}
            allScenes={allScenes}
            saveBranch={saveBranch}
            deleteBranch={deleteBranch}
            editBranch={editBranch}
            setEditBranch={setEditBranch}
            mono={mono}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            taStyle={taStyle}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Beats panel
// ---------------------------------------------------------------------------

function BeatsPanel({ scene, statBlocks, saveBeat, deleteBeat, reorderBeats, editBeat, setEditBeat, mono, inputStyle, labelStyle, taStyle }) {
  const beats = scene.beats || []
  const [beatForm, setBeatForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  useEffect(() => {
    if (editBeat) {
      const found = beats.find(b => b.id === editBeat) || blankBeat(scene.id, beats.length + 1)
      setBeatForm(found)
    }
  }, [editBeat, scene.id, beats.length])

  function blankBeat(sceneId, order) {
    return { scene_id: sceneId, order, title: '', type: 'narrative', content: '', player_text: '', dm_notes: '', mechanical_effect: '', flavour_text: '', illustration_url: '', stat_block_id: null }
  }

  const handleSaveBeat = async () => {
    setSaving(true)
    const result = await saveBeat({ ...beatForm })
    setSaving(false)
    setSaveMsg(result.error ? { type: 'error', text: result.error } : { type: 'ok', text: 'Saved' })
    if (!result.error && !beatForm.id) setEditBeat(null)
  }

  const handleDeleteBeat = async (beat) => {
    const title = (beat.title || '').trim() || 'Untitled beat'
    if (
      !window.confirm(
        `Permanently delete beat "${title}"?\n\n` +
          'This removes DM/player text and any illustration for this beat. This cannot be undone.',
      )
    )
      return
    await deleteBeat(beat.id)
    if (editBeat === beat.id) setEditBeat(null)
  }

  const handleMoveUp = async (beat, i) => {
    if (i === 0) return
    const ids = beats.map(b => b.id)
    ;[ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]
    await reorderBeats(scene.id, ids)
  }

  const handleMoveDown = async (beat, i) => {
    if (i === beats.length - 1) return
    const ids = beats.map(b => b.id)
    ;[ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]
    await reorderBeats(scene.id, ids)
  }

  if (editBeat !== null) {
    const isNew = !beatForm.id
    return (
      <div style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => setEditBeat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>←</button>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>
            {isNew ? 'New Beat' : `Edit: ${beatForm.title}`}
          </div>
          {saveMsg && <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</span>}
          <button onClick={handleSaveBeat} disabled={saving} style={{ padding: '7px 18px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Beat'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1', marginBottom: 16 }}>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={beatForm.title || ''} onChange={e => setBeatForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={beatForm.type || 'narrative'} onChange={e => setBeatForm(f => ({ ...f, type: e.target.value }))}>
              {BEAT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Trigger Text</label>
            <input style={inputStyle} value={beatForm.trigger_text || ''} onChange={e => setBeatForm(f => ({ ...f, trigger_text: e.target.value }))} placeholder="When players enter the clearing…" />
          </div>
        </div>

        <TextareaField label="Content (DM reads aloud)" value={beatForm.content} onChange={v => setBeatForm(f => ({ ...f, content: v }))} labelStyle={labelStyle} taStyle={{ ...taStyle, color: '#d4a080', fontStyle: 'italic' }} rows={5} />
        <TextareaField label="Player-Facing Text (if different)" value={beatForm.player_text} onChange={v => setBeatForm(f => ({ ...f, player_text: v }))} labelStyle={labelStyle} taStyle={taStyle} rows={3} />
        <TextareaField label="DM Notes" value={beatForm.dm_notes} onChange={v => setBeatForm(f => ({ ...f, dm_notes: v }))} labelStyle={labelStyle} taStyle={taStyle} rows={4} />
        <TextareaField label="Mechanical Effect" value={beatForm.mechanical_effect} onChange={v => setBeatForm(f => ({ ...f, mechanical_effect: v }))} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
        <TextareaField
          label="Atmosphere / flavour (optional — italic layer for DM)"
          value={beatForm.flavour_text || ''}
          onChange={v => setBeatForm(f => ({ ...f, flavour_text: v }))}
          labelStyle={labelStyle}
          taStyle={{ ...taStyle, fontStyle: 'italic', color: 'var(--text-muted)', opacity: 0.92 }}
          rows={2}
        />

        <BeatIllustrationUploader
          sceneId={scene.id}
          beatId={beatForm.id}
          illustrationUrl={beatForm.illustration_url || ''}
          onChange={(v) => setBeatForm((f) => ({ ...f, illustration_url: v }))}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
        />

        {beatForm.type === 'combat' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Stat Block</label>
            <select
              style={inputStyle}
              value={beatForm.stat_block_id || ''}
              onChange={e => setBeatForm(f => ({ ...f, stat_block_id: e.target.value || null }))}
            >
              <option value="">None</option>
              {statBlocks.map(sb => (
                <option key={sb.id} value={sb.id}>{sb.name} (CR {sb.cr})</option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>Beats</div>
        <button
          onClick={() => { setBeatForm(blankBeat(scene.id, beats.length + 1)); setEditBeat('__new__') }}
          style={{ padding: '7px 16px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          + Add Beat
        </button>
      </div>

      {beats.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No beats yet.</div>
      )}

      {beats.map((beat, i) => (
        <div key={beat.id} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '12px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <button type="button" onClick={() => handleMoveUp(beat, i)} disabled={i === 0} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--border)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase' }}>Move up</button>
            <button type="button" onClick={() => handleMoveDown(beat, i)} disabled={i === beats.length - 1} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: i === beats.length - 1 ? 'default' : 'pointer', color: i === beats.length - 1 ? 'var(--border)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase' }}>Move down</button>
          </div>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}</span>
          <BeatTypeBadge type={beat.type} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{beat.title}</div>
            {beat.content && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{beat.content.slice(0, 80)}</div>}
          </div>
          {beat.stat_block_id && <span style={{ ...mono, fontSize: 9, color: 'var(--danger)', border: '1px solid rgba(196,64,64,0.3)', padding: '2px 6px', borderRadius: 4 }}>STAT BLOCK</span>}
          <button onClick={() => setEditBeat(beat.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
          <button onClick={() => handleDeleteBeat(beat)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
        </div>
      ))}
    </div>
  )
}

function BeatTypeBadge({ type }) {
  const colors = BEAT_TYPE_COLOURS
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors[type] || 'var(--text-muted)', minWidth: 64 }}>
      {type}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Branches panel
// ---------------------------------------------------------------------------

function BranchesPanel({ scene, allScenes, saveBranch, deleteBranch, editBranch, setEditBranch, mono, inputStyle, labelStyle, taStyle }) {
  const branches = scene.branches || []
  const [branchForm, setBranchForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  function blankBranch() {
    return { scene_id: scene.id, order: branches.length + 1, label: '', description: '', condition_text: '', condition_type: 'explicit', target_scene_id: null, target_slug: '', is_dm_only: false }
  }

  useEffect(() => {
    if (editBranch && editBranch !== '__new__') {
      const found = branches.find(b => b.id === editBranch)
      if (found) setBranchForm(found)
    } else if (editBranch === '__new__') {
      setBranchForm(blankBranch())
    }
  }, [editBranch])

  const handleSave = async () => {
    setSaving(true)
    const result = await saveBranch(branchForm)
    setSaving(false)
    setSaveMsg(result.error ? { type: 'error', text: result.error } : { type: 'ok', text: 'Saved' })
    if (!result.error) setEditBranch(null)
  }

  const handleDelete = async (branch) => {
    const label = (branch.label || '').trim() || 'Unlabeled branch'
    if (
      !window.confirm(
        `Permanently delete branch "${label}"?\n\n` +
          'Linked scene routing for this branch will be removed. This cannot be undone.',
      )
    )
      return
    await deleteBranch(branch.id)
  }

  if (editBranch !== null) {
    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => setEditBranch(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>←</button>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>
            {editBranch === '__new__' ? 'New Branch' : 'Edit Branch'}
          </div>
          {saveMsg && <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</span>}
          <button onClick={handleSave} disabled={saving} style={{ padding: '7px 18px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Label (shown at branch picker)</label>
          <input style={inputStyle} value={branchForm.label || ''} onChange={e => setBranchForm(f => ({ ...f, label: e.target.value }))} placeholder="Left Path — The Druid's Cabin" />
        </div>
        <TextareaField label="Description (DM context)" value={branchForm.description} onChange={v => setBranchForm(f => ({ ...f, description: v }))} labelStyle={labelStyle} taStyle={taStyle} rows={2} />
        <TextareaField label="Condition (what triggers this branch)" value={branchForm.condition_text} onChange={v => setBranchForm(f => ({ ...f, condition_text: v }))} labelStyle={labelStyle} taStyle={taStyle} rows={2} />

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Condition Type</label>
          <select style={inputStyle} value={branchForm.condition_type || 'explicit'} onChange={e => setBranchForm(f => ({ ...f, condition_type: e.target.value }))}>
            {BRANCH_CONDITION_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Target Scene</label>
          <select
            style={inputStyle}
            value={branchForm.target_scene_id || ''}
            onChange={e => setBranchForm(f => ({ ...f, target_scene_id: e.target.value || null }))}
          >
            <option value="">— Select target scene —</option>
            {allScenes.filter(s => s.id !== scene.id).map(s => (
              <option key={s.id} value={s.id}>{s.title} ({s.slug || s.id.slice(0, 8)})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Target Slug (fallback if scene not created yet)</label>
          <input style={inputStyle} value={branchForm.target_slug || ''} onChange={e => setBranchForm(f => ({ ...f, target_slug: e.target.value }))} placeholder="s2-cabin" />
        </div>

        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="dm-only" checked={branchForm.is_dm_only || false} onChange={e => setBranchForm(f => ({ ...f, is_dm_only: e.target.checked }))} />
          <label htmlFor="dm-only" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>DM Only (hidden from players)</label>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>Branches</div>
        <button onClick={() => setEditBranch('__new__')} style={{ padding: '7px 16px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          + Add Branch
        </button>
      </div>

      {branches.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No branches. Add one to create a decision point at the end of this scene.</div>
      )}

      {branches.map(branch => {
        const target = branch.target_scene_id
          ? allScenes.find(s => s.id === branch.target_scene_id)
          : null
        return (
          <div key={branch.id} style={{ marginBottom: 10, padding: '14px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{branch.label}</div>
                {branch.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>{branch.description}</div>}
                {branch.condition_text && <div style={{ ...mono, fontSize: 10, color: 'var(--warning)', marginTop: 4 }}>Condition: {branch.condition_text}</div>}
                <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  → {target ? target.title : (branch.target_slug || 'No target set')}
                  {branch.is_dm_only && ' · DM only'}
                </div>
              </div>
              <button onClick={() => setEditBranch(branch.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
              <button onClick={() => handleDelete(branch)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function TextareaField({ label, value, onChange, labelStyle, taStyle, rows = 3 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={taStyle}
      />
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
      {label}
    </div>
  )
}
