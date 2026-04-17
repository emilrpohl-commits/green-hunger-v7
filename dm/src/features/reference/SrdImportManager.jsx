import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'

const TABLES = [
  { key: 'reference_spells', label: 'Spells' },
  { key: 'reference_monsters', label: 'Monsters' },
  { key: 'reference_conditions', label: 'Conditions' },
  { key: 'reference_classes', label: 'Classes' },
  { key: 'reference_class_features', label: 'Class features' },
  { key: 'reference_subclasses', label: 'Subclasses' },
  { key: 'reference_races', label: 'Races / species' },
  { key: 'reference_traits', label: 'Traits' },
  { key: 'reference_equipment', label: 'Equipment' },
  { key: 'reference_magic_items', label: 'Magic items' },
  { key: 'reference_backgrounds', label: 'Backgrounds' },
  { key: 'reference_proficiencies', label: 'Proficiencies' },
  { key: 'reference_languages', label: 'Languages' },
  { key: 'reference_skills', label: 'Skills' },
  { key: 'reference_damage_types', label: 'Damage types' },
]

export default function SrdImportManager() {
  const [ruleset, setRuleset] = useState('2014')
  const [counts, setCounts] = useState({})
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const mono = { fontFamily: 'var(--font-mono)', fontSize: 11 }

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const next = {}
      for (const { key } of TABLES) {
        const { count, error } = await supabase
          .from(key)
          .select('*', { count: 'exact', head: true })
          .eq('ruleset', ruleset)
        if (error) next[key] = '—'
        else next[key] = count ?? 0
      }
      setCounts(next)
      const { data: logData, error: logErr } = await supabase
        .from('srd_import_log')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(25)
      if (logErr) setLogs([])
      else setLogs(logData || [])
    } catch (e) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [ruleset])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const cli = `cd dm && npm run reference:import -- --ruleset=${ruleset} --category=all`

  return (
    <div style={{ padding: '20px 24px 40px', maxWidth: 960 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-bright)', marginTop: 0 }}>
        SRD import manager
      </h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 720 }}>
        Imports run from the CLI (service role). This dashboard shows row counts for the selected ruleset and recent
        <code style={{ ...mono, margin: '0 4px' }}>srd_import_log</code> entries after a successful import.
        See <strong>docs/reference-import-contract.md</strong>.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ ...mono, color: 'var(--text-muted)' }}>Ruleset</label>
        <select
          value={ruleset}
          onChange={(e) => setRuleset(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)' }}
        >
          <option value="2014">2014</option>
          <option value="2024">2024</option>
        </select>
        <button
          type="button"
          onClick={() => void refresh()}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--green-mid)',
            background: 'var(--green-dim)',
            color: 'var(--green-bright)',
            cursor: 'pointer',
            ...mono,
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh counts'}
        </button>
      </div>

      {err && <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{err}</div>}

      <div style={{ marginBottom: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', ...mono }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Table</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Rows ({ruleset})</th>
            </tr>
          </thead>
          <tbody>
            {TABLES.map(({ key, label }) => (
              <tr key={key}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{label}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{counts[key] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>CLI (copy)</div>
        <div style={{ padding: 12, background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', ...mono, fontSize: 12, wordBreak: 'break-all' }}>
          {cli}
        </div>
        <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
          Dry run: <code>npm run reference:import:dry-run -- --category=equipment --ruleset=2014</code>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>Recent import log</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(logs || []).length === 0 && <div style={{ color: 'var(--text-muted)', ...mono }}>No log rows (run an import with DB credentials).</div>}
        {logs.map((row) => (
          <div
            key={row.id}
            style={{
              padding: 10,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              ...mono,
              fontSize: 11,
            }}
          >
            <strong>{row.category}</strong> · {row.ruleset}
            {' · '}
            ok {row.success_rows}/{row.total_rows}
            {row.error_rows ? ` · errors ${row.error_rows}` : ''}
            {row.completed_at && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                {new Date(row.completed_at).toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
