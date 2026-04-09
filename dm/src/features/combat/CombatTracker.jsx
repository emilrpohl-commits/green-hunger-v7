import React, { useState } from 'react'
import { useCombatStore } from '../../stores/combatStore'

const CONDITIONS = ['Blinded', 'Charmed', 'Frightened', 'Poisoned', 'Prone', 'Restrained', 'Stunned']

function CombatantRow({ combatant, isActive, index }) {
  const damageCombatant = useCombatStore(s => s.damageCombatant)
  const healCombatant = useCombatStore(s => s.healCombatant)
  const toggleCondition = useCombatStore(s => s.toggleCondition)
  const setInitiative = useCombatStore(s => s.setInitiative)

  const [amount, setAmount] = useState('')
  const [showConditions, setShowConditions] = useState(false)

  const hpPct = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const hpColour = combatant.curHp === 0
    ? 'var(--danger)'
    : hpPct > 60 ? 'var(--green-bright)'
    : hpPct > 30 ? 'var(--warning)'
    : '#c46040'

  const isEnemy = combatant.type === 'enemy'

  const applyDamage = () => {
    if (!amount) return
    damageCombatant(combatant.id, parseInt(amount))
    setAmount('')
  }

  const applyHeal = () => {
    if (!amount) return
    healCombatant(combatant.id, parseInt(amount))
    setAmount('')
  }

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
      background: isActive
        ? 'rgba(122,184,106,0.07)'
        : combatant.curHp === 0
          ? 'rgba(196,64,64,0.05)'
          : 'transparent',
      borderLeft: isActive ? '2px solid var(--green-bright)' : '2px solid transparent',
      transition: 'all 0.2s ease',
      opacity: combatant.curHp === 0 && isEnemy ? 0.5 : 1
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Initiative badge */}
          <input
            type="number"
            value={combatant.initiative}
            onChange={e => setInitiative(combatant.id, e.target.value)}
            style={{
              width: 32, height: 22,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              background: isActive ? 'var(--green-dim)' : 'var(--bg-raised)',
              border: `1px solid ${isActive ? 'var(--green-mid)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: isActive ? 'var(--green-bright)' : 'var(--text-muted)',
              outline: 'none'
            }}
          />
          <div>
            <span style={{
              fontSize: 13,
              color: isEnemy ? '#c48060' : 'var(--text-primary)',
              fontFamily: isEnemy ? 'var(--font-body)' : 'var(--font-display)',
              letterSpacing: isEnemy ? 0 : '0.03em'
            }}>
              {combatant.name}
            </span>
            {isActive && (
              <span style={{
                marginLeft: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--green-bright)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                ← active
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)'
          }}>
            AC {combatant.ac}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: hpColour
          }}>
            {combatant.curHp}/{combatant.maxHp}
          </span>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${hpPct}%`,
          background: hpColour,
          borderRadius: 2,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* HP controls */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') applyDamage()
          }}
          placeholder="0"
          min="0"
          style={{
            flex: 1, padding: '4px 6px',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
        <button onClick={applyDamage} style={{
          padding: '4px 8px', fontSize: 11,
          background: 'rgba(196,64,64,0.15)',
          border: '1px solid rgba(196,64,64,0.35)',
          borderRadius: 'var(--radius)', color: 'var(--danger)'
        }}>
          DMG
        </button>
        <button onClick={applyHeal} style={{
          padding: '4px 8px', fontSize: 11,
          background: 'rgba(122,184,106,0.1)',
          border: '1px solid rgba(122,184,106,0.3)',
          borderRadius: 'var(--radius)', color: 'var(--green-bright)'
        }}>
          HEAL
        </button>
      </div>

      {/* Quick damage buttons */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
        {[1, 2, 3, 5, 8, 10].map(n => (
          <button key={n} onClick={() => damageCombatant(combatant.id, n)} style={{
            padding: '2px 6px', fontSize: 10,
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--danger)'
          }}>
            -{n}
          </button>
        ))}
        {[1, 2, 3, 5].map(n => (
          <button key={`h${n}`} onClick={() => healCombatant(combatant.id, n)} style={{
            padding: '2px 6px', fontSize: 10,
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--green-bright)'
          }}>
            +{n}
          </button>
        ))}
      </div>

      {/* Conditions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {combatant.conditions.map(cond => (
          <span
            key={cond}
            onClick={() => toggleCondition(combatant.id, cond)}
            style={{
              padding: '1px 6px', fontSize: 10,
              background: 'rgba(196,160,64,0.15)',
              border: '1px solid rgba(196,160,64,0.35)',
              borderRadius: 'var(--radius)',
              color: 'var(--warning)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            {cond} ×
          </span>
        ))}
        <button
          onClick={() => setShowConditions(!showConditions)}
          style={{
            padding: '1px 6px', fontSize: 10,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          + cond
        </button>
      </div>

      {/* Condition picker */}
      {showConditions && (
        <div style={{
          marginTop: 6,
          display: 'flex', gap: 3, flexWrap: 'wrap',
          padding: '6px 8px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)'
        }}>
          {CONDITIONS.map(cond => (
            <button
              key={cond}
              onClick={() => { toggleCondition(combatant.id, cond); setShowConditions(false) }}
              style={{
                padding: '2px 7px', fontSize: 10,
                background: combatant.conditions.includes(cond) ? 'rgba(196,160,64,0.2)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: combatant.conditions.includes(cond) ? 'var(--warning)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {cond}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CombatTracker() {
  const active = useCombatStore(s => s.active)
  const round = useCombatStore(s => s.round)
  const combatants = useCombatStore(s => s.combatants)
  const activeCombatantIndex = useCombatStore(s => s.activeCombatantIndex)
  const feed = useCombatStore(s => s.feed)
  const nextTurn = useCombatStore(s => s.nextTurn)
  const prevTurn = useCombatStore(s => s.prevTurn)
  const sortInitiative = useCombatStore(s => s.sortInitiative)
  const endCombat = useCombatStore(s => s.endCombat)
  const launchCorruptedHunt = useCombatStore(s => s.launchCorruptedHunt)

  const activeCombatant = combatants[activeCombatantIndex]

  if (!active) {
    return (
      <div style={{ padding: '16px 14px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 12
        }}>
          Encounters
        </div>
        <button
          onClick={launchCorruptedHunt}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(196,64,64,0.1)',
            border: '1px solid rgba(196,64,64,0.3)',
            borderRadius: 'var(--radius-lg)',
            color: '#d48060',
            fontSize: 13,
            textAlign: 'left',
            cursor: 'pointer',
            marginBottom: 8
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.04em', marginBottom: 2 }}>
            ⚔ Corrupted Hunt
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            2× Corrupted Wolves · Scene 4
          </div>
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Combat header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(196,64,64,0.06)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--danger)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              ⚔ Combat
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-secondary)'
            }}>
              Round {round}
            </span>
          </div>
          <button onClick={endCombat} style={{
            padding: '3px 8px', fontSize: 10,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}>
            End
          </button>
        </div>

        {/* Turn controls */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={sortInitiative} style={{
            flex: 1, padding: '5px 0', fontSize: 11,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)', cursor: 'pointer'
          }}>
            Sort Init
          </button>
          <button onClick={prevTurn} style={{
            padding: '5px 10px', fontSize: 11,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)', cursor: 'pointer'
          }}>
            ←
          </button>
          <button onClick={nextTurn} style={{
            flex: 2, padding: '5px 0', fontSize: 12,
            background: 'var(--green-dim)',
            border: '1px solid var(--green-mid)',
            borderRadius: 'var(--radius)',
            color: 'var(--green-bright)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em'
          }}>
            Next Turn →
          </button>
        </div>
      </div>

      {/* Combatant list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {combatants.map((c, i) => (
          <CombatantRow
            key={c.id}
            combatant={c}
            isActive={i === activeCombatantIndex}
            index={i}
          />
        ))}
      </div>

      {/* Combat feed */}
      <div style={{
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        maxHeight: 140,
        overflow: 'auto',
        padding: '8px 12px'
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 5
        }}>
          Combat Log
        </div>
        {feed.map(event => (
          <div key={event.id} style={{
            fontSize: 11,
            color: event.type === 'damage' ? '#c48060'
              : event.type === 'heal' ? 'var(--green-bright)'
              : event.type === 'round' ? 'var(--text-muted)'
              : event.type === 'system' ? 'var(--warning)'
              : 'var(--text-secondary)',
            padding: '1px 0',
            fontFamily: event.type === 'round' ? 'var(--font-mono)' : 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            {event.shared && (
              <span style={{ fontSize: 8, color: 'var(--green-dim)' }}>●</span>
            )}
            {event.text}
          </div>
        ))}
      </div>
    </div>
  )
}
