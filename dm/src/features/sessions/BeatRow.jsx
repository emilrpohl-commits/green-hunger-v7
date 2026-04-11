import React, { useState, useEffect, useRef } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { BEAT_TYPES, BEAT_TYPE_COLOURS } from '@shared/lib/constants.js'
import { mono, label9, inputBase, taBase, btnSm, btnDanger, btnGreen } from './outlinerStyles'
import LabelField from './LabelField'
import SkillCheckTableEditor from './SkillCheckTableEditor'
import { BeatIllustrationUploader } from '../../components/SceneMediaUploader.jsx'

export default function BeatRow({ beat, index, total, sceneId, statBlocks, expandedBeatId, setExpandedBeatId }) {
  const saveBeat = useCampaignStore(s => s.saveBeat)
  const deleteBeat = useCampaignStore(s => s.deleteBeat)
  const reorderBeats = useCampaignStore(s => s.reorderBeats)
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0, alignItems: 'center', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => handleMove('up')} disabled={index === 0} style={{ ...btnSm, padding: '3px 6px', opacity: index === 0 ? 0.35 : 1, fontSize: 9, textTransform: 'uppercase' }}>Move up</button>
          <button type="button" onClick={() => handleMove('down')} disabled={index === total - 1} style={{ ...btnSm, padding: '3px 6px', opacity: index === total - 1 ? 0.35 : 1, fontSize: 9, textTransform: 'uppercase' }}>Move down</button>
          <button
            type="button"
            onClick={() => (isExpanded ? handleCollapse() : setExpandedBeatId(beat.id))}
            style={{ ...btnSm, padding: '3px 8px', color: isExpanded ? 'var(--green-bright)' : 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' }}
          >
            {isExpanded ? 'Close' : 'Edit'}
          </button>
          <button type="button" onClick={handleDelete} style={{ ...btnDanger, padding: '3px 8px', fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
        </div>
      </div>

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

          <BeatIllustrationUploader
            sceneId={sceneId}
            beatId={beat.id}
            illustrationUrl={form.illustration_url || ''}
            onChange={(v) => update('illustration_url', v)}
            labelStyle={label9}
            inputStyle={inputBase}
          />

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
