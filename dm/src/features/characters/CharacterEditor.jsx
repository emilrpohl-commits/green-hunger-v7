import React, { useEffect, useMemo, useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import {
  ABILITIES,
  PHB_CLASSES,
  blankDbCharacter,
  dbRowToEditorForm,
  toAbilityBlock,
} from '@shared/lib/characterSheetShape.js'
import SRD_RACES from '../../../../docs/5e-database-main/src/2014/5e-SRD-Races.json'
import SRD_BACKGROUNDS from '../../../../docs/5e-database-main/src/2014/5e-SRD-Backgrounds.json'

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
  }

  const startEdit = (row) => {
    setForm(dbRowToEditorForm(row))
    setWizardStep(0)
    setEditing(row.id)
    setSaveMsg(null)
  }

  const closeEditor = () => {
    setEditing(null)
    setWizardStep(0)
    setSaveMsg(null)
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
    setSaving(true)
    const result = await saveCharacter({ ...form, campaign_id: campaign?.id })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else {
      setSaveMsg({ type: 'ok', text: 'Saved' })
      setForm(dbRowToEditorForm(result.data))
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
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>Characters</div>
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
