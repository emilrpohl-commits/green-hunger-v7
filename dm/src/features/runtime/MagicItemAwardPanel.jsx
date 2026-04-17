import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'

/**
 * Runtime: search reference_magic_items and append to a character's magic_items via onAward.
 */
export default function MagicItemAwardPanel({ characters, campaignId, onAward, mono }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const pcs = (characters || []).filter((c) => {
    if (String(c.id).toLowerCase() === 'ilya') return false
    if (c.isNPC || c.is_npc) return false
    return true
  })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      let query = supabase
        .from('reference_magic_items')
        .select('id,source_index,name,rarity,description')
        .eq('ruleset', '2014')
        .order('name', { ascending: true })
        .limit(60)
      const term = q.trim()
      if (term) query = query.ilike('name', `%${term}%`)
      const { data, error } = await query
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setRows([])
      setMsg(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const t = setTimeout(fetchRows, 200)
    return () => clearTimeout(t)
  }, [fetchRows])

  useEffect(() => {
    if (!targetId && pcs[0]?.id) setTargetId(pcs[0].id)
  }, [pcs, targetId])

  const award = async () => {
    if (!selected || !targetId || !onAward) return
    setBusy(true)
    setMsg(null)
    try {
      await onAward(targetId, {
        name: selected.name,
        description: selected.description || '',
        reference_index: selected.source_index,
      })
      setMsg(`Awarded to character row: ${selected.name}`)
      setSelected(null)
    } catch (e) {
      setMsg(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  if (!campaignId) return null

  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-raised)' }}>
      <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
        Award SRD magic item
      </div>
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)' }}
      >
        {pcs.map((c) => (
          <option key={c.id} value={c.id}>{c.name || c.id}</option>
        ))}
      </select>
      <input
        type="search"
        placeholder="Search magic items…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)' }}
      />
      {loading && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading…</div>}
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r) => (
          <button
            key={r.source_index}
            type="button"
            onClick={() => setSelected(r)}
            style={{
              textAlign: 'left',
              padding: 8,
              borderRadius: 'var(--radius)',
              border: selected?.source_index === r.source_index ? '1px solid var(--green-mid)' : '1px solid var(--border)',
              background: selected?.source_index === r.source_index ? 'rgba(100,200,100,0.12)' : 'var(--bg-deep)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            <strong>{r.name}</strong>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{r.rarity || ''}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || !selected}
        onClick={() => void award()}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--green-mid)',
          color: '#0a0f0d',
          fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          opacity: !selected ? 0.5 : 1,
        }}
      >
        {busy ? 'Saving…' : 'Add to character'}
      </button>
      {msg && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>{msg}</div>}
    </div>
  )
}
