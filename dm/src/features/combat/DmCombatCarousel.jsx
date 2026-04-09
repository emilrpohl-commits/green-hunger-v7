import React, { useState, useEffect, useRef } from 'react'
import { useCombatStore } from '../../stores/combatStore'
import { getAcWithEffects, applyDeterministicRollModifiers } from '@shared/lib/combatRules.js'

/**
 * DmCombatCarousel
 *
 * Portrait-first vertical initiative tracker for the DM view.
 * Replaces the 2-column grid when the DM toggles carousel mode.
 *
 * - Active combatant: large centred portrait with glow
 * - Others: smaller, dimmed, stacked above/below
 * - Active combatant's HP controls appear inline below the portrait
 * - All combatants are interactive (DM controls all)
 */

function hpColour(curHp, hpPct) {
  if (curHp === 0) return 'var(--danger)'
  if (hpPct > 60) return 'var(--green-bright)'
  if (hpPct > 30) return 'var(--warning)'
  return '#c46040'
}

function portraitSrc(combatant) {
  if (!combatant.image) return null
  if (combatant.type === 'enemy') return combatant.image
  return `https://emilrpohl-commits.github.io/greenhunger-players/characters/${combatant.image}`
}

function PortraitThumb({ combatant, distance, onClick }) {
  const src = portraitSrc(combatant)
  const hpPct = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const colour = combatant.type === 'enemy' ? 'var(--rot-mid)' : 'var(--green-mid)'
  const dead = combatant.curHp === 0 && combatant.type === 'enemy'

  const scale = Math.max(0.72, 0.88 - distance * 0.06)
  const opacity = Math.max(0.25, 0.58 - distance * 0.12)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transform: `scale(${scale})`,
        opacity,
        filter: `grayscale(0.3) ${dead ? 'grayscale(0.6)' : ''}`,
        transition: 'all 380ms cubic-bezier(0.4,0,0.2,1)',
        cursor: 'pointer',
        padding: '4px 0',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        border: `2px solid ${colour}50`,
        position: 'relative',
      }}>
        {src ? (
          <img
            src={src}
            alt={combatant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 20, color: colour,
            background: `${colour}20`,
          }}>
            {combatant.name[0]}
          </div>
        )}
        {dead && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--danger)',
          }}>✕</div>
        )}
      </div>
      <div>
        <div style={{
          fontFamily: combatant.type === 'enemy' ? 'var(--font-body)' : 'var(--font-display)',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          {combatant.name}
        </div>
        <div style={{
          marginTop: 3,
          width: 70,
          height: 3,
          background: 'var(--border)',
          borderRadius: 2,
        }}>
          <div style={{
            height: '100%',
            width: `${hpPct}%`,
            background: hpColour(combatant.curHp, hpPct),
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          marginTop: 2,
        }}>
          {combatant.type === 'player' ? `${combatant.curHp} hp` : dead ? 'defeated' : ''}
        </div>
      </div>
    </div>
  )
}

function ActivePortrait({ combatant, players }) {
  const damageCombatant = useCombatStore(s => s.damageCombatant)
  const healCombatant = useCombatStore(s => s.healCombatant)
  const toggleCondition = useCombatStore(s => s.toggleCondition)
  const addEffect = useCombatStore(s => s.addEffect)
  const removeEffect = useCombatStore(s => s.removeEffect)
  const setInitiative = useCombatStore(s => s.setInitiative)
  const pushFeedEvent = useCombatStore(s => s.pushFeedEvent)

  const [amount, setAmount] = useState('')
  const [showConditions, setShowConditions] = useState(false)

  const src = portraitSrc(combatant)
  const hpPct = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const colour = combatant.type === 'enemy' ? 'var(--rot-bright)' : 'var(--green-bright)'
  const colourRaw = combatant.type === 'enemy' ? '#c47040' : '#7ab86a'
  const hpCol = hpColour(combatant.curHp, hpPct)
  const effects = combatant.effects || []
  const conditions = combatant.conditions || []

  const CONDITIONS = ['Blinded','Charmed','Frightened','Poisoned','Prone','Restrained','Stunned','Unconscious','Grappled','Paralysed']

  const applyDamage = () => {
    const val = parseInt(amount)
    if (!val || val <= 0) return
    damageCombatant(combatant.id, val)
    setAmount('')
  }

  const applyHeal = () => {
    const val = parseInt(amount)
    if (!val || val <= 0) return
    healCombatant(combatant.id, val)
    setAmount('')
  }

  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
      {/* Portrait */}
      <div style={{
        width: '100%',
        height: 240,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        border: `2px solid ${colourRaw}80`,
        boxShadow: `0 0 40px ${colourRaw}40, 0 8px 32px rgba(0,0,0,0.7)`,
      }}>
        {src ? (
          <img
            src={src}
            alt={combatant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 52,
            color: colour, background: `${colourRaw}15`,
          }}>
            {combatant.name[0]}
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(10,12,10,0.90) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Colour halo */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: `linear-gradient(to top, ${colourRaw}25, transparent)`,
          pointerEvents: 'none',
        }} />

        {/* Name + identity */}
        <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
          <div style={{
            fontFamily: combatant.type === 'enemy' ? 'var(--font-body)' : 'var(--font-display)',
            fontSize: 20,
            color: 'var(--text-primary)',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}>
            {combatant.name}
          </div>
          {conditions.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              {conditions.map(c => (
                <span key={c} onClick={() => toggleCondition(combatant.id, c)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  padding: '1px 5px',
                  background: 'rgba(196,160,64,0.2)',
                  border: '1px solid rgba(196,160,64,0.4)',
                  borderRadius: 3,
                  color: 'var(--warning)',
                  cursor: 'pointer',
                }}>
                  {c} ×
                </span>
              ))}
            </div>
          )}
          {combatant.concentration && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 8,
              color: 'var(--warning)', marginTop: 3,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>◈ Concentrating</div>
          )}
        </div>

        {/* HP overlay */}
        <div style={{ position: 'absolute', bottom: 12, right: 14, textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 32, fontWeight: 700,
            color: hpCol,
            textShadow: `0 2px 8px ${hpCol}80`,
            lineHeight: 1,
          }}>
            {combatant.curHp}
            {(combatant.tempHp ?? 0) > 0 && (
              <span style={{ fontSize: 15, color: 'var(--info)' }}>+{combatant.tempHp}</span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
            / {combatant.maxHp} hp · AC {combatant.ac}
          </div>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${hpPct}%`, background: hpCol, transition: 'width 0.4s ease' }} />
      </div>

      {/* Active spell effects */}
      {effects.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 0' }}>
          {effects.map(eff => (
            <div key={eff.name} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 7px',
              background: `${eff.colour}18`,
              border: `1px solid ${eff.colour}50`,
              borderRadius: 'var(--radius)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: eff.colour }}>{eff.name}</span>
              <button
                onClick={() => removeEffect(combatant.id, eff.name)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: '0 2px', lineHeight: 1 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* HP controls */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyDamage()}
          placeholder="Amt"
          min="0"
          style={{
            width: 60, padding: '5px 8px',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <button onClick={applyDamage} style={{
          padding: '5px 14px', fontSize: 12,
          background: 'rgba(196,64,64,0.12)', border: '1px solid rgba(196,64,64,0.35)',
          borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer',
        }}>
          − DMG
        </button>
        <button onClick={applyHeal} style={{
          padding: '5px 14px', fontSize: 12,
          background: 'rgba(122,184,106,0.08)', border: '1px solid rgba(122,184,106,0.3)',
          borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer',
        }}>
          + Heal
        </button>
        {/* Quick damage buttons */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[2, 4, 5, 6, 8, 10].map(n => (
            <button key={n} onClick={() => damageCombatant(combatant.id, n)} style={{
              padding: '3px 6px', fontSize: 10, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer',
            }}>
              -{n}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions toggle */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowConditions(s => !s)}
          style={{
            padding: '3px 10px', fontSize: 10,
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          {showConditions ? '▲ Conditions' : '+ Condition'}
        </button>
        {showConditions && (
          <div style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 4,
            display: 'flex', gap: 4, flexWrap: 'wrap',
            padding: '8px 10px', background: 'var(--bg-raised)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 320,
          }}>
            {CONDITIONS.map(cond => (
              <button key={cond} onClick={() => { toggleCondition(combatant.id, cond); setShowConditions(false) }} style={{
                padding: '3px 8px', fontSize: 11,
                background: conditions.includes(cond) ? 'rgba(196,160,64,0.2)' : 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                color: conditions.includes(cond) ? 'var(--warning)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                {cond}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DmCombatCarousel({ feed, logOpen }) {
  const combatants = useCombatStore(s => s.combatants)
  const activeCombatantIndex = useCombatStore(s => s.activeCombatantIndex)
  const setInitiative = useCombatStore(s => s.setInitiative)

  const prevIndexRef = useRef(activeCombatantIndex)
  useEffect(() => { prevIndexRef.current = activeCombatantIndex }, [activeCombatantIndex])

  if (!combatants?.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      No combatants yet
    </div>
  )

  const total = combatants.length
  const activeIdx = activeCombatantIndex ?? 0
  const activeCombatant = combatants[activeIdx]
  const players = combatants.filter(c => c.type === 'player')

  const VISIBLE_ABOVE = 2
  const VISIBLE_BELOW = 2

  const above = []
  for (let d = VISIBLE_ABOVE; d >= 1; d--) {
    const idx = (activeIdx - d + total) % total
    above.push({ combatant: combatants[idx], distance: d, idx: (activeIdx - d + total) % total })
  }

  const below = []
  for (let d = 1; d <= VISIBLE_BELOW; d++) {
    const idx = (activeIdx + d) % total
    below.push({ combatant: combatants[idx], distance: d, idx: (activeIdx + d) % total })
  }

  // Accent colour driven by active combatant type
  const accentRaw = activeCombatant?.type === 'enemy' ? '#c47040' : '#7ab86a'

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* ── Carousel column ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        padding: '16px 20px',
        gap: 8,
      }}>
        {/* Above combatants */}
        {above.map(({ combatant, distance }) => (
          <div key={combatant.id} style={{ width: '100%', maxWidth: 400 }}>
            <PortraitThumb combatant={combatant} distance={distance} />
          </div>
        ))}

        {/* Divider */}
        <div style={{
          width: '100%', maxWidth: 400, height: 1,
          background: `linear-gradient(to right, transparent, ${accentRaw}50, transparent)`,
          margin: '4px 0',
          transition: 'background 380ms ease',
        }} />

        {/* Active portrait + controls */}
        {activeCombatant && (
          <ActivePortrait combatant={activeCombatant} players={players} />
        )}

        {/* Divider */}
        <div style={{
          width: '100%', maxWidth: 400, height: 1,
          background: `linear-gradient(to right, transparent, ${accentRaw}50, transparent)`,
          margin: '4px 0',
          transition: 'background 380ms ease',
        }} />

        {/* Below combatants */}
        {below.map(({ combatant, distance }) => (
          <div key={combatant.id} style={{ width: '100%', maxWidth: 400 }}>
            <PortraitThumb combatant={combatant} distance={distance} />
          </div>
        ))}

        {/* Initiative order strip */}
        <div style={{
          width: '100%', maxWidth: 400,
          marginTop: 16,
          padding: '8px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Initiative Order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {combatants.map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '2px 0',
                opacity: c.curHp === 0 && c.type === 'enemy' ? 0.35 : 1,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: i === activeIdx ? accentRaw : 'var(--text-muted)',
                  fontWeight: i === activeIdx ? 700 : 400,
                }}>
                  {i === activeIdx ? '▶' : ' '} {c.initiative ?? '—'}
                </span>
                <span style={{
                  fontSize: 11,
                  color: i === activeIdx ? 'var(--text-primary)' : 'var(--text-secondary)',
                  flex: 1,
                }}>
                  {c.name}
                </span>
                <input
                  type="number"
                  value={c.initiative ?? ''}
                  onChange={e => setInitiative(c.id, e.target.value)}
                  style={{
                    width: 34, height: 20, textAlign: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', color: 'var(--text-secondary)', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Combat log sidebar ── */}
      {logOpen && (
        <div style={{
          width: 220, borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            padding: '10px 12px 6px',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Combat Log
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {feed.filter(e => e.type !== 'player-save-prompt').map(event => (
              <div key={event.id} style={{
                fontSize: event.type === 'round' ? 9 : 12,
                fontFamily: event.type === 'round' ? 'var(--font-mono)' : 'var(--font-body)',
                color: event.type === 'damage' ? '#c49070'
                  : event.type === 'heal' ? 'var(--green-bright)'
                  : event.type === 'round' ? 'var(--text-muted)'
                  : 'var(--text-secondary)',
                borderTop: event.type === 'round' ? '1px solid var(--border)' : 'none',
                paddingTop: event.type === 'round' ? 5 : 0,
                marginTop: event.type === 'round' ? 3 : 0,
                lineHeight: 1.4,
              }}>
                {event.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
