import React, { useMemo, useState } from 'react'
import { Section } from '../ui/Section'

const ABILITY_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

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

function Label({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function normalizeAbilityScores(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  ABILITY_ORDER.forEach((ab) => {
    const row = src[ab] && typeof src[ab] === 'object' ? src[ab] : {}
    out[ab] = {
      mod: row.mod != null ? String(row.mod) : '+0',
      score: row.score != null ? row.score : 10,
    }
  })
  return out
}

function normalizeSavingThrows(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list.map((s) => ({
    name: s?.name != null ? String(s.name) : '',
    mod: s?.mod != null ? String(s.mod) : '+0',
    proficient: !!s?.proficient,
  }))
}

function normalizeSkills(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list.map((s) => ({
    name: s?.name != null ? String(s.name) : '',
    ability: s?.ability != null ? String(s.ability) : '',
    mod: s?.mod != null ? String(s.mod) : '+0',
    proficient: !!s?.proficient,
    expertise: !!s?.expertise,
  }))
}

function normalizeStats(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    ac: src.ac ?? '',
    maxHp: src.maxHp ?? '',
    speed: src.speed ?? '',
    initiative: src.initiative ?? '',
    spellAttack: src.spellAttack ?? '',
    spellSaveDC: src.spellSaveDC ?? '',
  }
}

function normalizePassiveScores(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    perception: src.perception ?? '',
    investigation: src.investigation ?? '',
    insight: src.insight ?? '',
  }
}

function normalizeSpellSlots(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (let level = 1; level <= 9; level++) {
    const row = src[level] || src[String(level)] || {}
    out[level] = {
      max: row?.max ?? '',
      used: row?.used ?? '',
    }
  }
  return out
}

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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

  const [stats, setStats] = useState(() => normalizeStats(char?.stats))
  const [abilityScores, setAbilityScores] = useState(() => normalizeAbilityScores(char?.abilityScores))
  const [savingThrows, setSavingThrows] = useState(() => normalizeSavingThrows(char?.savingThrows))
  const [skills, setSkills] = useState(() => normalizeSkills(char?.skills))
  const [spellSlots, setSpellSlots] = useState(() => normalizeSpellSlots(char?.spellSlots))
  const [passiveScores, setPassiveScores] = useState(() => normalizePassiveScores(char?.passiveScores))

  const [sorceryJson, setSorceryJson] = useState(() => JSON.stringify(char?.sorceryPoints ?? null, null, 2))
  const [featuresJson, setFeaturesJson] = useState(() => JSON.stringify(char?.features || [], null, 2))
  const [weaponsJson, setWeaponsJson] = useState(() => JSON.stringify(char?.weapons || [], null, 2))
  const [healingJson, setHealingJson] = useState(() => JSON.stringify(char?.healingActions || [], null, 2))
  const [buffJson, setBuffJson] = useState(() => JSON.stringify(char?.buffActions || [], null, 2))
  const [equipmentJson, setEquipmentJson] = useState(() => JSON.stringify(char?.equipment || [], null, 2))
  const [magicJson, setMagicJson] = useState(() => JSON.stringify(char?.magicItems || [], null, 2))

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

  const tableInputStyle = useMemo(() => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--bg-raised)',
    color: 'var(--text-primary)',
    fontSize: 12,
  }), [])

  const tinyBtn = useMemo(() => ({
    padding: '4px 8px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    cursor: 'pointer',
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
      ['sorceryPoints', parseJson('sorcery points', sorceryJson)],
      ['features', parseJson('features', featuresJson)],
      ['weapons', parseJson('weapons', weaponsJson)],
      ['healingActions', parseJson('healing actions', healingJson)],
      ['buffActions', parseJson('buff actions', buffJson)],
      ['equipment', parseJson('equipment', equipmentJson)],
      ['magicItems', parseJson('magic items', magicJson)],
    ]
    const bad = parsed.find(([, res]) => !res.ok)
    if (bad) {
      setStatus({ type: 'error', text: bad[1].error })
      return
    }

    const payload = Object.fromEntries(parsed.map(([key, res]) => [key, res.value]))

    const cleanStats = {
      ac: toNumberOrNull(stats.ac) ?? 0,
      maxHp: toNumberOrNull(stats.maxHp) ?? 0,
      speed: toNumberOrNull(stats.speed) ?? 0,
      initiative: String(stats.initiative || '').trim() || '+0',
      spellAttack: String(stats.spellAttack || '').trim() || '+0',
      spellSaveDC: toNumberOrNull(stats.spellSaveDC) ?? 10,
    }

    const cleanAbilityScores = {}
    ABILITY_ORDER.forEach((ab) => {
      const row = abilityScores[ab] || {}
      cleanAbilityScores[ab] = {
        mod: String(row.mod || '').trim() || '+0',
        score: toNumberOrNull(row.score) ?? 10,
      }
    })

    const cleanSavingThrows = savingThrows
      .map((s) => ({
        name: String(s.name || '').trim(),
        mod: String(s.mod || '').trim() || '+0',
        proficient: !!s.proficient,
      }))
      .filter((s) => s.name)

    const cleanSkills = skills
      .map((s) => ({
        name: String(s.name || '').trim(),
        ability: String(s.ability || '').trim().toUpperCase(),
        mod: String(s.mod || '').trim() || '+0',
        proficient: !!s.proficient,
        expertise: !!s.expertise,
      }))
      .filter((s) => s.name)

    const cleanSpellSlots = {}
    for (let lv = 1; lv <= 9; lv++) {
      const row = spellSlots[lv] || {}
      const max = toNumberOrNull(row.max)
      const used = toNumberOrNull(row.used)
      if ((max ?? 0) > 0 || (used ?? 0) > 0) {
        cleanSpellSlots[lv] = {
          max: Math.max(0, max ?? 0),
          used: Math.max(0, used ?? 0),
        }
      }
    }

    const cleanPassiveScores = {
      perception: toNumberOrNull(passiveScores.perception) ?? 0,
      investigation: toNumberOrNull(passiveScores.investigation) ?? 0,
      insight: toNumberOrNull(passiveScores.insight) ?? 0,
    }

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
      stats: cleanStats,
      abilityScores: cleanAbilityScores,
      savingThrows: cleanSavingThrows,
      skills: cleanSkills,
      spellSlots: cleanSpellSlots,
      passiveScores: cleanPassiveScores,
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

        <div style={{ marginBottom: 14 }}>
          <Label>Core Stats</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['ac', 'AC'],
              ['maxHp', 'Max HP'],
              ['speed', 'Speed'],
              ['initiative', 'Initiative'],
              ['spellAttack', 'Spell Attack'],
              ['spellSaveDC', 'Spell Save DC'],
            ].map(([key, title]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
                <input
                  style={inputStyle}
                  value={stats[key]}
                  onChange={(e) => setStats((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Ability Scores</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {ABILITY_ORDER.map((ab) => (
              <div key={ab} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8, background: 'var(--bg-raised)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{ab}</div>
                <input
                  style={{ ...tableInputStyle, marginBottom: 6 }}
                  value={abilityScores[ab]?.score ?? ''}
                  onChange={(e) => setAbilityScores((prev) => ({ ...prev, [ab]: { ...prev[ab], score: e.target.value } }))}
                  placeholder="Score"
                />
                <input
                  style={tableInputStyle}
                  value={abilityScores[ab]?.mod ?? ''}
                  onChange={(e) => setAbilityScores((prev) => ({ ...prev, [ab]: { ...prev[ab], mod: e.target.value } }))}
                  placeholder="Mod (+3)"
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Saving Throws</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savingThrows.map((row, idx) => (
              <div key={`${row.name || 'save'}_${idx}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto auto', gap: 8, alignItems: 'center' }}>
                <input
                  style={tableInputStyle}
                  value={row.name}
                  onChange={(e) => setSavingThrows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                  placeholder="Strength"
                />
                <input
                  style={tableInputStyle}
                  value={row.mod}
                  onChange={(e) => setSavingThrows((prev) => prev.map((r, i) => (i === idx ? { ...r, mod: e.target.value } : r)))}
                  placeholder="+3"
                />
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={row.proficient}
                    onChange={(e) => setSavingThrows((prev) => prev.map((r, i) => (i === idx ? { ...r, proficient: e.target.checked } : r)))}
                  />
                  prof
                </label>
                <button type="button" style={tinyBtn} onClick={() => setSavingThrows((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              style={tinyBtn}
              onClick={() => setSavingThrows((prev) => [...prev, { name: '', mod: '+0', proficient: false }])}
            >
              Add Save
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Skills</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {skills.map((row, idx) => (
              <div key={`${row.name || 'skill'}_${idx}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto auto', gap: 8, alignItems: 'center' }}>
                <input
                  style={tableInputStyle}
                  value={row.name}
                  onChange={(e) => setSkills((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                  placeholder="Acrobatics"
                />
                <input
                  style={tableInputStyle}
                  value={row.ability}
                  onChange={(e) => setSkills((prev) => prev.map((r, i) => (i === idx ? { ...r, ability: e.target.value.toUpperCase() } : r)))}
                  placeholder="DEX"
                />
                <input
                  style={tableInputStyle}
                  value={row.mod}
                  onChange={(e) => setSkills((prev) => prev.map((r, i) => (i === idx ? { ...r, mod: e.target.value } : r)))}
                  placeholder="+5"
                />
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={row.proficient}
                    onChange={(e) => setSkills((prev) => prev.map((r, i) => (i === idx ? { ...r, proficient: e.target.checked } : r)))}
                  />
                  prof
                </label>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={row.expertise}
                    onChange={(e) => setSkills((prev) => prev.map((r, i) => (i === idx ? { ...r, expertise: e.target.checked } : r)))}
                  />
                  exp
                </label>
                <button type="button" style={tinyBtn} onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              style={tinyBtn}
              onClick={() => setSkills((prev) => [...prev, { name: '', ability: '', mod: '+0', proficient: false, expertise: false }])}
            >
              Add Skill
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Spell Slots</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {Array.from({ length: 9 }).map((_, i) => {
              const lv = i + 1
              return (
                <div key={lv} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8, background: 'var(--bg-raised)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Level {lv}</div>
                  <input
                    style={{ ...tableInputStyle, marginBottom: 6 }}
                    value={spellSlots[lv]?.max ?? ''}
                    onChange={(e) => setSpellSlots((prev) => ({ ...prev, [lv]: { ...prev[lv], max: e.target.value } }))}
                    placeholder="Max"
                  />
                  <input
                    style={tableInputStyle}
                    value={spellSlots[lv]?.used ?? ''}
                    onChange={(e) => setSpellSlots((prev) => ({ ...prev, [lv]: { ...prev[lv], used: e.target.value } }))}
                    placeholder="Used"
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Passive Scores</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['perception', 'Perception'],
              ['investigation', 'Investigation'],
              ['insight', 'Insight'],
            ].map(([key, title]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
                <input
                  style={inputStyle}
                  value={passiveScores[key]}
                  onChange={(e) => setPassiveScores((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <details style={{ marginBottom: 14 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>
            Advanced JSON Fields (optional)
          </summary>
          <div style={{ marginTop: 10 }}>
            <JsonField label="sorcery points (object or null)" value={sorceryJson} onChange={setSorceryJson} rows={3} />
            <JsonField label="features" value={featuresJson} onChange={setFeaturesJson} />
            <JsonField label="weapons" value={weaponsJson} onChange={setWeaponsJson} />
            <JsonField label="healing actions" value={healingJson} onChange={setHealingJson} />
            <JsonField label="buff actions" value={buffJson} onChange={setBuffJson} />
            <JsonField label="equipment" value={equipmentJson} onChange={setEquipmentJson} />
            <JsonField label="magic items" value={magicJson} onChange={setMagicJson} />
          </div>
        </details>

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
