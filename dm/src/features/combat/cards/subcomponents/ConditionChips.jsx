import React, { useState, useRef, useEffect } from 'react'
import { useCombatStore } from '../../../../stores/combatStore.js'
import {
  CONDITIONS,
  CONDITION_COLOUR,
  CONDITION_DESC,
  HOSTILE_SPELL_EFFECTS,
  PC_BUFF_SPELL_EFFECTS,
} from '../constants.js'

/**
 * ConditionChips
 *
 * Renders:
 *   - All active conditions as coloured removable chips
 *   - All active spell effects as coloured removable chips
 *   - "+ Condition" button → popover to add any condition
 *   - "✦ Effect" button → popover to apply / remove spell effects
 *
 * Wires directly to combatStore for add/remove — pass combatant, not id.
 */
export default function ConditionChips({ combatant, compact = false }) {
  const toggleCondition = useCombatStore(s => s.toggleCondition)
  const addEffect       = useCombatStore(s => s.addEffect)
  const removeEffect    = useCombatStore(s => s.removeEffect)

  const [showCondPicker, setShowCondPicker] = useState(false)
  const [showEffectPicker, setShowEffectPicker] = useState(false)
  const pickerRef = useRef(null)

  const conditions = combatant.conditions || []
  const effects    = combatant.effects    || []
  const isEnemy    = combatant.type === 'enemy'
  const effectList = isEnemy ? HOSTILE_SPELL_EFFECTS : PC_BUFF_SPELL_EFFECTS

  // Close pickers on outside click
  useEffect(() => {
    if (!showCondPicker && !showEffectPicker) return
    function handler(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowCondPicker(false)
        setShowEffectPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCondPicker, showEffectPicker])

  return (
    <div style={{ position: 'relative' }} ref={pickerRef}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Active conditions */}
        {conditions.map(cond => {
          const colour = CONDITION_COLOUR[cond] || '#a09080'
          const title  = CONDITION_DESC[cond] || cond
          return (
            <span
              key={cond}
              title={title}
              className="cond-chip"
              onClick={() => toggleCondition(combatant.id, cond)}
              style={{
                background: `${colour}20`,
                borderColor: `${colour}60`,
                color: colour,
              }}
            >
              {cond}
              <span style={{ fontSize: 10, opacity: 0.7, lineHeight: 1 }}>×</span>
            </span>
          )
        })}

        {/* Active spell effects */}
        {effects.map(eff => (
          <span
            key={eff.name}
            title={eff.mechanic || eff.name}
            className="cond-chip"
            onClick={() => removeEffect(combatant.id, eff.name)}
            style={{
              background: `${eff.colour}18`,
              borderColor: `${eff.colour}55`,
              color: eff.colour,
            }}
          >
            {eff.concentration && <span style={{ opacity: 0.7 }}>◈</span>}
            {eff.name}
            <span style={{ fontSize: 10, opacity: 0.7, lineHeight: 1 }}>×</span>
          </span>
        ))}

        {/* Add buttons */}
        {!compact && (
          <>
            <button
              onClick={() => { setShowCondPicker(v => !v); setShowEffectPicker(false) }}
              style={{
                padding: '2px 8px', fontSize: 9, fontFamily: 'var(--font-mono)',
                background: showCondPicker ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: '1px solid var(--border)', borderRadius: 20,
                color: 'var(--text-muted)', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              + Cond
            </button>
            <button
              onClick={() => { setShowEffectPicker(v => !v); setShowCondPicker(false) }}
              style={{
                padding: '2px 8px', fontSize: 9, fontFamily: 'var(--font-mono)',
                background: showEffectPicker ? 'rgba(160,96,192,0.1)' : 'transparent',
                border: '1px solid rgba(160,96,192,0.35)', borderRadius: 20,
                color: '#a060c0', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              ✦ Effect
            </button>
          </>
        )}
      </div>

      {/* Condition picker popover */}
      {showCondPicker && (
        <div style={{
          position: 'absolute', zIndex: 30, top: 'calc(100% + 6px)', left: 0,
          display: 'flex', gap: 4, flexWrap: 'wrap',
          padding: '10px 12px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 6px 28px rgba(0,0,0,0.6)',
          maxWidth: 340,
          animation: 'fade-in-down 150ms ease forwards',
        }}>
          {CONDITIONS.map(cond => {
            const active = conditions.includes(cond)
            const colour = CONDITION_COLOUR[cond] || '#a09080'
            return (
              <button
                key={cond}
                title={CONDITION_DESC[cond]}
                onClick={() => { toggleCondition(combatant.id, cond) }}
                style={{
                  padding: '3px 9px', fontSize: 10,
                  background: active ? `${colour}25` : 'var(--bg-card)',
                  border: `1px solid ${active ? colour : 'var(--border)'}`,
                  borderRadius: 20,
                  color: active ? colour : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 120ms ease',
                }}
              >
                {cond}
              </button>
            )
          })}
        </div>
      )}

      {/* Effect picker popover */}
      {showEffectPicker && (
        <div style={{
          position: 'absolute', zIndex: 30, top: 'calc(100% + 6px)', left: 0,
          padding: '10px 14px',
          background: 'var(--bg-raised)',
          border: '1px solid rgba(160,96,192,0.3)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 6px 28px rgba(0,0,0,0.6)',
          minWidth: 280,
          animation: 'fade-in-down 150ms ease forwards',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 8,
          }}>
            {isEnemy ? 'Apply Spell Effect' : 'Apply Buff (PC)'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {effectList.map(eff => {
              const already = effects.find(e => e.name === eff.name)
              return (
                <div key={eff.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: eff.colour }}>{eff.name}</span>
                    {eff.concentration && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--warning)', marginLeft: 5 }}>CONC</span>
                    )}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                      {eff.mechanic}
                    </div>
                  </div>
                  {already ? (
                    <button
                      onClick={() => { removeEffect(combatant.id, eff.name); setShowEffectPicker(false) }}
                      style={{ padding: '2px 8px', fontSize: 10, background: 'transparent', border: `1px solid ${eff.colour}50`, borderRadius: 'var(--radius)', color: eff.colour, cursor: 'pointer', flexShrink: 0 }}
                    >Remove</button>
                  ) : (
                    <button
                      onClick={() => { addEffect(combatant.id, { ...eff }); setShowEffectPicker(false) }}
                      style={{ padding: '2px 8px', fontSize: 10, background: `${eff.colour}18`, border: `1px solid ${eff.colour}50`, borderRadius: 'var(--radius)', color: eff.colour, cursor: 'pointer', flexShrink: 0 }}
                    >Apply</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
