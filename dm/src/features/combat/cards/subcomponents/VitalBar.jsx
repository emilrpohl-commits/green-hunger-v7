import React from 'react'
import { HP_COLOUR, isBloodied } from '../constants.js'

/**
 * VitalBar
 *
 * Renders:
 *   - A prominent HP number (current / max) with optional temp HP
 *   - An HP bar with a bloodied-threshold tick at 50%
 *   - AC badge, Speed badge, and any extra badges passed in
 *
 * Pure display — no store access.
 */
export default function VitalBar({
  curHp,
  maxHp,
  tempHp = 0,
  ac,
  speed,
  extraBadges = [],    // [{ label, value }]
  large = false,       // true → larger HP number (focused card)
  combatant,           // if passed, used to derive bloodied highlight
}) {
  // Null-safe HP values so bar % always matches displayed number
  const safeCur  = typeof curHp === 'number' && isFinite(curHp) ? curHp : 0
  const safeMax  = typeof maxHp === 'number' && maxHp > 0       ? maxHp : 1
  const safeTmp  = typeof tempHp === 'number' && isFinite(tempHp) ? tempHp : 0

  const hpPct    = Math.min(100, (safeCur / safeMax) * 100)
  const hpColour = HP_COLOUR(hpPct, safeCur)
  const bloodied = combatant ? isBloodied(combatant) : hpPct <= 50 && safeCur > 0

  const hpFontSize = large ? 36 : 22
  const maxFontSize = large ? 13 : 10

  return (
    <div>
      {/* HP number row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: hpFontSize,
            fontWeight: 700,
            color: hpColour,
            lineHeight: 1,
            transition: 'color 0.4s ease',
          }}>
            {safeCur}
          </span>
          {safeTmp > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: large ? 16 : 12,
              color: 'var(--info)',
              lineHeight: 1,
            }}>
              ●+{safeTmp}
            </span>
          )}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: maxFontSize,
            color: 'var(--text-muted)',
            lineHeight: 1,
          }}>
            / {safeMax} hp
          </span>
          {bloodied && safeCur > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'var(--rot-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginLeft: 2,
            }}>
              bloodied
            </span>
          )}
        </div>

        {/* Stat badges */}
        {(ac != null || speed != null || extraBadges.length > 0) && (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {ac != null && <StatBadge label="AC" value={ac} />}
            {speed != null && <StatBadge label="SPD" value={`${speed}′`} />}
            {extraBadges.map(b => <StatBadge key={b.label} label={b.label} value={b.value} />)}
          </div>
        )}
      </div>

      {/* HP bar */}
      <div className="hp-track" style={{ marginTop: 5, borderRadius: 3, overflow: 'hidden' }}>
        {/* width driven by the same safeCur/safeMax values used for the displayed number */}
        <div
          className="hp-fill"
          style={{ width: `${hpPct}%`, background: hpColour, borderRadius: 3 }}
        />
      </div>
    </div>
  )
}

function StatBadge({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      padding: '2px 7px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}
