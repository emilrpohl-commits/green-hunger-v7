import React, { useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import ImportModal from '../builder/ImportModal'
import { PLAYER_CHARACTERS } from '@shared/content/playerCharacters.js'
import { parseCastingTimeMeta } from '@shared/lib/combatRules.js'
import { hydrateSpellByIndex } from '@shared/lib/engine/rulesService.js'

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']

function blankSpell() {
  return { spell_id: '', name: '', level: 1, school: 'Evocation', casting_time: '1 action', range: '30 ft.', components: { V: true, S: true, M: null }, duration: 'Instantaneous', ritual: false, concentration: false, description: '', higher_level_effect: '', damage_dice: '', damage_type: '', healing_dice: '', save_type: '', attack_type: '', resolution_type: 'utility', target_mode: 'single', save_ability: '', area: {}, scaling: {}, rules_json: {}, classes: [], tags: [], notes: '', source: 'Custom' }
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
  const spells = useCampaignStore(s => s.spells)
  const compendiumSpells = useCampaignStore(s => s.compendiumSpells)
  const saveSpell = useCampaignStore(s => s.saveSpell)
  const deleteSpell = useCampaignStore(s => s.deleteSpell)
  const assignSpellsToCharacters = useCampaignStore(s => s.assignSpellsToCharacters)
  const [search, setSearch] = useState('')
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

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }

  const list = activeTab === 'campaign' ? spells : compendiumSpells
  const filtered = list.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.school || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.classes || []).some(c => c.toLowerCase().includes(search.toLowerCase()))
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
              value={spellEngineIndex}
              onChange={(e) => setSpellEngineIndex(e.target.value)}
              placeholder="e.g. fireball"
            />
            <button
              type="button"
              disabled={spellPrefillBusy}
              onClick={prefillSpellFromEngine}
              style={{
                padding: '8px 14px', ...mono, fontSize: 10, textTransform: 'uppercase',
                background: 'var(--green-dim)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)',
                color: 'var(--green-bright)', cursor: spellPrefillBusy ? 'wait' : 'pointer',
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
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>Spells</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{ padding: '8px 18px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Import from Text</button>
          <button onClick={() => startEdit(null)} style={{ padding: '8px 18px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ New Campaign Spell</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setActiveTab('campaign')} style={{ padding: '6px 12px', background: activeTab === 'campaign' ? 'var(--green-dim)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: activeTab === 'campaign' ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 10, textTransform: 'uppercase' }}>Campaign</button>
        <button onClick={() => setActiveTab('compendium')} style={{ padding: '6px 12px', background: activeTab === 'compendium' ? 'var(--green-dim)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: activeTab === 'compendium' ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 10, textTransform: 'uppercase' }}>Compendium</button>
      </div>
      <input type="text" placeholder="Search spells…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '9px 14px', marginBottom: 20, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

      {activeTab === 'compendium' && (
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Bulk Assign Spells to Characters
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {Object.values(PLAYER_CHARACTERS).filter(c => c.id !== 'party').map(c => (
              <button key={c.id} onClick={() => toggleBulkCharacter(c.id)} style={{ padding: '5px 10px', background: bulkCharacterIds.includes(c.id) ? `${c.colour || '#508050'}30` : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: bulkCharacterIds.includes(c.id) ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 10 }}>
                {c.name}
              </button>
            ))}
          </div>
          <button onClick={handleBulkAssign} disabled={assigning || bulkSpellIds.length === 0 || bulkCharacterIds.length === 0} style={{ padding: '7px 14px', background: assigning ? 'var(--bg-deep)' : 'var(--green-mid)', color: assigning ? 'var(--text-muted)' : '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: assigning ? 'not-allowed' : 'pointer', ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
            {assigning ? 'Assigning…' : `Assign ${bulkSpellIds.length} Selected Spell(s)`}
          </button>
        </div>
      )}

      {saveMsg && <div style={{ marginBottom: 12, ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{saveMsg.text}</div>}
      {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{activeTab === 'campaign' ? 'No campaign spells yet. Create one or import.' : 'No compendium spells loaded yet. Run compendium import.'}</div>}

      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map(spell => (
          (() => {
            const castingMeta = parseCastingTimeMeta(spell.casting_time)
            return (
          <div key={spell.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            {activeTab === 'compendium' && (
              (() => {
                const sid = spell.spell_id || normalizeSpellId(spell.name)
                return (
              <input
                type="checkbox"
                checked={bulkSpellIds.includes(sid)}
                onChange={() => toggleBulkSpell(sid)}
                style={{ cursor: 'pointer' }}
              />
                )
              })()
            )}
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
            {activeTab === 'campaign' ? (
              <>
                <button onClick={() => startEdit(spell)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
                <button onClick={() => { if (window.confirm('Delete?')) deleteSpell(spell.id) }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
              </>
            ) : (
              <button onClick={() => startEdit({ ...spell, name: `${spell.name} (Override)` }, true)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Create Override</button>
            )}
          </div>
            )
          })()
        ))}
      </div>

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
