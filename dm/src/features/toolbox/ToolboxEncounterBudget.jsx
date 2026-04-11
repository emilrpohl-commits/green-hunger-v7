import React, { useMemo, useState } from 'react'
import { partyXpBudget, XP_THRESHOLDS_BY_LEVEL } from '@shared/lib/dmToolbox/encounterXpThresholds.js'
import { encounterMultiplier, adjustedEncounterXp } from '@shared/lib/dmToolbox/quickRulingsData.js'
import { useDmToolboxStore } from '../../stores/dmToolboxStore.js'

export default function ToolboxEncounterBudget({ compact = false }) {
  const [level, setLevel] = useState(5)
  const [partySize, setPartySize] = useState(4)
  const [difficulty, setDifficulty] = useState('medium')
  const [spendXp, setSpendXp] = useState('')
  const [monsterCount, setMonsterCount] = useState(4)
  const [sumBaseXp, setSumBaseXp] = useState(450)

  const remaining = useDmToolboxStore((s) => s.encounterBudgetRemaining)
  const initEncounterBudgetFromTotal = useDmToolboxStore((s) => s.initEncounterBudgetFromTotal)
  const subtractEncounterBudget = useDmToolboxStore((s) => s.subtractEncounterBudget)
  const setEncounterBudgetRemaining = useDmToolboxStore((s) => s.setEncounterBudgetRemaining)

  const total = useMemo(
    () => partyXpBudget(level, difficulty, partySize),
    [level, difficulty, partySize]
  )

  const perChar = XP_THRESHOLDS_BY_LEVEL[Math.min(20, Math.max(1, level))]?.[difficulty] ?? 0

  const xpMult = encounterMultiplier(monsterCount)
  const adjustedXp = adjustedEncounterXp(sumBaseXp, monsterCount)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 520 }}>
        Party XP budget from DMG-style thresholds. Optionally track remaining XP while you slot monsters in.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
        <NumField label="Party level (avg)" value={level} onChange={setLevel} min={1} max={20} />
        <NumField label="Party size" value={partySize} onChange={setPartySize} min={1} max={12} />
        <div>
          <div style={lab}>Difficulty</div>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inp}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="deadly">Deadly</option>
          </select>
        </div>
      </div>

      <div style={box}>
        <div style={row}>
          <span style={k}>Per character ({difficulty})</span>
          <span style={v}>{perChar.toLocaleString()} XP</span>
        </div>
        <div style={row}>
          <span style={k}>Total party budget</span>
          <span style={vLarge}>{total.toLocaleString()} XP</span>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Adjusted encounter XP (monster count)
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Add each creature’s XP, then apply the multiplier for how many monsters are in the fight. Compare <strong style={{ color: 'var(--text-secondary)' }}>adjusted XP</strong> to the party budget above.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={lab}>Count</span>
          {[1, 2, 4, 6, 8, 12, 15].map((n) => (
            <button key={n} type="button" onClick={() => setMonsterCount(n)} style={xpPill(monsterCount === n)}>
              {n}
            </button>
          ))}
          <input
            type="range"
            min={1}
            max={20}
            value={monsterCount}
            onChange={(e) => setMonsterCount(Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green-bright)' }}>{monsterCount}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <span style={lab}>Sum base XP</span>
          {[100, 200, 400, 700, 1100, 1800].map((xp) => (
            <button key={xp} type="button" onClick={() => setSumBaseXp(xp)} style={xpPill(sumBaseXp === xp)}>
              {xp}
            </button>
          ))}
        </div>
        <div style={{ ...box, margin: 0 }}>
          <div style={row}>
            <span style={k}>Multiplier</span>
            <span style={v}>×{xpMult}</span>
          </div>
          <div style={row}>
            <span style={k}>Adjusted XP</span>
            <span style={vLarge}>{adjustedXp.toLocaleString()}</span>
          </div>
          <div style={{ ...row, marginBottom: 0, marginTop: 8 }}>
            <span style={k}>vs party budget</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: adjustedXp <= total ? 'var(--green-bright)' : 'var(--warning)', fontWeight: 600 }}>
              {total <= 0
                ? '—'
                : `${adjustedXp <= total ? 'within' : 'over'} (${((adjustedXp / total) * 100).toFixed(0)}%)`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={() => subtractEncounterBudget(adjustedXp)}
            style={btn}
            title="Uses current remaining tracker; set remaining first if needed"
          >
            Subtract adjusted from remaining
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Remaining budget tracker (optional)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => initEncounterBudgetFromTotal(total)} style={btn}>
            Set remaining = total
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green-bright)' }}>
            Remaining: {remaining != null ? `${remaining.toLocaleString()} XP` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input
            type="number"
            placeholder="Subtract XP"
            value={spendXp}
            onChange={(e) => setSpendXp(e.target.value)}
            style={{ ...inp, maxWidth: 120 }}
          />
          <button
            type="button"
            onClick={() => {
              const n = Number(spendXp)
              if (Number.isFinite(n) && n > 0) subtractEncounterBudget(n)
              setSpendXp('')
            }}
            style={btn}
          >
            Subtract
          </button>
          <button type="button" onClick={() => setEncounterBudgetRemaining(null)} style={btnGhost}>
            Clear tracker
          </button>
        </div>
      </div>
    </div>
  )
}

function NumField({ label, value, onChange, min, max }) {
  return (
    <div>
      <div style={lab}>{label}</div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inp}
      />
    </div>
  )
}

const lab = { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }
const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: 13 }
const box = { padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(200, 160, 80, 0.35)', background: 'rgba(45, 38, 22, 0.35)' }
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }
const k = { fontSize: 12, color: 'var(--text-secondary)' }
const v = { fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--warning)', fontWeight: 600 }
const vLarge = { fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--green-bright)', fontWeight: 700 }
const btn = { padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--green-mid)', background: 'var(--green-dim)', color: 'var(--green-bright)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', textTransform: 'uppercase' }
const btnGhost = { ...btn, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }

function xpPill(active) {
  return {
    padding: '5px 10px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    background: active ? 'var(--green-dim)' : 'var(--bg-raised)',
    color: active ? 'var(--green-bright)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    cursor: 'pointer',
  }
}
