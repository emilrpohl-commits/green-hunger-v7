import React, { useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import ImportModal from '../builder/ImportModal'

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']

function blankSpell() {
  return { name: '', level: 1, school: 'Evocation', casting_time: '1 action', range: '30 ft.', components: { V: true, S: true, M: null }, duration: 'Instantaneous', ritual: false, concentration: false, description: '', higher_level_effect: '', damage_dice: '', damage_type: '', healing_dice: '', save_type: '', attack_type: '', classes: [], tags: [], notes: '', source: 'Custom' }
}

export default function SpellLibrary() {
  const spells = useCampaignStore(s => s.spells)
  const saveSpell = useCampaignStore(s => s.saveSpell)
  const deleteSpell = useCampaignStore(s => s.deleteSpell)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankSpell())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }

  const filtered = spells.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.school || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.classes || []).some(c => c.toLowerCase().includes(search.toLowerCase()))
  )

  const startEdit = (spell) => {
    setForm(spell ? { ...blankSpell(), ...spell } : blankSpell())
    setEditing(spell?.id || '__new__')
    setSaveMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveSpell({ ...form, id: editing !== '__new__' ? editing : undefined })
    setSaving(false)
    if (result.error) setSaveMsg({ type: 'error', text: result.error })
    else { setSaveMsg({ type: 'ok', text: 'Saved' }); setEditing(null) }
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
          <button onClick={() => startEdit(null)} style={{ padding: '8px 18px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ New Spell</button>
        </div>
      </div>
      <input type="text" placeholder="Search spells…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '9px 14px', marginBottom: 20, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

      {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No spells yet. Create one or run migration.</div>}

      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map(spell => (
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
            </div>
            <button onClick={() => startEdit(spell)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Edit</button>
            <button onClick={() => { if (window.confirm('Delete?')) deleteSpell(spell.id) }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 9, textTransform: 'uppercase' }}>Delete</button>
          </div>
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
