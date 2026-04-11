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
function exhaustionLabel(c) {
  const lv = Math.max(0, Math.min(6, Math.floor(Number(c?.exhaustionLevel) || 0)))
  if (lv <= 0) return 'Exhaustion'
  return `Exhaustion ${lv}`
}

export default function ConditionChips({ combatant, compact = false }) {
  const toggleCondition = useCombatStore(s => s.toggleCondition)
  const setCombatantExhaustionLevel = useCombatStore(s => s.setCombatantExhaustionLevel)
  const addEffect       = useCombatStore(s => s.addEffect)
  const removeEffect    = useCombatStore(s => s.removeEffect)

  const [showCondPicker, setShowCondPicker] = useState(false)
  const [showEffectPicker, setShowEffectPicker] = useState(false)
  const pickerRef = useRef(null)
  const [overlayPos, setOverlayPos] = useState({ left: 0, top: 0, openUp: false })

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

  function openPopover(kind) {
    const rect = pickerRef.current?.getBoundingClientRect()
    if (rect) {
      const estimatedH = kind === 'effect' ? 260 : 220
      const openUp = rect.bottom + estimatedH + 12 > window.innerHeight
      setOverlayPos({
        left: Math.max(10, Math.min(rect.left, window.innerWidth - 360)),
        top: openUp ? Math.max(10, rect.top - estimatedH - 8) : rect.bottom + 6,
        openUp,
      })
    }
    if (kind === 'condition') {
      setShowCondPicker(v => !v)
      setShowEffectPicker(false)
    } else {
      setShowEffectPicker(v => !v)
      setShowCondPicker(false)
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={pickerRef}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Active conditions */}
        {conditions.map(cond => {
          const colour = CONDITION_COLOUR[cond] || '#a09080'
          const title  = CONDITION_DESC[cond] || cond
          const label  = cond === 'Exhaustion' ? exhaustionLabel(combatant) : cond
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
              {label}
              <span style={{ fontSize: 10, opacity: 0.7, lineHeight: 1 }}>×</span>
            </span>
          )
        })}
        {conditions.includes('Exhaustion') && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Lv</span>
            {[1, 2, 3, 4, 5, 6].map((lv) => {
              const cur = Math.max(0, Math.min(6, Math.floor(Number(combatant.exhaustionLevel) || 1)))
              const sel = cur === lv
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCombatantExhaustionLevel(combatant.id, lv) }}
                  style={{
                    padding: '0 5px',
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    borderRadius: 4,
                    border: `1px solid ${sel ? 'var(--green-bright)' : 'var(--border)'}`,
                    background: sel ? 'rgba(122,184,106,0.15)' : 'var(--bg-card)',
                    color: sel ? 'var(--green-bright)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {lv}
                </button>
              )
            })}
          </span>
        )}

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
              onClick={() => openPopover('condition')}
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
              onClick={() => openPopover('effect')}
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
          position: 'fixed', zIndex: 320, top: overlayPos.top, left: overlayPos.left,
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
          position: 'fixed', zIndex: 320, top: overlayPos.top, left: overlayPos.left,
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
