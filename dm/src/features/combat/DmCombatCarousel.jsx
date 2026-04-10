import React, { useRef, useState, useEffect } from 'react'
import { useCombatStore } from '../../stores/combatStore'
import { HP_COLOUR } from './cards/constants.js'
import FocusedCard from './cards/FocusedCard.jsx'

/**
 * DmCombatCarousel
 *
 * Horizontal portrait-first initiative carousel for the DM view.
 *
 * Active tile → FocusedCard (full portrait + tabs: Overview / Actions)
 * Inactive tiles → InactiveTile (portrait thumbnail + name + HP bar)
 */

const INACTIVE_W = 136   // px — width of each dimmed tile slot
const ACTIVE_W   = 380   // px — width of the active tile slot
const GAP        = 14    // px — gap between tiles

function portraitSrc(combatant) {
  if (!combatant.image) return null
  if (/^https?:\/\//i.test(String(combatant.image)) || String(combatant.image).startsWith('data:')) return combatant.image
  if (combatant.type === 'enemy') return combatant.image
  return `https://emilrpohl-commits.github.io/greenhunger-players/characters/${combatant.image}`
}

function InactiveTile({ combatant, distance, onClick }) {
  const src    = portraitSrc(combatant)
  const hpPct  = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const colour = combatant.type === 'enemy' ? '#c47040' : '#7ab86a'
  const dead   = combatant.curHp === 0 && combatant.type === 'enemy'

  // Fade and shrink with distance from active
  const opacity = Math.max(0.2, 0.7 - distance * 0.18)
  const scale   = Math.max(0.75, 0.95 - distance * 0.07)

  return (
    <div
      onClick={onClick}
      style={{
        width: INACTIVE_W,
        flexShrink: 0,
        cursor: 'pointer',
        transform: `scale(${scale})`,
        opacity,
        filter: dead ? 'grayscale(0.5)' : 'grayscale(0.15)',
        transition: 'opacity 380ms ease, transform 380ms ease, filter 380ms ease',
        userSelect: 'none',
      }}
    >
      {/* Portrait */}
      <div style={{
        width: '100%',
        height: 140,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        border: `1px solid ${colour}40`,
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
            fontFamily: 'var(--font-display)', fontSize: 28, color: colour,
            background: `${colour}15`,
          }}>
            {combatant.name[0]}
          </div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(8,10,8,0.85) 100%)',
          pointerEvents: 'none',
        }} />

        {dead && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', fontSize: 22, color: 'var(--danger)',
          }}>✕</div>
        )}

        <div style={{
          position: 'absolute', bottom: 6, left: 8, right: 8,
          fontFamily: combatant.type === 'enemy' ? 'var(--font-body)' : 'var(--font-display)',
          fontSize: 11, color: 'var(--text-primary)',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {combatant.name}
        </div>
      </div>

      {/* HP bar */}
      <div style={{ height: 3, background: 'var(--bg-raised)', borderRadius: '0 0 4px 4px', overflow: 'hidden', marginTop: 1 }}>
        <div style={{
          height: '100%',
          width: `${hpPct}%`,
          background: HP_COLOUR(hpPct, combatant.curHp),
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* HP number */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
        textAlign: 'center', marginTop: 3,
      }}>
        {combatant.type === 'player' ? `${combatant.curHp} / ${combatant.maxHp} hp` : dead ? '— defeated —' : ''}
      </div>
    </div>
  )
}

// ActivePortrait replaced by FocusedCard (imported above)

export default function DmCombatCarousel({ feed, logOpen }) {
  const combatants          = useCombatStore(s => s.combatants)
  const activeCombatantIndex = useCombatStore(s => s.activeCombatantIndex)

  const containerRef = useRef(null)
  const [containerW, setContainerW] = useState(900)

  // Track container width for centring calculation
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  if (!combatants?.length) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11,
    }}>
      No combatants yet
    </div>
  )

  const activeIdx       = activeCombatantIndex ?? 0
  const activeCombatant = combatants[activeIdx]
  const players         = combatants.filter(c => c.type === 'player')
  const total           = combatants.length

  // Calculate translateX so the active tile is centred in the container.
  // All tiles before the active one have INACTIVE_W width; the active tile has ACTIVE_W.
  const offsetBefore = activeIdx * (INACTIVE_W + GAP)
  const translateX   = Math.round(containerW / 2 - offsetBefore - ACTIVE_W / 2)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ── Carousel area ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '20px 0',
        }}
      >
        {/* Gradient fade masks on left/right edges */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to right, var(--bg-deep), transparent)',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to left, var(--bg-deep), transparent)',
        }} />

        {/* Sliding track */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: GAP,
          transform: `translateX(${translateX}px)`,
          transition: 'transform 380ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
          flexShrink: 0,
        }}>
          {combatants.map((combatant, i) => {
            const distance = Math.abs(i - activeIdx)
            const isActive = i === activeIdx

            if (isActive) {
              return (
                <div
                  key={combatant.id}
                  style={{
                    width: ACTIVE_W,
                    flexShrink: 0,
                    animation: 'card-appear 0.28s ease forwards',
                  }}
                >
                  <FocusedCard combatant={combatant} players={players} />
                </div>
              )
            }

            return (
              <InactiveTile
                key={combatant.id}
                combatant={combatant}
                distance={distance}
              />
            )
          })}
        </div>
      </div>

      {/* ── Combat log sidebar ── */}
      {logOpen && (
        <div style={{
          width: 220, borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            padding: '10px 12px 6px', borderBottom: '1px solid var(--border)',
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
