import React, { useState, useDeferredValue } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import ImportModal from '../builder/ImportModal'
import { PLAYER_CHARACTERS } from '@shared/content/playerCharacters.js'
import { parseCastingTimeMeta } from '@shared/lib/combatRules.js'
import { hydrateSpellByIndex } from '@shared/lib/engine/rulesService.js'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { uploadAudioFile } from '@shared/lib/audioStorage.js'
import SpellCompendiumBrowser from './SpellCompendiumBrowser.jsx'

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']

function blankSpell() {
  return { spell_id: '', name: '', level: 1, school: 'Evocation', casting_time: '1 action', range: '30 ft.', components: { V: true, S: true, M: null }, duration: 'Instantaneous', ritual: false, concentration: false, description: '', higher_level_effect: '', damage_dice: '', damage_type: '', healing_dice: '', save_type: '', attack_type: '', resolution_type: 'utility', target_mode: 'single', save_ability: '', area: {}, scaling: {}, rules_json: {}, classes: [], tags: [], notes: '', source: 'Custom', sound_effect_url: '' }
}

function normalizeSpellId(name = '') {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function SpellLibrary() {
  const campaign = useCampaignStore(s => s.campaign)
  const spells = useCampaignStore(s => s.spells)
  const compendiumSpells = useCampaignStore(s => s.compendiumSpells)
  const saveSpell = useCampaignStore(s => s.saveSpell)
  const deleteSpell = useCampaignStore(s => s.deleteSpell)
  const assignSpellsToCharacters = useCampaignStore(s => s.assignSpellsToCharacters)
  const refreshCompendiumSpells = useCampaignStore(s => s.refreshCompendiumSpells)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankSpell())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [activeTab, setActiveTab] = useState('campaign')
  const [bulkSpellIds, setBulkSpellIds] = useState([])
  const [bulkCharacterIds, setBulkCharacterIds] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [spellEngineIndex, setSpellEngineIndex] = useState('')
  const [spellPrefillBusy, setSpellPrefillBusy] = useState(false)
  const [sfxBusy, setSfxBusy] = useState(false)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const canEngineSpellPrefill = featureFlags.use5eEngine && featureFlags.engineSpells

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }

  const list = activeTab === 'campaign' ? spells : compendiumSpells
  const q = deferredSearch.trim().toLowerCase()
  const filtered = list.filter(s =>
    !q ||
    s.name.toLowerCase().includes(q) ||
    (s.school || '').toLowerCase().includes(q) ||
    (s.classes || []).some(c => c.toLowerCase().includes(q))
  )

  const startEdit = (spell, asOverride = false) => {
    const base = spell ? { ...blankSpell(), ...spell } : blankSpell()
    if (!base.spell_id) base.spell_id = normalizeSpellId(base.name)
    if (asOverride) base.id = undefined
    setForm(base)
    setEditing(asOverride ? '__new__' : (spell?.id || '__new__'))
    setSaveMsg(null)
  }

  const prefillSpellFromEngine = async () => {
    const idx = spellEngineIndex.trim()
    if (!idx) return
    setSpellPrefillBusy(true)
    setSaveMsg(null)
    try {
      const s = await hydrateSpellByIndex(idx, {}, {})
      setForm((f) => ({
        ...f,
        spell_id: s.spellId || normalizeSpellId(s.name),
        name: s.name || f.name,
        level: Number(s.level) || f.level,
        school: s.school || f.school,
        casting_time: s.castingTime || f.casting_time,
        range: s.range || f.range,
        duration: s.duration || f.duration,
        concentration: !!s.concentration,
        ritual: !!s.ritual,
        description: s.description || f.description,
        save_type: s.saveType || f.save_type,
        resolution_type: s.mechanic || f.resolution_type,
        target_mode: s.targetMode || f.target_mode,
        attack_type: s.mechanic === 'attack' ? (f.attack_type || 'ranged') : f.attack_type,
        source: s.source || '5e Engine',
      }))
      setSaveMsg({
        type: 'ok',
        text: 'Form updated from the 5e reference — review and Save to store your campaign copy (DB is source of truth).',
      })
    } catch (e) {
      setSaveMsg({ type: 'error', text: String(e?.message || e) })
    }
    setSpellPrefillBusy(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      spell_id: form.spell_id || normalizeSpellId(form.name),
      id: editing !== '__new__' ? editing : undefined,
    }
    const result = await saveSpell(payload)
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else { setSaveMsg({ type: 'ok', text: 'Saved' }); setEditing(null) }
  }

  const toggleBulkSpell = (spellId) => {
    setBulkSpellIds(prev => prev.includes(spellId) ? prev.filter(s => s !== spellId) : [...prev, spellId])
  }

  const toggleBulkCharacter = (characterId) => {
    setBulkCharacterIds(prev => prev.includes(characterId) ? prev.filter(c => c !== characterId) : [...prev, characterId])
  }

  const handleBulkAssign = async () => {
    setAssigning(true)
    const result = await assignSpellsToCharacters({ spellIds: bulkSpellIds, characterIds: bulkCharacterIds })
    setAssigning(false)
    if (result.error) {
      setSaveMsg({ type: 'error', text: result.error })
      return
    }
    setBulkSpellIds([])
    setSaveMsg({ type: 'ok', text: `Assigned ${result.data?.inserted || 0} spell links.` })
  }

  if (editing !== null) {
    return (
      <div style={{ padding: 24, maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>←</button>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
            {editing === '__new__' ? 'New Spell' : `Edit: ${form.name}`}
          </div>
          {saveMsg && <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</span>}
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <label style={labelStyle}>Prefill from 5e engine (spell index)</label>
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.45 }}>
            Fills the form from the external 5e dataset as a starting point. Your campaign spells in the database remain canonical — use Save here to persist an editable copy.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
              value={spellEngineIndex}
              onChange={(e) => setSpellEngineIndex(e.target.value)}
              placeholder="e.g. fireball"
              disabled={!canEngineSpellPrefill}
            />
            <button
              type="button"
              disabled={spellPrefillBusy || !canEngineSpellPrefill}
              title={!canEngineSpellPrefill ? 'Turn on VITE_USE_5E_ENGINE and VITE_ENGINE_SPELLS' : undefined}
              onClick={prefillSpellFromEngine}
              style={{
                padding: '8px 14px', ...mono, fontSize: 10, textTransform: 'uppercase',
                background: 'var(--green-dim)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)',
                color: canEngineSpellPrefill ? 'var(--green-bright)' : 'var(--text-muted)',
                cursor: spellPrefillBusy || !canEngineSpellPrefill ? 'not-allowed' : 'pointer',
              }}
            >
              {spellPrefillBusy ? 'Loading…' : 'Merge into form'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ marginBottom: 14, gridColumn: '1/-1' }}>
            <label style={labelStyle}>Spell ID</label>
            <input style={inputStyle} value={form.spell_id || ''} onChange={e => setForm(f => ({ ...f, spell_id: normalizeSpellId(e.target.value) }))} placeholder="magic_missile" />
          </div>
          <div style={{ marginBottom: 14, gridColumn: '1/-1' }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Level (0 = cantrip)</label>
            <input type="number" min={0} max={9} style={inputStyle} value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 0 }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>School</label>
            <select style={inputStyle} value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))}>
              {SCHOOLS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Casting Time</label>
            <input style={inputStyle} value={form.casting_time || ''} onChange={e => setForm(f => ({ ...f, casting_time: e.target.value }))} placeholder="1 action" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Range</label>
            <input style={inputStyle} value={form.range || ''} onChange={e => setForm(f => ({ ...f, range: e.target.value }))} placeholder="60 ft." />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Duration</label>
            <input style={inputStyle} value={form.duration || ''} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Instantaneous" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Save Type</label>
            <input style={inputStyle} value={form.save_type || ''} onChange={e => setForm(f => ({ ...f, save_type: e.target.value }))} placeholder="CON, DEX, etc." />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Attack Type</label>
            <select style={inputStyle} value={form.attack_type || ''} onChange={e => setForm(f => ({ ...f, attack_type: e.target.value }))}>
              <option value="">None</option>
              <option value="melee">Melee</option>
              <option value="ranged">Ranged</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Resolution Type</label>
            <select style={inputStyle} value={form.resolution_type || 'utility'} onChange={e => setForm(f => ({ ...f, resolution_type: e.target.value }))}>
              <option value="attack">Attack</option>
              <option value="save">Save</option>
              <option value="auto">Auto</option>
              <option value="heal">Heal</option>
              <option value="utility">Utility</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Target Mode</label>
            <select style={inputStyle} value={form.target_mode || 'single'} onChange={e => setForm(f => ({ ...f, target_mode: e.target.value }))}>
              <option value="single">Single</option>
              <option value="multi_select">Multi Select</option>
              <option value="area">Area</option>
              <option value="area_all">Area All</option>
              <option value="area_selective">Area Selective</option>
              <option value="self">Self</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Damage Dice</label>
            <input style={inputStyle} value={form.damage_dice || ''} onChange={e => setForm(f => ({ ...f, damage_dice: e.target.value }))} placeholder="2d6" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Damage Type</label>
            <input style={inputStyle} value={form.damage_type || ''} onChange={e => setForm(f => ({ ...f, damage_type: e.target.value }))} placeholder="Fire, Necrotic…" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Healing Dice</label>
            <input style={inputStyle} value={form.healing_dice || ''} onChange={e => setForm(f => ({ ...f, healing_dice: e.target.value }))} placeholder="1d8+4" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Source</label>
            <input style={inputStyle} value={form.source || ''} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="PHB, Custom…" />
          </div>
        </div>

        <div style={{ marginBottom: 14, display: 'flex', gap: 20 }}>
          <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.ritual} onChange={e => setForm(f => ({ ...f, ritual: e.target.checked }))} /> Ritual
          </label>
          <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.concentration} onChange={e => setForm(f => ({ ...f, concentration: e.target.checked }))} /> Concentration
          </label>
          <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.components?.V} onChange={e => setForm(f => ({ ...f, components: { ...f.components, V: e.target.checked } }))} /> V
          </label>
          <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.components?.S} onChange={e => setForm(f => ({ ...f, components: { ...f.components, S: e.target.checked } }))} /> S
          </label>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Material Component</label>
          <input style={inputStyle} value={form.components?.M || ''} onChange={e => setForm(f => ({ ...f, components: { ...f.components, M: e.target.value || null } }))} placeholder="A pinch of salt…" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Sound effect (cast) — MP3 / WAV</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <label style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--green-mid)',
              background: 'var(--green-dim)',
              color: 'var(--green-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              cursor: sfxBusy || !campaign?.id ? 'not-allowed' : 'pointer',
              opacity: sfxBusy ? 0.6 : 1,
            }}
            >
              {sfxBusy ? 'Uploading…' : 'Upload SFX'}
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                hidden
                disabled={sfxBusy || !campaign?.id}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file || !campaign?.id) return
                  setSfxBusy(true)
                  try {
                    const { storagePath } = await uploadAudioFile({
                      file,
                      campaignId: campaign.id,
                      category: 'spell-sfx',
                      entityId: form.spell_id || form.name || 'spell',
                    })
                    setForm((f) => ({ ...f, sound_effect_url: storagePath }))
                  } catch (err) {
                    setSaveMsg({ type: 'error', text: String(err?.message || err) })
                  }
                  setSfxBusy(false)
                }}
              />
            </label>
            {form.sound_effect_url && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sound_effect_url: '' }))}
                style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
          <input
            style={inputStyle}
            value={form.sound_effect_url || ''}
            onChange={(e) => setForm((f) => ({ ...f, sound_effect_url: e.target.value }))}
            placeholder="Storage path or full URL"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>At Higher Levels</label>
          <textarea value={form.higher_level_effect || ''} onChange={e => setForm(f => ({ ...f, higher_level_effect: e.target.value }))} rows={3} style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Classes (comma-separated)</label>
          <input style={inputStyle} value={(form.classes || []).join(', ')} onChange={e => setForm(f => ({ ...f, classes: e.target.value.split(',').map(c => c.trim()).filter(Boolean) }))} placeholder="Cleric, Druid, Wizard" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Notes (DM only)</label>
          <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>
    )
  }

  const LEVEL_NAMES = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>Spells</div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {activeTab === 'compendium' ? 'Full compendium (canonical) · campaign overrides stay on the Campaign tab' : 'Homebrew & campaign-specific spells (stored per campaign)'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {activeTab === 'compendium' && (
            <button
              type="button"
              disabled={refreshBusy}
              onClick={async () => {
                setRefreshBusy(true)
                const r = await refreshCompendiumSpells()
                setRefreshBusy(false)
                if (r?.error) setSaveMsg({ type: 'error', text: r.error })
                else setSaveMsg({ type: 'ok', text: `Reloaded compendium (${r?.count ?? 0} spells)` })
              }}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: refreshBusy ? 'not-allowed' : 'pointer',
                ...mono,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {refreshBusy ? 'Refreshing…' : 'Reload compendium'}
            </button>
          )}
          <button onClick={() => setShowImport(true)} style={{ padding: '8px 18px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Import from Text</button>
          <button onClick={() => startEdit(null)} style={{ padding: '8px 18px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ New Campaign Spell</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setActiveTab('campaign')} style={{ padding: '6px 12px', background: activeTab === 'campaign' ? 'var(--green-dim)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: activeTab === 'campaign' ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 10, textTransform: 'uppercase' }}>Campaign</button>
        <button onClick={() => setActiveTab('compendium')} style={{ padding: '6px 12px', background: activeTab === 'compendium' ? 'var(--green-dim)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: activeTab === 'compendium' ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 10, textTransform: 'uppercase' }}>Compendium</button>
      </div>
      {activeTab === 'campaign' && (
        <input type="text" placeholder="Search campaign spells…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '9px 14px', marginBottom: 20, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      )}

      {activeTab === 'compendium' && (
        <>
          <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Import dataset (CLI)
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Place <strong style={{ color: 'var(--text-primary)' }}>DnD_5e_Spells_with_Targeting.xlsx</strong> in <code style={{ color: 'var(--green-bright)' }}>data/</code>, then run{' '}
              <code style={{ color: 'var(--green-bright)' }}>cd tools &amp;&amp; npm install &amp;&amp; node importSpellCompendium.mjs --write-db</code>
              . Re-run safely — upserts on <code style={{ color: 'var(--green-bright)' }}>spell_id</code>. See <strong>docs/SPELL_COMPENDIUM.md</strong>.
            </p>
          </div>
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Bulk assign to characters (use checkboxes in list)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.values(PLAYER_CHARACTERS).filter(c => c.id !== 'party').map(c => (
                <button key={c.id} onClick={() => toggleBulkCharacter(c.id)} style={{ padding: '5px 10px', background: bulkCharacterIds.includes(c.id) ? `${c.colour || '#508050'}30` : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: bulkCharacterIds.includes(c.id) ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 10 }}>
                  {c.name}
                </button>
              ))}
            </div>
            <button onClick={handleBulkAssign} disabled={assigning || bulkSpellIds.length === 0 || bulkCharacterIds.length === 0} style={{ padding: '7px 14px', background: assigning ? 'var(--bg-deep)' : 'var(--green-mid)', color: assigning ? 'var(--text-muted)' : '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: assigning ? 'not-allowed' : 'pointer', ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              {assigning ? 'Assigning…' : `Assign ${bulkSpellIds.length} selected spell(s)`}
            </button>
          </div>
        </>
      )}

      {saveMsg && <div style={{ marginBottom: 12, ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</div>}

      {activeTab === 'compendium' && (
        <>
          {list.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              No compendium rows loaded. Apply the DB migration for <code style={{ color: 'var(--green-bright)' }}>spell_compendium</code>, run the XLSX import, then <strong>Reload compendium</strong>.
            </div>
          )}
          {list.length > 0 && (
            <SpellCompendiumBrowser
              spells={list}
              bulkSpellIds={bulkSpellIds}
              toggleBulkSpell={toggleBulkSpell}
              normalizeSpellId={normalizeSpellId}
            />
          )}
        </>
      )}

      {activeTab === 'campaign' && (
        <>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No campaign spells yet. Create one or import.</div>}
          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.map(spell => (
              (() => {
                const castingMeta = parseCastingTimeMeta(spell.casting_time)
                return (
                  <div key={spell.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ minWidth: 52, textAlign: 'center' }}>
                      <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Level</div>
                      <div style={{ ...mono, fontSize: 12, color: '#a0b0ff', fontWeight: 700 }}>{LEVEL_NAMES[spell.level] || spell.level}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{spell.name}</div>
                      <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {spell.school}{spell.ritual ? ' · Ritual' : ''}{spell.concentration ? ' · Concentration' : ''}
                        {spell.casting_time ? ` · ${spell.casting_time}` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ ...mono, fontSize: 9, color: castingMeta.isBonusAction ? 'var(--warning)' : castingMeta.isReaction ? '#9fb4ff' : 'var(--green-bright)' }}>
                          {castingMeta.castingTimeLabel}
                        </span>
                        {spell.spell_id && <span style={{ ...mono, fontSize: 9, color: '#9bb0d8' }}>id:{spell.spell_id}</span>}
                        {spell.resolution_type && <span style={{ ...mono, fontSize: 9, color: 'var(--warning)' }}>{spell.resolution_type}</span>}
                        {spell.target_mode && <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)' }}>{spell.target_mode}</span>}
                        {(spell.rules_json?.needs_manual_resolution || spell.target_mode === 'special') && <span style={{ ...mono, fontSize: 9, color: 'var(--danger)' }}>manual</span>}
                      </div>
                    </div>
                    <button onClick={() => startEdit(spell)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
                    <button onClick={() => { if (window.confirm('Delete?')) deleteSpell(spell.id) }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
                  </div>
                )
              })()
            ))}
          </div>
        </>
      )}

      {showImport && (
        <ImportModal
          type="spell"
          onClose={() => setShowImport(false)}
          onSaved={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
