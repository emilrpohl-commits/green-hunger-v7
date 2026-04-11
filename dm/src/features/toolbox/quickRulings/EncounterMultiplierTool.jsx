import React, { useMemo, useState } from 'react'
import { encounterMultiplier, adjustedEncounterXp } from '@shared/lib/dmToolbox/quickRulingsData.js'

const PRESET_COUNTS = [1, 2, 4, 6, 8, 12, 15]

export default function EncounterMultiplierTool({ compact = false, showBudgetHint = true }) {
  const [count, setCount] = useState(4)
  const [baseXp, setBaseXp] = useState(450)

  const mult = encounterMultiplier(count)
  const adjusted = adjustedEncounterXp(baseXp, count)

  const rows = useMemo(() => {
    const base = 400
    return [1, 2, 3, 6, 8, 15].map((n) => ({
      n,
      m: encounterMultiplier(n),
      adj: adjustedEncounterXp(base, n),
    }))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Encounter multipliers
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Sum all monsters’ XP first, then multiply by the factor for <strong style={{ color: 'var(--text-secondary)' }}>number of monsters</strong> (DMG-style).
      </p>

      <div>
        <div style={lab}>Monster count</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PRESET_COUNTS.map((n) => (
            <button key={n} type="button" onClick={() => setCount(n)} style={pill(count === n)}>
              {n}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          style={{ width: '100%', maxWidth: 240, marginTop: 8 }}
        />
      </div>

      <div>
        <div style={lab}>Sum of base XP (all monsters)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[100, 200, 400, 700, 1100, 1800].map((xp) => (
            <button key={xp} type="button" onClick={() => setBaseXp(xp)} style={pill(baseXp === xp)}>
              {xp}
            </button>
          ))}
        </div>
      </div>

      <div style={outBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Multiplier</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--green-bright)', fontWeight: 700 }}>×{mult}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Adjusted XP</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--warning)', fontWeight: 700 }}>
            {adjusted.toLocaleString()}
          </span>
        </div>
      </div>

      {showBudgetHint && (
        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Compare adjusted total to <strong>Encounter budget</strong> tab (party threshold).
        </p>
      )}

      {!compact && (
        <details style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase' }}>
            Quick matrix (base 400 XP)
          </summary>
          <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>×</th>
                <th style={th}>Adj</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.n}>
                  <td style={td}>{r.n}</td>
                  <td style={td}>{r.m}</td>
                  <td style={td}>{r.adj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}

const lab = { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }
const outBox = {
  padding: '12px 14px',
  borderRadius: 'var(--radius)',
  border: '1px solid rgba(200, 160, 80, 0.3)',
  background: 'rgba(45, 38, 22, 0.25)',
}
const th = { textAlign: 'left', padding: 4, borderBottom: '1px solid var(--border)' }
const td = { padding: 4, borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }

function pill(active) {
  return {
    padding: '6px 10px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    background: active ? 'var(--green-dim)' : 'var(--bg-raised)',
    color: active ? 'var(--green-bright)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    cursor: 'pointer',
  }
}
