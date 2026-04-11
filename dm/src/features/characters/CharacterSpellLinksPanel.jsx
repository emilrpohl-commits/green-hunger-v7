import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'
import { useCampaignStore } from '../../stores/campaignStore'

function normalizeSpellId(name = '') {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function CharacterSpellLinksPanel({ characterId }) {
  const compendiumSpells = useCampaignStore((s) => s.compendiumSpells)
  const assignSpellToCharacter = useCampaignStore((s) => s.assignSpellToCharacter)
  const removeCharacterSpellLink = useCampaignStore((s) => s.removeCharacterSpellLink)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!characterId) {
      setRows([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('character_spells')
      .select('*')
      .eq('character_id', characterId)
      .order('slot_level')
      .order('order_index')
    setLoading(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
      return
    }
    setRows(data || [])
    setMsg(null)
  }, [characterId])

  useEffect(() => {
    load()
  }, [load])

  const spellMap = useMemo(() => {
    const m = {}
    ;(compendiumSpells || []).forEach((s) => {
      if (s.spell_id) m[s.spell_id] = s
    })
    return m
  }, [compendiumSpells])

  const pickList = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return (compendiumSpells || [])
      .filter((s) => {
        if (!qq) return true
        const n = (s.name || '').toLowerCase()
        const sid = (s.spell_id || '').toLowerCase()
        return n.includes(qq) || sid.includes(qq)
      })
      .slice(0, 40)
  }, [compendiumSpells, q])

  const addSpell = async (spellId) => {
    if (!characterId || !spellId) return
    setBusyId(spellId)
    setMsg(null)
    const r = await assignSpellToCharacter(characterId, spellId)
    setBusyId(null)
    if (r.error) setMsg({ type: 'error', text: r.error })
    else {
      setMsg({ type: 'ok', text: 'Spell linked' })
      await load()
    }
  }

  const removeSpell = async (spellId) => {
    if (!characterId || !spellId) return
    setBusyId(spellId)
    const r = await removeCharacterSpellLink(characterId, spellId)
    setBusyId(null)
    if (r.error) setMsg({ type: 'error', text: r.error })
    else await load()
  }

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

  if (!characterId) return null

  return (
    <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Prepared spells (compendium)
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Links use <strong style={{ color: 'var(--text-secondary)' }}>spell_id</strong> from the full compendium. Player sheets resolve text from the compendium row when available.
      </p>

      <label style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Add from compendium</label>
      <input style={{ ...inputStyle, marginBottom: 8 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or spell_id…" />
      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pickList.map((s) => {
          const sid = s.spell_id || normalizeSpellId(s.name)
          const already = rows.some((r) => r.spell_id === sid)
          return (
            <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>
                {s.name} <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)' }}>Lv{s.level}</span>
              </span>
              <button
                type="button"
                disabled={already || busyId === sid}
                onClick={() => addSpell(sid)}
                style={{
                  padding: '4px 10px',
                  ...mono,
                  fontSize: 9,
                  textTransform: 'uppercase',
                  background: already ? 'transparent' : 'var(--green-dim)',
                  border: `1px solid ${already ? 'var(--border)' : 'var(--green-mid)'}`,
                  borderRadius: 'var(--radius)',
                  color: already ? 'var(--text-muted)' : 'var(--green-bright)',
                  cursor: already ? 'default' : 'pointer',
                }}
              >
                {already ? 'Added' : busyId === sid ? '…' : 'Add'}
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>Linked ({loading ? '…' : rows.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r) => {
          const meta = r.spell_id ? spellMap[r.spell_id] : null
          const label = meta?.name || r.spell_data?.name || r.spell_id || '—'
          return (
            <div
              key={`${r.character_id}-${r.slot_level}-${r.order_index}-${r.spell_id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 'var(--radius)' }}
            >
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>
                {label}{' '}
                <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)' }}>
                  ({r.slot_level}) {r.spell_id}
                </span>
              </span>
              <button
                type="button"
                disabled={busyId === r.spell_id}
                onClick={() => removeSpell(r.spell_id)}
                style={{
                  padding: '4px 8px',
                  ...mono,
                  fontSize: 9,
                  background: 'transparent',
                  border: '1px solid rgba(196,64,64,0.35)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>

      {msg && (
        <div style={{ marginTop: 10, ...mono, fontSize: 11, color: msg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)' }}>{msg.text}</div>
      )}
    </div>
  )
}
