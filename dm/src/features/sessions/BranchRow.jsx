import React, { useState, useEffect } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { mono, label9, inputBase, taBase, btnSm, btnDanger, btnGreen } from './outlinerStyles'
import LabelField from './LabelField'

const BRANCH_CONDITION_TYPES = ['explicit', 'implicit', 'conditional']

export default function BranchRow({ branch, sceneId, allScenes, expandedBranchId, setExpandedBranchId }) {
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
