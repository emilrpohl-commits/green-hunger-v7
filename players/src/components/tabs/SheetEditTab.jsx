import React, { useMemo, useState } from 'react'
import { Section } from '../ui/Section'

function JsonField({ label, value, onChange, rows = 6 }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 10px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--bg-raised)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          lineHeight: 1.45,
          resize: 'vertical',
        }}
      />
    </div>
  )
}

export default function SheetEditTab({ char, canEdit, onSave }) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const [name, setName] = useState(char?.name || '')
  const [klass, setKlass] = useState(char?.class || '')
  const [subclass, setSubclass] = useState(char?.subclass || '')
  const [level, setLevel] = useState(char?.level ?? 1)
  const [species, setSpecies] = useState(char?.species || '')
  const [background, setBackground] = useState(char?.background || '')
  const [languages, setLanguages] = useState(char?.languages || '')
  const [senses, setSenses] = useState(char?.senses || '')
  const [backstory, setBackstory] = useState(char?.backstory || '')

  const [statsJson, setStatsJson] = useState(() => JSON.stringify(char?.stats || {}, null, 2))
  const [abilityJson, setAbilityJson] = useState(() => JSON.stringify(char?.abilityScores || {}, null, 2))
  const [savesJson, setSavesJson] = useState(() => JSON.stringify(char?.savingThrows || [], null, 2))
  const [skillsJson, setSkillsJson] = useState(() => JSON.stringify(char?.skills || [], null, 2))
  const [slotsJson, setSlotsJson] = useState(() => JSON.stringify(char?.spellSlots || {}, null, 2))
  const [sorceryJson, setSorceryJson] = useState(() => JSON.stringify(char?.sorceryPoints ?? null, null, 2))
  const [featuresJson, setFeaturesJson] = useState(() => JSON.stringify(char?.features || [], null, 2))
  const [weaponsJson, setWeaponsJson] = useState(() => JSON.stringify(char?.weapons || [], null, 2))
  const [healingJson, setHealingJson] = useState(() => JSON.stringify(char?.healingActions || [], null, 2))
  const [buffJson, setBuffJson] = useState(() => JSON.stringify(char?.buffActions || [], null, 2))
  const [equipmentJson, setEquipmentJson] = useState(() => JSON.stringify(char?.equipment || [], null, 2))
  const [magicJson, setMagicJson] = useState(() => JSON.stringify(char?.magicItems || [], null, 2))
  const [passiveJson, setPassiveJson] = useState(() => JSON.stringify(char?.passiveScores || {}, null, 2))

  const inputStyle = useMemo(() => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--bg-raised)',
    color: 'var(--text-primary)',
    fontSize: 13,
  }), [])

  if (!canEdit) {
    return (
      <Section title="Sheet Edit">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Only the logged-in character can edit this sheet.
        </div>
      </Section>
    )
  }

  const parseJson = (label, text) => {
    try {
      return { ok: true, value: JSON.parse(text) }
    } catch (e) {
      return { ok: false, error: `${label} JSON is invalid: ${e.message}` }
    }
  }

  const handleSave = async () => {
    setStatus(null)
    const parsed = [
      ['stats', parseJson('stats', statsJson)],
      ['abilityScores', parseJson('ability scores', abilityJson)],
      ['savingThrows', parseJson('saving throws', savesJson)],
      ['skills', parseJson('skills', skillsJson)],
      ['spellSlots', parseJson('spell slots', slotsJson)],
      ['sorceryPoints', parseJson('sorcery points', sorceryJson)],
      ['features', parseJson('features', featuresJson)],
      ['weapons', parseJson('weapons', weaponsJson)],
      ['healingActions', parseJson('healing actions', healingJson)],
      ['buffActions', parseJson('buff actions', buffJson)],
      ['equipment', parseJson('equipment', equipmentJson)],
      ['magicItems', parseJson('magic items', magicJson)],
      ['passiveScores', parseJson('passive scores', passiveJson)],
    ]
    const bad = parsed.find(([, res]) => !res.ok)
    if (bad) {
      setStatus({ type: 'error', text: bad[1].error })
      return
    }

    const payload = Object.fromEntries(parsed.map(([key, res]) => [key, res.value]))
    setSaving(true)
    const result = await onSave?.({
      ...payload,
      name,
      class: klass,
      subclass,
      level: Number(level) || 1,
      species,
      background,
      languages,
      senses,
      backstory,
    })
    setSaving(false)
    if (result?.error) {
      setStatus({ type: 'error', text: result.error })
    } else {
      setStatus({ type: 'ok', text: 'Sheet saved.' })
    }
  }

  return (
    <>
      <Section title="Sheet Edit">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
          Update your sheet fields here. This writes to the shared character record used by DM and player apps.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input style={inputStyle} value={klass} onChange={(e) => setKlass(e.target.value)} placeholder="Class" />
          <input style={inputStyle} value={subclass} onChange={(e) => setSubclass(e.target.value)} placeholder="Subclass" />
          <input style={inputStyle} type="number" min={1} max={20} value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Level" />
          <input style={inputStyle} value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Species" />
          <input style={inputStyle} value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Background" />
          <input style={inputStyle} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Languages" />
          <input style={inputStyle} value={senses} onChange={(e) => setSenses(e.target.value)} placeholder="Senses" />
        </div>
        <textarea
          rows={3}
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          placeholder="Backstory"
          style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
        />
        <JsonField label="stats" value={statsJson} onChange={setStatsJson} />
        <JsonField label="ability scores" value={abilityJson} onChange={setAbilityJson} />
        <JsonField label="saving throws" value={savesJson} onChange={setSavesJson} />
        <JsonField label="skills" value={skillsJson} onChange={setSkillsJson} />
        <JsonField label="spell slots" value={slotsJson} onChange={setSlotsJson} />
        <JsonField label="sorcery points (object or null)" value={sorceryJson} onChange={setSorceryJson} rows={3} />
        <JsonField label="features" value={featuresJson} onChange={setFeaturesJson} />
        <JsonField label="weapons" value={weaponsJson} onChange={setWeaponsJson} />
        <JsonField label="healing actions" value={healingJson} onChange={setHealingJson} />
        <JsonField label="buff actions" value={buffJson} onChange={setBuffJson} />
        <JsonField label="equipment" value={equipmentJson} onChange={setEquipmentJson} />
        <JsonField label="magic items" value={magicJson} onChange={setMagicJson} />
        <JsonField label="passive scores" value={passiveJson} onChange={setPassiveJson} rows={3} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--green-mid)',
              background: 'var(--green-dim)',
              color: 'var(--green-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Sheet'}
          </button>
          {status && (
            <span style={{ fontSize: 12, color: status.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>
              {status.text}
            </span>
          )}
        </div>
      </Section>
    </>
  )
}
