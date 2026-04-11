import React, { useMemo, useState } from 'react'
import {
  mobHitProbability,
  mobExpectedHits,
  averageNdX,
  mobExpectedDamage,
} from '@shared/lib/dmToolbox/mobCombat.js'

export default function ToolboxMobCombat({ compact = false }) {
  const [mobCount, setMobCount] = useState(8)
  const [attackBonus, setAttackBonus] = useState(5)
  const [targetAc, setTargetAc] = useState(15)
  const [advantage, setAdvantage] = useState('normal')
  const [dmgN, setDmgN] = useState(1)
  const [dmgS, setDmgS] = useState(6)
  const [dmgFlat, setDmgFlat] = useState(0)
  const [showTable, setShowTable] = useState(false)

  const hitOpts = useMemo(
    () => ({ mobCount, attackBonus, targetAc, advantage }),
    [mobCount, attackBonus, targetAc, advantage]
  )

  const pHit = mobHitProbability(hitOpts)
  const expectedHits = mobExpectedHits(hitOpts)
  const avgDmg = averageNdX(dmgN, dmgS, dmgFlat)
  const expectedDmg = mobExpectedDamage(hitOpts, avgDmg)
  const needOnDie = Math.max(2, Math.min(20, targetAc - attackBonus))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 520 }}>
        Calculator first: probability, expected hits, optional damage. Expand the reference table when you need quick odds.
      </p>

      <div style={grid(compact)}>
        <Field label="Mob size" value={mobCount} onChange={setMobCount} min={1} max={200} />
        <Field label="Attack bonus" value={attackBonus} onChange={setAttackBonus} min={-5} max={25} />
        <Field label="Target AC" value={targetAc} onChange={setTargetAc} min={5} max={30} />
        <div>
          <div style={label}>Advantage</div>
          <select
            value={advantage}
            onChange={(e) => setAdvantage(e.target.value)}
            style={input}
          >
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
        </div>
      </div>

      <div style={outcomeBox}>
        <div style={outRow}>
          <span style={outLabel}>P(hit) each attack</span>
          <span style={outVal}>{(pHit * 100).toFixed(1)}%</span>
        </div>
        <div style={outRow}>
          <span style={outLabel}>d20 needed (excl. crit rules detail)</span>
          <span style={outVal}>≥ {needOnDie}</span>
        </div>
        <div style={outRow}>
          <span style={outLabel}>Expected hits this round</span>
          <span style={outVal}>{expectedHits.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Optional damage
      </div>
      <div style={grid(compact)}>
        <Field label="Damage dice (N)" value={dmgN} onChange={setDmgN} min={0} max={40} />
        <Field label="Die size" value={dmgS} onChange={setDmgS} min={4} max={12} step={2} />
        <Field label="Flat bonus" value={dmgFlat} onChange={setDmgFlat} min={0} max={30} />
      </div>
      <div style={outcomeBox}>
        <div style={outRow}>
          <span style={outLabel}>Avg damage per hit</span>
          <span style={outVal}>{avgDmg.toFixed(2)}</span>
        </div>
        <div style={outRow}>
          <span style={outLabel}>Expected total damage</span>
          <span style={outVal}>{expectedDmg.toFixed(2)}</span>
        </div>
      </div>

      <button type="button" onClick={() => setShowTable((v) => !v)} style={toggleBtn}>
        {showTable ? '▼ Hide hit% table' : '▶ Show hit% vs AC (reference)'}
      </button>
      {showTable && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-raised)' }}>
                <th style={th}>AC</th>
                {['normal', 'advantage', 'disadvantage'].map((adv) => (
                  <th key={adv} style={th}>{adv}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[10, 12, 14, 15, 16, 18, 20].map((ac) => (
                <tr key={ac}>
                  <td style={td}>{ac}</td>
                  {['normal', 'advantage', 'disadvantage'].map((adv) => {
                    const p = mobHitProbability({ attackBonus, targetAc: ac, advantage: adv })
                    return (
                      <td key={adv} style={td}>{(p * 100).toFixed(0)}%</td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: 8 }}>
            Using attack bonus {attackBonus}. Nat 1 miss / nat 20 hit included.
          </div>
        </div>
      )}
    </div>
  )
}

function grid(compact) {
  return {
    display: 'grid',
    gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  }
}

function Field({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={input}
      />
    </div>
  )
}

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 4,
}
const label = labelStyle
const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: 13,
}
const outcomeBox = {
  padding: '12px 14px',
  borderRadius: 'var(--radius)',
  border: '1px solid rgba(100, 160, 100, 0.25)',
  background: 'rgba(30, 45, 32, 0.35)',
}
const outRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }
const outLabel = { fontSize: 12, color: 'var(--text-secondary)' }
const outVal = { fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--green-bright)', fontWeight: 700 }
const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }
const td = { padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }
const toggleBtn = {
  alignSelf: 'flex-start',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '8px 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
