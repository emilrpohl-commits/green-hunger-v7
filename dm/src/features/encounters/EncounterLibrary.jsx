import React, { useMemo, useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import ToolboxEncounterBudget from '../toolbox/ToolboxEncounterBudget.jsx'

function emptyParticipant() {
  return { stat_block_id: '', count: 1, initiative: '' }
}

function participantSummary(parts, statBlockById) {
  const list = Array.isArray(parts) ? parts : []
  return list
    .map((p) => {
      const sb = p.stat_block_id ? statBlockById[p.stat_block_id] : null
      const name = sb?.name || '?'
      const c = Math.max(1, Number(p.count) || 1)
      return c > 1 ? `${c}× ${name}` : name
    })
    .join(', ')
}

export default function EncounterLibrary() {
  const campaign = useCampaignStore((s) => s.campaign)
  const encounters = useCampaignStore((s) => s.encounters)
  const statBlocks = useCampaignStore((s) => s.statBlocks)
  const saveEncounter = useCampaignStore((s) => s.saveEncounter)
  const deleteEncounter = useCampaignStore((s) => s.deleteEncounter)

  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('combat')
  const [formDifficulty, setFormDifficulty] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formParticipants, setFormParticipants] = useState([emptyParticipant()])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

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
  const taStyle = { ...inputStyle, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }

  const statBlockById = useMemo(
    () => Object.fromEntries(statBlocks.map((sb) => [sb.id, sb])),
    [statBlocks],
  )

  const sortedStatBlocks = useMemo(
    () => [...statBlocks].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [statBlocks],
  )

  const filtered = encounters.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      String(e.title || '').toLowerCase().includes(q)
      || participantSummary(e.participants, statBlockById).toLowerCase().includes(q)
    )
  })

  const resetForm = () => {
    setEditingId(null)
    setFormTitle('')
    setFormType('combat')
    setFormDifficulty('')
    setFormNotes('')
    setFormParticipants([emptyParticipant()])
  }

  const startNew = () => {
    setMsg(null)
    resetForm()
    setEditingId('__new__')
  }

  const startEdit = (enc) => {
    setMsg(null)
    setEditingId(enc.id)
    setFormTitle(enc.title || '')
    setFormType(enc.type || 'combat')
    setFormDifficulty(enc.difficulty || '')
    setFormNotes(enc.notes || '')
    const parts = Array.isArray(enc.participants) && enc.participants.length
      ? enc.participants.map((p) => ({
          stat_block_id: p.stat_block_id || '',
          count: Math.max(1, Number(p.count) || 1),
          initiative: p.initiative === 0 || p.initiative ? String(p.initiative) : '',
        }))
      : [emptyParticipant()]
    setFormParticipants(parts)
    setMsg(null)
  }

  const updateParticipant = (idx, field, value) => {
    setFormParticipants((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const addParticipantRow = () => setFormParticipants((rows) => [...rows, emptyParticipant()])

  const removeParticipantRow = (idx) => {
    setFormParticipants((rows) => {
      if (rows.length <= 1) return [emptyParticipant()]
      return rows.filter((_, i) => i !== idx)
    })
  }

  const handleSave = async () => {
    if (!String(formTitle).trim()) {
      setMsg({ type: 'err', text: 'Title is required' })
      return
    }
    const participants = formParticipants
      .filter((p) => p.stat_block_id)
      .map((p) => {
        const row = {
          stat_block_id: p.stat_block_id,
          count: Math.max(1, parseInt(String(p.count), 10) || 1),
        }
        const ini = String(p.initiative).trim()
        if (ini !== '') {
          const n = Number(ini)
          if (!Number.isNaN(n)) row.initiative = n
        }
        return row
      })
    if (!participants.length) {
      setMsg({ type: 'err', text: 'Add at least one creature (stat block + count)' })
      return
    }
    setBusy(true)
    setMsg(null)
    const result = await saveEncounter({
      id: editingId !== '__new__' ? editingId : undefined,
      title: formTitle.trim(),
      type: formType,
      difficulty: formDifficulty.trim() || null,
      notes: formNotes.trim() || null,
      participants,
    })
    setBusy(false)
    if (result.error) setMsg({ type: 'err', text: result.error })
    else {
      resetForm()
      setMsg({ type: 'ok', text: 'Saved' })
    }
  }

  const handleDelete = async (encId) => {
    if (confirmDeleteId !== encId) {
      setConfirmDeleteId(encId)
      return
    }
    setConfirmDeleteId(null)
    setBusy(true)
    const del = await deleteEncounter(encId)
    setBusy(false)
    if (del.error) setMsg({ type: 'err', text: del.error })
    else if (editingId === encId) resetForm()
  }

  if (!campaign) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        Load a campaign to manage encounters.
      </div>
    )
  }

  if (editingId !== null) {
    return (
      <div style={{ padding: 24, maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={resetForm}
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
            {editingId === '__new__' ? 'New encounter' : 'Edit encounter'}
          </div>
          {msg && (
            <span style={{ ...mono, fontSize: 11, color: msg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>
              {msg.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
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
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ambush at the crossroads" />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={formType} onChange={(e) => setFormType(e.target.value)}>
              <option value="combat">Combat</option>
              <option value="social">Social</option>
              <option value="skill">Skill</option>
              <option value="chase">Chase</option>
              <option value="puzzle">Puzzle</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Difficulty</label>
            <select style={inputStyle} value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)}>
              <option value="">—</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="deadly">Deadly</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Creatures (campaign stat blocks)</label>
          {sortedStatBlocks.length === 0 && (
            <div style={{ ...mono, fontSize: 11, color: 'var(--warning)', marginBottom: 10 }}>
              No stat blocks in this campaign. Add some under Stat Blocks or clone from SRD Reference → Monsters.
            </div>
          )}
          {formParticipants.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 88px 100px 36px',
                gap: 10,
                alignItems: 'end',
                marginBottom: 10,
              }}
            >
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Stat block</label>
                <select
                  style={inputStyle}
                  value={row.stat_block_id}
                  onChange={(e) => updateParticipant(idx, 'stat_block_id', e.target.value)}
                >
                  <option value="">Choose…</option>
                  {sortedStatBlocks.map((sb) => (
                    <option key={sb.id} value={sb.id}>
                      {sb.name}
                      {sb.cr != null && sb.cr !== '' ? ` (CR ${sb.cr})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Count</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={row.count}
                  onChange={(e) => updateParticipant(idx, 'count', e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Init (opt.)</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 2"
                  value={row.initiative}
                  onChange={(e) => updateParticipant(idx, 'initiative', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeParticipantRow(idx)}
                style={{
                  height: 36,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  ...mono,
                  fontSize: 16,
                }}
                title="Remove row"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addParticipantRow}
            style={{
              marginTop: 4,
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
            + Add creature row
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>DM notes</label>
          <textarea style={{ ...taStyle }} rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
        </div>

        <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
          Saved encounters appear in Play → Encounters when DB encounters are enabled. Participants reference campaign stat blocks by UUID.
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            XP Budget
          </div>
          <ToolboxEncounterBudget compact />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>Encounters</div>
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
          + New encounter
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16, maxWidth: 640 }}>
        Author combat (and other) encounters for quick launch during play. Each row stores title, type, optional difficulty, and one or more
        stat block references with counts.
      </p>

      <input
        type="search"
        placeholder="Search by title or creature…"
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

      {msg && !editingId && (
        <div style={{ ...mono, fontSize: 12, color: msg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)', marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {encounters.length === 0
            ? 'No encounters yet. Create one or run the Phase 2 encounter seed migration.'
            : 'No matches.'}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map((enc) => (
          <div
            key={enc.id}
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
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{enc.title}</div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {[enc.type, enc.difficulty].filter(Boolean).join(' · ')}
                {enc.type || enc.difficulty ? ' · ' : ''}
                {participantSummary(enc.participants, statBlockById) || 'No participants'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => startEdit(enc)}
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
            <button
              type="button"
              onClick={() => handleDelete(enc.id)}
              onBlur={() => setConfirmDeleteId(null)}
              disabled={busy}
              style={{
                padding: '4px 10px',
                background: confirmDeleteId === enc.id ? 'rgba(196,64,64,0.12)' : 'transparent',
                border: `1px solid ${confirmDeleteId === enc.id ? 'rgba(196,64,64,0.6)' : 'rgba(196,64,64,0.3)'}`,
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--danger)',
                ...mono,
                fontSize: 9,
                textTransform: 'uppercase',
              }}
            >
              {confirmDeleteId === enc.id ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
