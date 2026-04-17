import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@shared/lib/supabase.js'

/**
 * Search reference_equipment and pick a weapon → prefilled weapon row.
 */
export default function EquipmentPickerModal({
  open,
  onClose,
  ruleset = '2014',
  onPickWeapon,
}) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reference_equipment')
        .select('source_index,name,equipment_category,damage_dice,damage_type,properties,weapon_category')
        .eq('ruleset', ruleset)
        .eq('equipment_category', 'weapon')
        .order('name', { ascending: true })
        .limit(80)
      const term = q.trim()
      if (term) query = query.ilike('name', `%${term}%`)
      const { data, error } = await query
      if (error) throw error
      setRows(data || [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [q, ruleset])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(fetchRows, 200)
    return () => clearTimeout(t)
  }, [open, fetchRows])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '80vh',
          overflow: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'var(--font-display)', marginBottom: 10, color: 'var(--green-bright)' }}>
          SRD weapon (reference_equipment)
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: '100%',
            marginBottom: 12,
            padding: '8px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg-deep)',
            color: 'var(--text-primary)',
          }}
        />
        {loading && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r) => (
            <button
              key={r.source_index}
              type="button"
              onClick={() => {
                const props = Array.isArray(r.properties) ? r.properties.join(', ') : ''
                onPickWeapon({
                  name: r.name,
                  hit: '',
                  damage: r.damage_dice || '',
                  notes: [r.damage_type, props].filter(Boolean).join(' · '),
                })
                onClose()
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {r.damage_dice || '—'} {r.damage_type || ''} {r.weapon_category || ''}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 14,
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
