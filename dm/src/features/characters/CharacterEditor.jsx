import React, { useEffect, useMemo, useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import {
  ABILITIES,
  PHB_CLASSES,
  blankDbCharacter,
  dbRowToEditorForm,
  toAbilityBlock,
} from '@shared/lib/characterSheetShape.js'
import PortraitUploadField from '../../components/PortraitUploadField.jsx'
import CharacterSpellLinksPanel from './CharacterSpellLinksPanel.jsx'
import SRD_RACES from '../../../../docs/5e-database-main/src/2014/5e-SRD-Races.json'
import SRD_BACKGROUNDS from '../../../../docs/5e-database-main/src/2014/5e-SRD-Backgrounds.json'
import { formatDcWithLabel } from '@shared/lib/rules/dcDisplay.js'

function profBonusForLevel(level) {
  const l = Math.min(20, Math.max(1, Number(level) || 1))
  return `+${2 + Math.floor((l - 1) / 4)}`
}

export default function CharacterEditor() {
  const campaign = useCampaignStore((s) => s.campaign)
  const characters = useCampaignStore((s) => s.characters)
  const saveCharacter = useCampaignStore((s) => s.saveCharacter)
  const deleteCharacter = useCampaignStore((s) => s.deleteCharacter)

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => blankDbCharacter(null))
  const [wizardStep, setWizardStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [healingActionsText, setHealingActionsText] = useState('[]')
  const [buffActionsText, setBuffActionsText] = useState('[]')

  const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    ...mono,
    fontSize: 9,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: 5,
  }
  const taStyle = { ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }

  const raceNames = useMemo(
    () => [...new Set((SRD_RACES || []).map((r) => r.name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    []
  )
  const backgroundNames = useMemo(
    () => [...new Set((SRD_BACKGROUNDS || []).map((b) => b.name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    []
  )

  const filtered = characters.filter(
    (c) =>
      !search
      || String(c.name || '').toLowerCase().includes(search.toLowerCase())
      || String(c.player || '').toLowerCase().includes(search.toLowerCase())
      || String(c.class || '').toLowerCase().includes(search.toLowerCase())
  )

  const startNew = () => {
    setForm(blankDbCharacter(campaign?.id))
    setWizardStep(1)
    setEditing('__new__')
    setSaveMsg(null)
    setHealingActionsText('[]')
    setBuffActionsText('[]')
  }

  const startEdit = (row) => {
    setForm(dbRowToEditorForm(row))
    setWizardStep(0)
    setEditing(row.id)
    setSaveMsg(null)
    setHealingActionsText(JSON.stringify(row.healing_actions || [], null, 2))
    setBuffActionsText(JSON.stringify(row.buff_actions || [], null, 2))
  }

  const closeEditor = () => {
    setEditing(null)
    setWizardStep(0)
    setSaveMsg(null)
    setHealingActionsText('[]')
    setBuffActionsText('[]')
  }

  useEffect(() => {
    if (editing === '__new__' && campaign?.id) {
      setForm((f) => ({ ...f, campaign_id: campaign.id }))
    }
  }, [campaign?.id, editing])

  const setAbilityScore = (ab, raw) => {
    const n = Math.min(30, Math.max(1, Number(raw) || 10))
    setForm((f) => ({
      ...f,
      ability_scores: { ...f.ability_scores, [ab]: toAbilityBlock(n) },
    }))
  }

  const setStatField = (key, raw) => {
    setForm((f) => {
      const next = { ...f.stats }
      if (key === 'maxHp' || key === 'ac' || key === 'speed') {
        next[key] = Math.max(0, Number(raw) || 0)
      } else {
        next[key] = raw
      }
      return { ...f, stats: next }
    })
  }

  const toggleSaveProf = (ab) => {
    setForm((f) => {
      const list = Array.isArray(f.saving_throws) ? [...f.saving_throws] : []
      const i = list.indexOf(ab)
      if (i >= 0) list.splice(i, 1)
      else list.push(ab)
      return { ...f, saving_throws: list }
    })
  }

  const applyProfFromLevel = () => {
    setForm((f) => ({
      ...f,
      stats: { ...f.stats, proficiencyBonus: profBonusForLevel(f.level) },
    }))
  }

  const getSpellSlot = (lv) => {
    const k = String(lv)
    const pool = form.spell_slots && typeof form.spell_slots === 'object' ? form.spell_slots : {}
    const raw = pool[k] ?? pool[lv]
    const s = raw && typeof raw === 'object' ? raw : {}
    return { max: Math.max(0, Number(s.max) || 0), used: Math.max(0, Number(s.used) || 0) }
  }

  const patchSpellSlot = (lv, patch) => {
    const k = String(lv)
    setForm((f) => {
      const pool = f.spell_slots && typeof f.spell_slots === 'object' ? { ...f.spell_slots } : {}
      const raw = pool[k] ?? pool[lv]
      const s = raw && typeof raw === 'object' ? raw : {}
      const prev = { max: Math.max(0, Number(s.max) || 0), used: Math.max(0, Number(s.used) || 0) }
      pool[k] = { ...prev, ...patch }
      return { ...f, spell_slots: pool }
    })
  }

  const wizardNext = () => {
    if (wizardStep === 1 && !String(form.name || '').trim()) {
      setSaveMsg({ type: 'error', text: 'Name is required' })
      return
    }
    setSaveMsg(null)
    if (wizardStep < 4) setWizardStep(wizardStep + 1)
    else setWizardStep(0)
  }

  const wizardBack = () => {
    setSaveMsg(null)
    if (wizardStep <= 1) closeEditor()
    else setWizardStep(wizardStep - 1)
  }

  const handleSave = async () => {
    if (!String(form.name || '').trim()) {
      setSaveMsg({ type: 'error', text: 'Name is required' })
      return
    }
    let healing_actions = form.healing_actions
    let buff_actions = form.buff_actions
    try {
      healing_actions = JSON.parse(healingActionsText || '[]')
      if (!Array.isArray(healing_actions)) throw new Error('Healing actions must be a JSON array')
    } catch (e) {
      setSaveMsg({ type: 'error', text: `Healing actions JSON: ${e.message}` })
      return
    }
    try {
      buff_actions = JSON.parse(buffActionsText || '[]')
      if (!Array.isArray(buff_actions)) throw new Error('Buff actions must be a JSON array')
    } catch (e) {
      setSaveMsg({ type: 'error', text: `Buff actions JSON: ${e.message}` })
      return
    }
    setSaving(true)
    const result = await saveCharacter({
      ...form,
      campaign_id: campaign?.id,
      healing_actions,
      buff_actions,
    })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else {
      setSaveMsg({ type: 'ok', text: 'Saved' })
      setForm(dbRowToEditorForm(result.data))
      setHealingActionsText(JSON.stringify(result.data.healing_actions || [], null, 2))
      setBuffActionsText(JSON.stringify(result.data.buff_actions || [], null, 2))
      if (editing === '__new__') setEditing(result.data.id)
      setWizardStep(0)
    }
  }

  const handleDelete = async () => {
    if (editing === '__new__' || !form.id) return
    if (!window.confirm(`Delete character “${form.name}”? This cannot be undone.`)) return
    const { error } = await deleteCharacter(form.id)
    if (error) setSaveMsg({ type: 'error', text: error })
    else closeEditor()
  }

  if (!campaign) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        Load a campaign to edit characters.
      </div>
    )
  }

  if (editing !== null) {
    const showWizard = editing === '__new__' && wizardStep >= 1 && wizardStep <= 4

    return (
      <div style={{ padding: 24, maxWidth: 920 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={closeEditor}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 18,
              padding: 0,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
            {editing === '__new__' ? 'New character' : `Edit: ${form.name}`}
          </div>
          {saveMsg && (
            <span
              style={{
                ...mono,
                fontSize: 11,
                color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)',
              }}
            >
              {saveMsg.text}
            </span>
          )}
          {editing !== '__new__' && (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid rgba(196,64,64,0.35)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--danger)',
                ...mono,
                fontSize: 10,
                textTransform: 'uppercase',
              }}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px',
              background: 'var(--green-bright)',
              color: '#0a0f0a',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {showWizard && (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
            }}
          >
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>
              Quick setup · Step {wizardStep} of 4
            </div>
            {wizardStep === 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Character name</label>
                  <input
                    style={inputStyle}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Aeris Greenleaf"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Player name</label>
                  <input
                    style={inputStyle}
                    value={form.player || ''}
                    onChange={(e) => setForm((f) => ({ ...f, player: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Login password (optional)</label>
                  <input
                    style={inputStyle}
                    type="password"
                    autoComplete="new-password"
                    value={form.password || ''}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>
            )}
            {wizardStep === 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Species / race</label>
                  <input
                    style={inputStyle}
                    list="gh-race-options"
                    value={form.species || ''}
                    onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
                    placeholder="SRD pick or custom"
                  />
                  <datalist id="gh-race-options">
                    {raceNames.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>Background</label>
                  <input
                    style={inputStyle}
                    list="gh-bg-options"
                    value={form.background || ''}
                    onChange={(e) => setForm((f) => ({ ...f, background: e.target.value }))}
                  />
                  <datalist id="gh-bg-options">
                    {backgroundNames.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>Class</label>
                  <select
                    style={inputStyle}
                    value={form.class || 'Fighter'}
                    onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  >
                    {PHB_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subclass</label>
                  <input
                    style={inputStyle}
                    value={form.subclass || ''}
                    onChange={(e) => setForm((f) => ({ ...f, subclass: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Level</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    max={20}
                    value={form.level}
                    onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            )}
            {wizardStep === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {ABILITIES.map((ab) => (
                  <div key={ab}>
                    <label style={labelStyle}>{ab}</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min={1}
                      max={30}
                      value={form.ability_scores?.[ab]?.score ?? 10}
                      onChange={(e) => setAbilityScore(ab, e.target.value)}
                    />
                    <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      mod {form.ability_scores?.[ab]?.mod ?? '+0'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {wizardStep === 4 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Max HP</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    value={form.stats?.maxHp ?? 10}
                    onChange={(e) => setStatField('maxHp', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>AC</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    value={form.stats?.ac ?? 10}
                    onChange={(e) => setStatField('ac', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Speed (ft)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    value={form.stats?.speed ?? 30}
                    onChange={(e) => setStatField('speed', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Initiative</label>
                  <input
                    style={inputStyle}
                    value={form.stats?.initiative ?? '+0'}
                    onChange={(e) => setStatField('initiative', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Proficiency</label>
                  <input
                    style={inputStyle}
                    value={form.stats?.proficiencyBonus ?? '+2'}
                    onChange={(e) => setStatField('proficiencyBonus', e.target.value)}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button
                    type="button"
                    onClick={applyProfFromLevel}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(100,200,100,0.08)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      ...mono,
                      fontSize: 10,
                      textTransform: 'uppercase',
                    }}
                  >
                    Set proficiency from level ({profBonusForLevel(form.level)})
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={wizardBack}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  ...mono,
                  fontSize: 11,
                }}
              >
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                type="button"
                onClick={wizardNext}
                style={{
                  padding: '8px 16px',
                  background: 'var(--green-bright)',
                  color: '#0a0f0a',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  ...mono,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {wizardStep === 4 ? 'Done — full sheet below' : 'Next'}
              </button>
            </div>
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--green-bright)', marginBottom: 14 }}>
          Full sheet
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Player</label>
            <input
              style={inputStyle}
              value={form.player || ''}
              onChange={(e) => setForm((f) => ({ ...f, player: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              autoComplete="new-password"
              value={form.password || ''}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Species</label>
            <input
              style={inputStyle}
              list="gh-race-options-2"
              value={form.species || ''}
              onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
            />
            <datalist id="gh-race-options-2">
              {raceNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>Background</label>
            <input
              style={inputStyle}
              list="gh-bg-options-2"
              value={form.background || ''}
              onChange={(e) => setForm((f) => ({ ...f, background: e.target.value }))}
            />
            <datalist id="gh-bg-options-2">
              {backgroundNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>Class</label>
            <select
              style={inputStyle}
              value={form.class || 'Fighter'}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
            >
              {PHB_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Subclass</label>
            <input
              style={inputStyle}
              value={form.subclass || ''}
              onChange={(e) => setForm((f) => ({ ...f, subclass: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Level</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={20}
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) || 1 }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Accent colour</label>
            <input
              style={{ ...inputStyle, height: 40, padding: 4 }}
              type="color"
              value={form.colour || '#6f9b7a'}
              onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, paddingBottom: 8 }}>
            <label style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!form.is_npc}
                onChange={(e) => setForm((f) => ({ ...f, is_npc: e.target.checked }))}
              />
              NPC
            </label>
            <label style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active !== false}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <PortraitUploadField
              label="Portrait (Stage 7)"
              campaignId={campaign?.id}
              entityType="characters"
              entityId={editing === '__new__' ? form.id : editing}
              storagePath={form.portrait_original_storage_path}
              crop={form.portrait_crop}
              onChange={({ storagePath, crop }) => setForm((f) => ({
                ...f,
                portrait_original_storage_path: storagePath,
                portrait_crop: crop,
                portrait_thumb_storage_path: null,
              }))}
            />
          </div>
        </div>

        <div style={{ marginTop: 8, marginBottom: 14 }}>
          <label style={labelStyle}>Ability scores</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {ABILITIES.map((ab) => (
              <div key={ab}>
                <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>{ab}</div>
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  max={30}
                  value={form.ability_scores?.[ab]?.score ?? 10}
                  onChange={(e) => setAbilityScore(ab, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Max HP</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.stats?.maxHp ?? 10}
              onChange={(e) => setStatField('maxHp', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>AC</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.stats?.ac ?? 10}
              onChange={(e) => setStatField('ac', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Speed</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.stats?.speed ?? 30}
              onChange={(e) => setStatField('speed', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Initiative</label>
            <input
              style={inputStyle}
              value={form.stats?.initiative ?? '+0'}
              onChange={(e) => setStatField('initiative', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Proficiency</label>
            <input
              style={inputStyle}
              value={form.stats?.proficiencyBonus ?? '+2'}
              onChange={(e) => setStatField('proficiencyBonus', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Spell attack</label>
            <input
              style={inputStyle}
              value={form.stats?.spellAttack ?? ''}
              onChange={(e) => setStatField('spellAttack', e.target.value)}
              placeholder="+0"
            />
          </div>
          <div>
            <label style={labelStyle}>Spell save DC</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              max={30}
              value={form.stats?.spellSaveDC ?? ''}
              onChange={(e) => setStatField('spellSaveDC', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="—"
            />
            {form.stats?.spellSaveDC !== '' && form.stats?.spellSaveDC != null && (
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {formatDcWithLabel(form.stats.spellSaveDC)}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Spellcasting ability</label>
            <input
              style={inputStyle}
              value={form.stats?.spellcastingAbility ?? ''}
              onChange={(e) => setStatField('spellcastingAbility', e.target.value)}
              placeholder="Charisma"
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Saving throw proficiencies</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ABILITIES.map((ab) => (
              <label
                key={ab}
                style={{
                  ...mono,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={Array.isArray(form.saving_throws) && form.saving_throws.includes(ab)}
                  onChange={() => toggleSaveProf(ab)}
                />
                {ab}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Languages</label>
          <input
            style={inputStyle}
            value={form.languages ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value || null }))}
            placeholder="Common, Elvish…"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...taStyle }} rows={3} value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Backstory</label>
          <textarea style={{ ...taStyle }} rows={5} value={form.backstory || ''} onChange={(e) => setForm((f) => ({ ...f, backstory: e.target.value }))} />
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--green-bright)', marginBottom: 12, marginTop: 8 }}>
          Sheet details
        </div>
        <p style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
          Spell lists for the player app use the <strong>character_spells</strong> table, keyed to the full <strong>spell compendium</strong>. Link spells below or use Character Import. Slot counts below live on the character row.
        </p>

        {editing && editing !== '__new__' && <CharacterSpellLinksPanel characterId={editing} />}

        <div style={{ marginBottom: 16, padding: 14, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          <label style={labelStyle}>Spell slots (by level)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 8 }}>
            {SPELL_SLOT_LEVELS.map((lv) => {
              const s = getSpellSlot(lv)
              return (
                <div key={lv} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>Level {lv}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      style={{ ...inputStyle, width: 48, padding: '6px 8px' }}
                      type="number"
                      min={0}
                      title="Max slots"
                      value={s.max}
                      onChange={(e) => patchSpellSlot(lv, { max: Math.max(0, Number(e.target.value) || 0) })}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/</span>
                    <input
                      style={{ ...inputStyle, width: 48, padding: '6px 8px' }}
                      type="number"
                      min={0}
                      title="Used"
                      value={s.used}
                      onChange={(e) => patchSpellSlot(lv, { used: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                  <span style={{ ...mono, fontSize: 8, color: 'var(--text-muted)' }}>max · used</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16, padding: 14, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Sorcery points</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sorcery_points: { max: 0, used: 0 } }))}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  ...mono,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Add track
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sorcery_points: null }))}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  ...mono,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>
          {form.sorcery_points != null && typeof form.sorcery_points === 'object' && (
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <div>
                <label style={labelStyle}>Max</label>
                <input
                  style={{ ...inputStyle, width: 72 }}
                  type="number"
                  min={0}
                  value={Number(form.sorcery_points.max) || 0}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    sorcery_points: { ...(f.sorcery_points || {}), max: Math.max(0, Number(e.target.value) || 0) },
                  }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Used</label>
                <input
                  style={{ ...inputStyle, width: 72 }}
                  type="number"
                  min={0}
                  value={Number(form.sorcery_points.used) || 0}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    sorcery_points: { ...(f.sorcery_points || {}), used: Math.max(0, Number(e.target.value) || 0) },
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Senses</label>
          <input
            style={inputStyle}
            value={form.senses ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, senses: e.target.value || null }))}
            placeholder="Darkvision 60 ft., etc."
          />
        </div>

        <div style={{ marginBottom: 16, padding: 14, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          <label style={labelStyle}>Passive scores</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
            {['perception', 'insight', 'investigation'].map((key) => (
              <div key={key}>
                <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'capitalize' }}>{key}</div>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={form.passive_scores?.[key] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0)
                    setForm((f) => ({
                      ...f,
                      passive_scores: { ...(f.passive_scores || {}), [key]: v },
                    }))
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Skills</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                skills: [...(Array.isArray(f.skills) ? f.skills : []), { name: '', mod: '+0', ability: 'DEX', proficient: false, expertise: false }],
              }))}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                ...mono,
                background: 'rgba(100,200,100,0.1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--green-bright)',
              }}
            >
              + Add skill
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Array.isArray(form.skills) ? form.skills : []).map((sk, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 64px 72px auto auto auto',
                  gap: 8,
                  alignItems: 'end',
                  padding: 8,
                  background: 'var(--bg-raised)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>Name</div>
                  <input
                    style={inputStyle}
                    value={sk.name ?? ''}
                    onChange={(e) => {
                      const skills = [...(Array.isArray(form.skills) ? form.skills : [])]
                      skills[idx] = { ...skills[idx], name: e.target.value }
                      setForm((f) => ({ ...f, skills }))
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>Mod</div>
                  <input
                    style={inputStyle}
                    value={sk.mod ?? ''}
                    onChange={(e) => {
                      const skills = [...(Array.isArray(form.skills) ? form.skills : [])]
                      skills[idx] = { ...skills[idx], mod: e.target.value }
                      setForm((f) => ({ ...f, skills }))
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>Abi</div>
                  <select
                    style={inputStyle}
                    value={sk.ability || 'DEX'}
                    onChange={(e) => {
                      const skills = [...(Array.isArray(form.skills) ? form.skills : [])]
                      skills[idx] = { ...skills[idx], ability: e.target.value }
                      setForm((f) => ({ ...f, skills }))
                    }}
                  >
                    {ABILITIES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <label style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', paddingBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={!!sk.proficient}
                    onChange={(e) => {
                      const skills = [...(Array.isArray(form.skills) ? form.skills : [])]
                      skills[idx] = { ...skills[idx], proficient: e.target.checked }
                      setForm((f) => ({ ...f, skills }))
                    }}
                  />
                  Prof
                </label>
                <label style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', paddingBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={!!sk.expertise}
                    onChange={(e) => {
                      const skills = [...(Array.isArray(form.skills) ? form.skills : [])]
                      skills[idx] = { ...skills[idx], expertise: e.target.checked }
                      setForm((f) => ({ ...f, skills }))
                    }}
                  />
                  Exp
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const skills = (Array.isArray(form.skills) ? form.skills : []).filter((_, i) => i !== idx)
                    setForm((f) => ({ ...f, skills }))
                  }}
                  style={{
                    padding: '6px 8px',
                    fontSize: 10,
                    ...mono,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Class features & traits</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                features: [...(Array.isArray(f.features) ? f.features : []), { name: '', uses: '', description: '' }],
              }))}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                ...mono,
                background: 'rgba(100,200,100,0.1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--green-bright)',
              }}
            >
              + Add feature
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(Array.isArray(form.features) ? form.features : []).map((ft, idx) => (
              <div key={idx} style={{ padding: 10, background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input
                    style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                    placeholder="Name"
                    value={ft.name ?? ''}
                    onChange={(e) => {
                      const features = [...(Array.isArray(form.features) ? form.features : [])]
                      features[idx] = { ...features[idx], name: e.target.value }
                      setForm((f) => ({ ...f, features }))
                    }}
                  />
                  <input
                    style={{ ...inputStyle, width: 180 }}
                    placeholder="Uses (e.g. 4 / LR)"
                    value={ft.uses ?? ''}
                    onChange={(e) => {
                      const features = [...(Array.isArray(form.features) ? form.features : [])]
                      features[idx] = { ...features[idx], uses: e.target.value }
                      setForm((f) => ({ ...f, features }))
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const features = (Array.isArray(form.features) ? form.features : []).filter((_, i) => i !== idx)
                      setForm((f) => ({ ...f, features }))
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: 10,
                      ...mono,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  style={{ ...taStyle }}
                  rows={3}
                  placeholder="Description"
                  value={ft.description ?? ''}
                  onChange={(e) => {
                    const features = [...(Array.isArray(form.features) ? form.features : [])]
                    features[idx] = { ...features[idx], description: e.target.value }
                    setForm((f) => ({ ...f, features }))
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Weapons & attacks</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                weapons: [...(Array.isArray(f.weapons) ? f.weapons : []), { name: '', hit: '', damage: '', notes: '' }],
              }))}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                ...mono,
                background: 'rgba(100,200,100,0.1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--green-bright)',
              }}
            >
              + Add weapon
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Array.isArray(form.weapons) ? form.weapons : []).map((w, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 1fr 1fr auto',
                  gap: 8,
                  alignItems: 'end',
                  padding: 8,
                  background: 'var(--bg-raised)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>Name</div>
                  <input
                    style={inputStyle}
                    value={w.name ?? ''}
                    onChange={(e) => {
                      const weapons = [...(Array.isArray(form.weapons) ? form.weapons : [])]
                      weapons[idx] = { ...weapons[idx], name: e.target.value }
                      setForm((f) => ({ ...f, weapons }))
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>To hit</div>
                  <input
                    style={inputStyle}
                    value={w.hit ?? ''}
                    onChange={(e) => {
                      const weapons = [...(Array.isArray(form.weapons) ? form.weapons : [])]
                      weapons[idx] = { ...weapons[idx], hit: e.target.value }
                      setForm((f) => ({ ...f, weapons }))
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>Damage</div>
                  <input
                    style={inputStyle}
                    value={w.damage ?? ''}
                    onChange={(e) => {
                      const weapons = [...(Array.isArray(form.weapons) ? form.weapons : [])]
                      weapons[idx] = { ...weapons[idx], damage: e.target.value }
                      setForm((f) => ({ ...f, weapons }))
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>Notes</div>
                  <input
                    style={inputStyle}
                    value={w.notes ?? ''}
                    onChange={(e) => {
                      const weapons = [...(Array.isArray(form.weapons) ? form.weapons : [])]
                      weapons[idx] = { ...weapons[idx], notes: e.target.value }
                      setForm((f) => ({ ...f, weapons }))
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const weapons = (Array.isArray(form.weapons) ? form.weapons : []).filter((_, i) => i !== idx)
                    setForm((f) => ({ ...f, weapons }))
                  }}
                  style={{
                    padding: '6px 8px',
                    fontSize: 10,
                    ...mono,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Equipment (one item per line)</label>
          <textarea
            style={{ ...taStyle }}
            rows={6}
            value={Array.isArray(form.equipment) ? form.equipment.join('\n') : ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)
              setForm((f) => ({ ...f, equipment: lines }))
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Magic items</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                magic_items: [...(Array.isArray(f.magic_items) ? f.magic_items : []), { name: '', description: '' }],
              }))}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                ...mono,
                background: 'rgba(100,200,100,0.1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--green-bright)',
              }}
            >
              + Add item
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(Array.isArray(form.magic_items) ? form.magic_items : []).map((mi, idx) => (
              <div key={idx} style={{ padding: 10, background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Name"
                    value={mi.name ?? ''}
                    onChange={(e) => {
                      const magic_items = [...(Array.isArray(form.magic_items) ? form.magic_items : [])]
                      magic_items[idx] = { ...magic_items[idx], name: e.target.value }
                      setForm((f) => ({ ...f, magic_items }))
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const magic_items = (Array.isArray(form.magic_items) ? form.magic_items : []).filter((_, i) => i !== idx)
                      setForm((f) => ({ ...f, magic_items }))
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: 10,
                      ...mono,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  style={{ ...taStyle }}
                  rows={2}
                  placeholder="Description"
                  value={mi.description ?? ''}
                  onChange={(e) => {
                    const magic_items = [...(Array.isArray(form.magic_items) ? form.magic_items : [])]
                    magic_items[idx] = { ...magic_items[idx], description: e.target.value }
                    setForm((f) => ({ ...f, magic_items }))
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Healing actions (JSON array)</label>
          <textarea
            style={{ ...taStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }}
            rows={5}
            value={healingActionsText}
            onChange={(e) => setHealingActionsText(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Buff actions (JSON array)</label>
          <textarea
            style={{ ...taStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }}
            rows={5}
            value={buffActionsText}
            onChange={(e) => setBuffActionsText(e.target.value)}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>Character sheets</div>
        <button
          type="button"
          onClick={startNew}
          style={{
            padding: '8px 18px',
            background: 'var(--green-bright)',
            color: '#0a0f0a',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          + New character
        </button>
      </div>
      <p style={{ ...mono, fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Edit any campaign PC here (identity, stats, skills, features, gear, slots). Run mode and the player app read from the same database row after reload.
      </p>
      <input
        type="search"
        placeholder="Search by name, player, or class…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 14px',
          marginBottom: 20,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No characters in this campaign yet. Create one or import a PDF from Character Import.
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: c.colour || 'var(--green-mid)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {c.class}
                {c.level != null ? ` ${c.level}` : ''}
                {c.species ? ` · ${c.species}` : ''}
                {c.player ? ` · ${c.player}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => startEdit(c)}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                ...mono,
                fontSize: 9,
                textTransform: 'uppercase',
              }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
