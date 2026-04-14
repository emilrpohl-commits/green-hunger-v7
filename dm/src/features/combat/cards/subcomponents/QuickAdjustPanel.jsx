import React, { useState, useRef } from 'react'
import { useCombatStore } from '../../../../stores/combatStore.js'
import { DAMAGE_TYPE_SELECT_OPTIONS } from '@shared/lib/rules/damagePipeline.js'
import {
  readLastManualDamageType,
  writeLastManualDamageType,
} from '../../lastManualDamageTypeStorage.js'

const QUICK_DAMAGE = [2, 4, 5, 6, 8, 10, 12, 15, 20]
const QUICK_HEAL   = [4, 6, 8, 10]

/**
 * QuickAdjustPanel
 *
 * Controls for:
 *   - Typed amount + DMG / Heal buttons
 *   - Quick damage chips
 *   - Optional quick heal chips
 *   - Visual flash feedback on change
 *
 * Wires directly to combatStore.
 */
export default function QuickAdjustPanel({ combatant, showHealChips = false }) {
  const damageCombatant = useCombatStore(s => s.damageCombatant)
  const healCombatant   = useCombatStore(s => s.healCombatant)

  const [amount, setAmount] = useState('')
  const [damageTypeId, setDamageTypeId] = useState(readLastManualDamageType)
  const [flash, setFlash]   = useState(null) // 'dmg' | 'heal' | null
  const flashTimer = useRef(null)

  function triggerFlash(type) {
    clearTimeout(flashTimer.current)
    setFlash(type)
    flashTimer.current = setTimeout(() => setFlash(null), 500)
  }

  function applyDamage(val) {
    const n = parseInt(val) || parseInt(amount)
    if (!n || n <= 0) return
    writeLastManualDamageType(damageTypeId)
    damageCombatant(combatant.id, n, damageTypeId || null)
    setAmount('')
    triggerFlash('dmg')
  }

  function applyHeal(val) {
    const n = parseInt(val) || parseInt(amount)
    if (!n || n <= 0) return
    healCombatant(combatant.id, n)
    setAmount('')
    triggerFlash('heal')
  }

  return (
    <div>
      {/* Flash overlay */}
      {flash && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            pointerEvents: 'none', borderRadius: 'var(--radius-lg)',
            animation: `${flash === 'dmg' ? 'hp-flash' : 'hp-heal-flash'} 500ms ease forwards`,
          }}
        />
      )}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyDamage()}
          placeholder="Amt"
          min="0"
          style={{
            width: 58, padding: '4px 7px',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <button
          onClick={() => applyDamage()}
          style={{
            padding: '4px 12px', fontSize: 11,
            background: 'rgba(196,64,64,0.12)', border: '1px solid rgba(196,64,64,0.4)',
            borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
          }}
        >
          − DMG
        </button>
        <button
          onClick={() => applyHeal()}
          style={{
            padding: '4px 12px', fontSize: 11,
            background: 'rgba(122,184,106,0.08)', border: '1px solid rgba(122,184,106,0.3)',
            borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
          }}
        >
          + Heal
        </button>
        <select
          value={damageTypeId}
          onChange={(e) => setDamageTypeId(e.target.value)}
          title="Damage type (R/V/I when rules pipeline flag is on)"
          style={{
            maxWidth: 112,
            padding: '4px 6px',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          {DAMAGE_TYPE_SELECT_OPTIONS.map((o) => (
            <option key={o.value || 'untyped'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick damage chips */}
      <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
        {QUICK_DAMAGE.map(n => (
          <button
            key={n}
            onClick={() => applyDamage(n)}
            style={{
              padding: '2px 6px', fontSize: 10,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)',
              border: '1px solid rgba(196,64,64,0.25)',
              borderRadius: 'var(--radius)',
              color: 'var(--danger)', cursor: 'pointer',
              transition: 'background 100ms ease',
            }}
          >
            -{n}
          </button>
        ))}
        {showHealChips && QUICK_HEAL.map(n => (
          <button
            key={`h${n}`}
            onClick={() => applyHeal(n)}
            style={{
              padding: '2px 6px', fontSize: 10,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)',
              border: '1px solid rgba(122,184,106,0.25)',
              borderRadius: 'var(--radius)',
              color: 'var(--green-bright)', cursor: 'pointer',
            }}
          >
            +{n}
          </button>
        ))}
      </div>
    </div>
  )
}
