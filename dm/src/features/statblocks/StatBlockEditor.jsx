import React, { useState, useEffect } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { validateStatBlock } from '@shared/lib/statBlockActions.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import PortraitUploadField from '../../components/PortraitUploadField.jsx'

const ABILITY_SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']
const DAMAGE_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder']
const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious']

function abilityMod(score) {
  return Math.floor((score - 10) / 2)
}

function blankStatBlock() {
  return {
    name: '',
    source: '',
    creature_type: '',
    size: 'Medium',
    alignment: '',
    cr: '1',
    proficiency_bonus: 2,
    ac: 12,
    ac_note: '',
    max_hp: 20,
    hit_dice: '',
    speed: '30 ft.',
    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    saving_throws: [],
    skills: [],
    resistances: [],
    immunities: { damage: [], condition: [] },
    vulnerabilities: [],
    senses: 'Passive Perception 10',
    languages: '—',
    traits: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    legendary_actions: [],
    combat_prompts: [],
    dm_notes: [],
    tags: [],
    slug: '',
    portrait_original_storage_path: null,
    portrait_crop: { unit: 'relative', x: 0.12, y: 0.08, width: 0.76, height: 0.84, zoom: 1.0 },
    portrait_thumb_storage_path: null,
  }
}

export default function StatBlockEditor({ statBlockId, onClose }) {
  const campaign = useCampaignStore(s => s.campaign)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const saveStatBlock = useCampaignStore(s => s.saveStatBlock)
  const [form, setForm] = useState(blankStatBlock())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [validationWarnings, setValidationWarnings] = useState([])
  const [activeTab, setActiveTab] = useState('core')
  const [monsterEngineIndex, setMonsterEngineIndex] = useState('')
  const [monsterPrefillBusy, setMonsterPrefillBusy] = useState(false)
  const [prefillNotice, setPrefillNotice] = useState(null)
  const canEngineMonsterPrefill = featureFlags.use5eEngine && featureFlags.engineMonsters

  useEffect(() => {
    if (statBlockId) {
      const sb = statBlocks.find(s => s.id === statBlockId)
      if (sb) {
        setForm({
          ...blankStatBlock(),
          ...sb,
          ability_scores: sb.ability_scores || blankStatBlock().ability_scores,
          immunities: sb.immunities || { damage: [], condition: [] },
          saving_throws: sb.saving_throws || [],
          skills: sb.skills || [],
          resistances: sb.resistances || [],
          vulnerabilities: sb.vulnerabilities || [],
          traits: sb.traits || [],
          actions: sb.actions || [],
          bonus_actions: sb.bonus_actions || [],
          reactions: sb.reactions || [],
          legendary_actions: sb.legendary_actions || [],
          combat_prompts: sb.combat_prompts || [],
          dm_notes: Array.isArray(sb.dm_notes) ? sb.dm_notes : sb.dm_notes ? [sb.dm_notes] : [],
          tags: sb.tags || [],
          portrait_original_storage_path: sb.portrait_original_storage_path || null,
          portrait_crop: sb.portrait_crop || blankStatBlock().portrait_crop,
          portrait_thumb_storage_path: sb.portrait_thumb_storage_path || null,
        })
      }
    }
  }, [statBlockId, statBlocks])

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  const updateAbility = (stat, value) => {
    setForm(f => ({ ...f, ability_scores: { ...f.ability_scores, [stat]: parseInt(value) || 10 } }))
    setSaved(false)
  }

  /** Phase 2F: pull SRD-style monster from configured 5e engine into this form (review before save). */
  const prefillMonsterFromEngine = async () => {
    const idx = monsterEngineIndex.trim()
    if (!idx) return
    setMonsterPrefillBusy(true)
    setSaveError(null)
    setPrefillNotice(null)
    try {
      const { getResource } = await import('@shared/lib/engine/dnd5eClient.js')
      const { engineConfig } = await import('@shared/lib/engine/config.js')
      const m = await getResource('monsters', idx, { ruleset: engineConfig.primaryRuleset })
      if (!m) throw new Error('Empty response')
      const scores = m.ability_scores || {}
      const nextScores = { ...blankStatBlock().ability_scores }
      for (const k of ABILITY_SCORES) {
        if (scores[k] != null) nextScores[k] = scores[k]
      }
      let speedStr = form.speed
      if (typeof m.speed === 'string') speedStr = m.speed
      else if (m.speed && typeof m.speed === 'object') {
        speedStr = Object.entries(m.speed).map(([k, v]) => `${k} ${v}`).join(', ')
      }
      const acVal = m.armor_class?.[0]?.value ?? m.ac ?? form.ac
      const hpVal = m.hit_points ?? m.max_hp ?? form.max_hp
      const act = Array.isArray(m.actions) ? m.actions.map((a) => ({ name: a.name, desc: Array.isArray(a.desc) ? a.desc.join('\n') : (a.desc || '') })) : form.actions
      setForm((f) => ({
        ...f,
        name: m.name || f.name,
        creature_type: m.type || m.creature_type || f.creature_type,
        size: m.size || f.size,
        alignment: m.alignment || f.alignment,
        cr: m.challenge_rating != null ? String(m.challenge_rating) : f.cr,
        ac: Number(acVal) || f.ac,
        max_hp: Number(hpVal) || f.max_hp,
        hit_dice: m.hit_dice || f.hit_dice,
        speed: speedStr || f.speed,
        ability_scores: nextScores,
        senses: m.senses || f.senses,
        languages: typeof m.languages === 'string' ? m.languages : f.languages,
        actions: act,
        slug: f.slug || (m.index || m.slug || '').replace(/\s+/g, '-'),
        source: f.source || m.source || '5e Engine',
      }))
      setSaved(false)
      setPrefillNotice('Form updated from the 5e reference — review and Save to store your campaign copy (DB is source of truth).')
    } catch (e) {
      setSaveError(String(e?.message || e))
    }
    setMonsterPrefillBusy(false)
  }

  const handleSave = async () => {
    const { warnings } = validateStatBlock(form)
    setValidationWarnings(warnings)
    setSaving(true)
    setSaveError(null)
    const result = await saveStatBlock({ ...form, id: statBlockId || undefined })
    setSaving(false)
    if (result.error) {
      setSaveError(result.error)
    } else {
      setSaved(true)
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
  const fieldStyle = { marginBottom: 16 }

  const TABS = [
    { id: 'core', label: 'Core' },
    { id: 'abilities', label: 'Abilities' },
    { id: 'traits', label: 'Traits' },
    { id: 'actions', label: 'Actions' },
    { id: 'extras', label: 'Prompts & Notes' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-surface)',
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
            {statBlockId ? `Edit: ${form.name || 'Untitled'}` : 'New Stat Block'}
          </div>
        </div>
        {saveError && <div style={{ ...mono, fontSize: 11, color: 'var(--danger)' }}>{saveError}</div>}
        {validationWarnings.length > 0 && (
          <div style={{ ...mono, fontSize: 10, color: 'var(--warning)', maxWidth: 280 }} title={validationWarnings.join('\n')}>
            {validationWarnings.length} action warning(s) — hover for list
          </div>
        )}
        {saved && <div style={{ ...mono, fontSize: 11, color: 'var(--green-bright)' }}>Saved</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px', background: 'var(--green-bright)', color: '#0a0f0a',
            border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', background: 'none',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--green-bright)' : '2px solid transparent',
              ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeTab === 'core' && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ ...fieldStyle, gridColumn: '1/-1' }}>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Corrupted Wolf" />
              </div>
              <Field label="Creature Type" value={form.creature_type} onChange={v => update('creature_type', v)} placeholder="Beast (Corrupted)" style={inputStyle} labelStyle={labelStyle} />
              <div style={fieldStyle}>
                <label style={labelStyle}>Size</label>
                <select style={inputStyle} value={form.size} onChange={e => update('size', e.target.value)}>
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="Alignment" value={form.alignment} onChange={v => update('alignment', v)} placeholder="Unaligned" style={inputStyle} labelStyle={labelStyle} />
              <Field label="CR" value={form.cr} onChange={v => update('cr', v)} placeholder="1/2" style={inputStyle} labelStyle={labelStyle} />
              <Field label="Proficiency Bonus" value={form.proficiency_bonus} onChange={v => update('proficiency_bonus', parseInt(v) || 2)} type="number" style={inputStyle} labelStyle={labelStyle} />
              <Field label="AC" value={form.ac} onChange={v => update('ac', parseInt(v) || 10)} type="number" style={inputStyle} labelStyle={labelStyle} />
              <Field label="AC Note" value={form.ac_note} onChange={v => update('ac_note', v)} placeholder="natural armour" style={inputStyle} labelStyle={labelStyle} />
              <Field label="Max HP" value={form.max_hp} onChange={v => update('max_hp', parseInt(v) || 1)} type="number" style={inputStyle} labelStyle={labelStyle} />
              <Field label="Hit Dice" value={form.hit_dice} onChange={v => update('hit_dice', v)} placeholder="2d8+4" style={inputStyle} labelStyle={labelStyle} />
              <div style={{ ...fieldStyle, gridColumn: '1/-1' }}>
                <Field label="Speed" value={form.speed} onChange={v => update('speed', v)} placeholder="30 ft." style={inputStyle} labelStyle={labelStyle} />
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1/-1' }}>
                <Field label="Senses" value={form.senses} onChange={v => update('senses', v)} placeholder="Darkvision 60 ft., Passive Perception 10" style={inputStyle} labelStyle={labelStyle} />
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1/-1' }}>
                <Field label="Languages" value={form.languages} onChange={v => update('languages', v)} placeholder="Common, —" style={inputStyle} labelStyle={labelStyle} />
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1/-1' }}>
                <Field label="Source" value={form.source} onChange={v => update('source', v)} placeholder="PHB, Custom, etc." style={inputStyle} labelStyle={labelStyle} />
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1/-1' }}>
                <Field label="Slug (stable ID)" value={form.slug} onChange={v => update('slug', v)} placeholder="corrupted-wolf" style={inputStyle} labelStyle={labelStyle} />
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1/-1', padding: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <label style={labelStyle}>Prefill from 5e engine (monster index)</label>
                <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.45 }}>
                  Fills the form from the external 5e dataset as a starting point. Your campaign stat blocks in the database remain canonical — use Save here to persist an editable copy.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                    value={monsterEngineIndex}
                    onChange={(e) => setMonsterEngineIndex(e.target.value)}
                    placeholder="e.g. adult-black-dragon"
                    disabled={!canEngineMonsterPrefill}
                  />
                  <button
                    type="button"
                    disabled={monsterPrefillBusy || !canEngineMonsterPrefill}
                    title={!canEngineMonsterPrefill ? 'Turn on VITE_USE_5E_ENGINE and VITE_ENGINE_MONSTERS' : undefined}
                    onClick={prefillMonsterFromEngine}
                    style={{
                      padding: '8px 14px', ...mono, fontSize: 10, textTransform: 'uppercase',
                      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      color: canEngineMonsterPrefill ? 'var(--green-bright)' : 'var(--text-muted)',
                      cursor: monsterPrefillBusy || !canEngineMonsterPrefill ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {monsterPrefillBusy ? 'Loading…' : 'Merge into form'}
                  </button>
                </div>
                {prefillNotice && (
                  <div style={{ ...mono, fontSize: 10, color: 'var(--green-bright)', marginTop: 8 }}>
                    {prefillNotice}
                  </div>
                )}
              </div>
            </div>

            {/* Images */}
            <SectionDivider label="Images" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <PortraitUploadField
                  label="Portrait (Stage 7)"
                  campaignId={campaign?.id}
                  entityType="stat_blocks"
                  entityId={statBlockId || form.slug || form.name || '__new__'}
                  storagePath={form.portrait_original_storage_path}
                  crop={form.portrait_crop}
                  legacyUrl={form.portrait_url || null}
                  onChange={({ storagePath, crop, publicUrl }) => {
                    update('portrait_original_storage_path', storagePath)
                    update('portrait_crop', crop)
                    update('portrait_thumb_storage_path', null)
                    update('portrait_url', publicUrl || null)
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Token</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <label style={{
                    padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    Upload
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => update('token_url', ev.target.result)
                      reader.readAsDataURL(file)
                    }} />
                  </label>
                  <input style={inputStyle} value={form.token_url?.startsWith('data:') ? '' : (form.token_url || '')} onChange={e => update('token_url', e.target.value)} placeholder="or paste URL…" />
                </div>
                {form.token_url && (
                  <img src={form.token_url} alt="token preview" style={{ marginTop: 4, width: 60, height: 60, objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--border)' }} onError={e => { e.target.style.display = 'none' }} />
                )}
              </div>
            </div>

            {/* Resistances / Immunities / Vulnerabilities */}
            <SectionDivider label="Defenses" />
            <ChecklistField
              label="Resistances"
              options={DAMAGE_TYPES}
              selected={form.resistances}
              onChange={v => update('resistances', v)}
              labelStyle={labelStyle}
            />
            <ChecklistField
              label="Damage Immunities"
              options={DAMAGE_TYPES}
              selected={form.immunities?.damage || []}
              onChange={v => update('immunities', { ...form.immunities, damage: v })}
              labelStyle={labelStyle}
            />
            <ChecklistField
              label="Condition Immunities"
              options={CONDITIONS}
              selected={form.immunities?.condition || []}
              onChange={v => update('immunities', { ...form.immunities, condition: v })}
              labelStyle={labelStyle}
            />
            <ChecklistField
              label="Vulnerabilities"
              options={DAMAGE_TYPES}
              selected={form.vulnerabilities}
              onChange={v => update('vulnerabilities', v)}
              labelStyle={labelStyle}
            />

            {/* Tags */}
            <SectionDivider label="Tags" />
            <TagsField value={form.tags} onChange={v => update('tags', v)} labelStyle={labelStyle} />
          </div>
        )}

        {activeTab === 'abilities' && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 32 }}>
              {ABILITY_SCORES.map(stat => {
                const score = form.ability_scores?.[stat] ?? 10
                const mod = abilityMod(score)
                return (
                  <div key={stat} style={{ textAlign: 'center' }}>
                    <label style={{ ...labelStyle, textAlign: 'center', display: 'block' }}>{stat}</label>
                    <input
                      type="number"
                      value={score}
                      min={1} max={30}
                      onChange={e => updateAbility(stat, e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', padding: '10px 4px', fontSize: 16, fontWeight: 700 }}
                    />
                    <div style={{ ...mono, fontSize: 12, color: 'var(--green-bright)', marginTop: 4 }}>
                      {mod >= 0 ? '+' : ''}{mod}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Saving throws */}
            <SectionDivider label="Saving Throws" />
            <KeyValueListField
              label="Saving Throws"
              items={form.saving_throws}
              onChange={v => update('saving_throws', v)}
              keyPlaceholder="STR"
              valuePlaceholder="+3"
              keyLabel="Stat"
              valueLabel="Bonus"
              labelStyle={labelStyle}
            />

            {/* Skills */}
            <SectionDivider label="Skills" />
            <KeyValueListField
              label="Skills"
              items={form.skills}
              onChange={v => update('skills', v)}
              keyPlaceholder="Perception"
              valuePlaceholder="+4"
              keyLabel="Skill"
              valueLabel="Bonus"
              labelStyle={labelStyle}
            />
          </div>
        )}

        {activeTab === 'traits' && (
          <div style={{ maxWidth: 700 }}>
            <NameDescListField
              label="Traits"
              items={form.traits}
              onChange={v => update('traits', v)}
              labelStyle={labelStyle}
            />
          </div>
        )}

        {activeTab === 'actions' && (
          <div style={{ maxWidth: 700 }}>
            <ActionListField
              label="Actions"
              items={form.actions}
              onChange={v => update('actions', v)}
              labelStyle={labelStyle}
              inputStyle={inputStyle}
            />
            <SectionDivider label="Bonus Actions" />
            <ActionListField
              label="Bonus Actions"
              items={form.bonus_actions}
              onChange={v => update('bonus_actions', v)}
              labelStyle={labelStyle}
              inputStyle={inputStyle}
            />
            <SectionDivider label="Reactions" />
            <NameDescListField
              label="Reactions"
              items={form.reactions}
              onChange={v => update('reactions', v)}
              labelStyle={labelStyle}
            />
            <SectionDivider label="Legendary Actions" />
            <NameDescListField
              label="Legendary Actions"
              items={form.legendary_actions}
              onChange={v => update('legendary_actions', v)}
              labelStyle={labelStyle}
            />
          </div>
        )}

        {activeTab === 'extras' && (
          <div style={{ maxWidth: 700 }}>
            <SectionDivider label="Combat Prompts (Read-Aloud)" />
            <CombatPromptsField
              items={form.combat_prompts}
              onChange={v => update('combat_prompts', v)}
              labelStyle={labelStyle}
              inputStyle={inputStyle}
            />
            <SectionDivider label="DM Notes" />
            <StringListField
              items={form.dm_notes}
              onChange={v => update('dm_notes', v)}
              placeholder="Add a DM note…"
              labelStyle={labelStyle}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function Field({ label, value, onChange, placeholder, type = 'text', style, labelStyle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
      />
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 16, marginTop: 8,
    }}>
      {label}
    </div>
  )
}

function ChecklistField({ label, options, selected = [], onChange, labelStyle }) {
  const toggle = (item) => {
    if (selected.includes(item)) onChange(selected.filter(s => s !== item))
    else onChange([...selected, item])
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              padding: '4px 10px',
              background: selected.includes(opt) ? 'rgba(196,64,64,0.15)' : 'var(--bg-deep)',
              border: `1px solid ${selected.includes(opt) ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: selected.includes(opt) ? 'var(--danger)' : 'var(--text-muted)',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function TagsField({ value = [], onChange, labelStyle }) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim().toLowerCase()
    if (t && !value.includes(t)) { onChange([...value, t]); setInput('') }
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Tags</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {value.map(tag => (
          <span key={tag} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 8px',
            background: 'var(--bg-deep)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text-muted)',
          }}>
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add tag…"
          style={{ flex: 1, padding: '7px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}
        />
        <button onClick={add} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Add</button>
      </div>
    </div>
  )
}

function KeyValueListField({ items = [], onChange, keyPlaceholder, valuePlaceholder, keyLabel, valueLabel, labelStyle }) {
  const add = () => onChange([...items, { name: '', mod: 0 }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, val) => {
    const updated = items.map((item, idx) => idx === i ? { ...item, [field]: field === 'mod' ? parseInt(val) || 0 : val } : item)
    onChange(updated)
  }
  return (
    <div style={{ marginBottom: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input
            value={item.name || ''}
            onChange={e => updateItem(i, 'name', e.target.value)}
            placeholder={keyPlaceholder}
            style={{ flex: 2, padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}
          />
          <input
            type="number"
            value={item.mod ?? 0}
            onChange={e => updateItem(i, 'mod', e.target.value)}
            placeholder={valuePlaceholder}
            style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}
          />
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>
        + Add
      </button>
    </div>
  )
}

function NameDescListField({ label, items = [], onChange, labelStyle }) {
  const add = () => onChange([...items, { name: '', desc: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, val) => {
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }
  return (
    <div style={{ marginBottom: 24 }}>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 16, padding: 14, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              value={item.name || ''}
              onChange={e => updateItem(i, 'name', e.target.value)}
              placeholder="Name"
              style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none' }}
            />
            <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          <textarea
            value={item.desc || ''}
            onChange={e => updateItem(i, 'desc', e.target.value)}
            placeholder="Description…"
            rows={3}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      ))}
      <button onClick={add} style={{ padding: '7px 16px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', width: '100%' }}>
        + Add {label?.slice(0, -1) || 'Entry'}
      </button>
    </div>
  )
}

function ActionListField({ label, items = [], onChange, labelStyle, inputStyle }) {
  const add = () => onChange([...items, { name: '', type: 'attack', toHit: 0, reach: '5 ft.', damage: '', effect: '', desc: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, val) => {
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }
  const mono = { fontFamily: 'var(--font-mono)' }

  return (
    <div style={{ marginBottom: 24 }}>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 16, padding: 16, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <input
              value={item.name || ''}
              onChange={e => updateItem(i, 'name', e.target.value)}
              placeholder="Action name"
              style={{ flex: 2, padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none' }}
            />
            <select
              value={item.type || 'attack'}
              onChange={e => updateItem(i, 'type', e.target.value)}
              style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}
            >
              <option value="attack">Attack</option>
              <option value="save">Save</option>
              <option value="special">Special</option>
              <option value="utility">Utility</option>
            </select>
            <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>

          {(item.type === 'attack') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              <SmallField label="To Hit" value={item.toHit} onChange={v => updateItem(i, 'toHit', parseInt(v) || 0)} type="number" />
              <SmallField label="Reach / Range" value={item.reach || ''} onChange={v => updateItem(i, 'reach', v)} placeholder="5 ft." />
              <SmallField label="Damage" value={item.damage || ''} onChange={v => updateItem(i, 'damage', v)} placeholder="2d6+3 slashing" />
            </div>
          )}

          {(item.type === 'save') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              <SmallField label="Save DC" value={item.saveDC || ''} onChange={v => updateItem(i, 'saveDC', v)} placeholder="14" type="number" />
              <SmallField label="Save Type" value={item.saveType || ''} onChange={v => updateItem(i, 'saveType', v)} placeholder="CON" />
              <SmallField label="Damage / Effect" value={item.damage || ''} onChange={v => updateItem(i, 'damage', v)} placeholder="3d6 fire" />
            </div>
          )}

          <textarea
            value={item.effect || item.desc || ''}
            onChange={e => updateItem(i, item.type === 'attack' ? 'effect' : 'desc', e.target.value)}
            placeholder="Additional effect or full description…"
            rows={2}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      ))}
      <button onClick={add} style={{ padding: '7px 16px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', width: '100%' }}>
        + Add Action
      </button>
    </div>
  )
}

function SmallField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}

function CombatPromptsField({ items = [], onChange, labelStyle, inputStyle }) {
  const add = () => onChange([...items, { trigger: '', text: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, val) => {
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }
  return (
    <div style={{ marginBottom: 24 }}>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 14, padding: 14, background: 'rgba(40,50,36,0.5)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              value={item.trigger || ''}
              onChange={e => updateItem(i, 'trigger', e.target.value)}
              placeholder="Trigger (e.g. On hit, On death)"
              style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none' }}
            />
            <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
          </div>
          <textarea
            value={item.text || ''}
            onChange={e => updateItem(i, 'text', e.target.value)}
            placeholder="Read-aloud text…"
            rows={3}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: '#d4a080', fontSize: 13, fontStyle: 'italic', lineHeight: 1.7, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      ))}
      <button onClick={add} style={{ padding: '7px 16px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', width: '100%' }}>
        + Add Prompt
      </button>
    </div>
  )
}

function StringListField({ items = [], onChange, placeholder, labelStyle }) {
  const add = () => onChange([...items, ''])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i, val) => onChange(items.map((item, idx) => idx === i ? val : item))
  return (
    <div style={{ marginBottom: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <textarea
            value={item}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder}
            rows={2}
            style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '8px 4px' }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>
        + Add Note
      </button>
    </div>
  )
}
