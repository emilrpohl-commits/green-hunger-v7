import React, { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import CombatFeed from './CombatFeed'
import SpellCard from './SpellCard'
import { parseCastingTimeMeta, ensureActionEconomy, getAcWithEffects } from '@shared/lib/combatRules.js'

/**
 * CombatCarousel
 *
 * Portrait-first vertical initiative tracker for the players app.
 * The active combatant is large and centred. Others are stacked above/below,
 * smaller and dimmed. Turn changes animate with a vertical slide.
 *
 * Interaction is gated by role: players can only interact with their own tile
 * when it is their turn. The DM-style view (loggedInAs = null or 'party') shows
 * all combatants but no interactive controls.
 */

function hpColour(curHp, hpPct) {
  if (curHp === 0) return 'var(--danger)'
  if (hpPct > 60) return 'var(--green-bright)'
  if (hpPct > 30) return 'var(--warning)'
  return '#c46040'
}

/** Small portrait tile for non-active combatants */
function InactiveTile({ combatant, distance }) {
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const sheet = combatant.type === 'player' ? playerCharacters[combatant.id] : null
  const colour = sheet?.colour || '#6aaa5a'
  const hpPct = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const dead = combatant.curHp === 0 && combatant.type === 'enemy'

  const blur = Math.min(distance * 0.5, 1.5)
  const scale = Math.max(0.72, 0.88 - distance * 0.05)
  const opacity = Math.max(0.25, 0.55 - distance * 0.12)

  const portraitSrc = combatant.type === 'player'
    ? `characters/${combatant.image}`
    : combatant.image

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      transform: `scale(${scale})`,
      opacity,
      filter: `blur(${blur}px) ${dead ? 'grayscale(0.8)' : 'grayscale(0.25)'}`,
      transition: 'all var(--carousel-slide-duration) cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: 'none',
      padding: '4px 0',
    }}>
      {/* Portrait thumb */}
      <div style={{
        width: 68,
        height: 68,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        border: `2px solid ${colour}40`,
        position: 'relative',
      }}>
        {portraitSrc ? (
          <img
            src={portraitSrc}
            alt={combatant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `${colour}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 22, color: colour,
          }}>
            {combatant.name[0]}
          </div>
        )}
        {dead && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>✕</div>
        )}
      </div>

      {/* Name + HP */}
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          letterSpacing: '0.03em',
        }}>
          {combatant.name}
        </div>
        <div style={{
          marginTop: 4,
          width: 80,
          height: 3,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
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

/** Large portrait tile for the active (centred) combatant */
function ActiveTile({ combatant, isOwnTurn, charColour, onAction, loggedInAs, ilyaAssignedTo }) {
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const tryUseCombatActionType = usePlayerStore(s => s.tryUseCombatActionType)
  const getCombatantActionEconomy = usePlayerStore(s => s.getCombatantActionEconomy)

  const sheet = combatant.type === 'player' ? playerCharacters[combatant.id] : null
  const colour = charColour || sheet?.colour || '#6aaa5a'
  const hpPct = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const colour_hp = hpColour(combatant.curHp, hpPct)

  const isPlayerCombatant = combatant.type === 'player'
  const portraitSrc = isPlayerCombatant
    ? `characters/${combatant.image}`
    : combatant.image

  const economy = ensureActionEconomy(getCombatantActionEconomy(combatant.id))
  const conditions = combatant.conditions || []
  const effects = combatant.effects || []

  return (
    <div
      className="portrait-appear"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {/* Portrait image */}
      <div style={{
        width: '100%',
        height: 260,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        border: `2px solid ${colour}80`,
        boxShadow: `0 0 40px ${colour}40, 0 8px 32px rgba(0,0,0,0.6)`,
        transition: 'box-shadow 350ms ease',
      }}>
        {portraitSrc ? (
          <img
            src={portraitSrc}
            alt={combatant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `${colour}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 52, color: colour,
          }}>
            {combatant.name[0]}
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(8,10,8,0.90) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Char colour halo at base */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: `linear-gradient(to top, ${colour}25, transparent)`,
          pointerEvents: 'none',
        }} />

        {/* Turn indicator */}
        {isOwnTurn && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '4px 12px',
            background: `${colour}25`,
            border: `1px solid ${colour}80`,
            borderRadius: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: colour,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            ▶ Your Turn
          </div>
        )}

        {/* HP overlay (bottom-right) */}
        <div style={{
          position: 'absolute', bottom: 12, right: 14, textAlign: 'right',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 32,
            fontWeight: 700,
            color: colour_hp,
            lineHeight: 1,
            textShadow: `0 2px 8px ${colour_hp}80`,
          }}>
            {combatant.curHp}
            {(combatant.tempHp ?? 0) > 0 && (
              <span style={{ fontSize: 16, color: 'var(--info)' }}>+{combatant.tempHp}</span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
            / {combatant.maxHp} hp
          </div>
        </div>

        {/* Name + identity (bottom-left) */}
        <div style={{
          position: 'absolute', bottom: 12, left: 14,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--text-primary)',
            letterSpacing: '0.04em',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}>
            {combatant.name}
          </div>
          {combatant.concentration && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'var(--warning)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: 2,
            }}>
              ◈ Concentrating
            </div>
          )}
        </div>
      </div>

      {/* HP bar */}
      <div className="hp-bar-track" style={{ borderRadius: '0 0 4px 4px' }}>
        <div className="hp-bar-fill" style={{ width: `${hpPct}%`, background: colour_hp }} />
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 2px',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'AC', value: getAcWithEffects(combatant) ?? combatant.ac ?? '—' },
          { label: 'Init', value: combatant.initiative ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '4px 10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 1 }}>{label}</div>
          </div>
        ))}

        {/* Conditions chips (abbreviated) */}
        {conditions.slice(0, 3).map(c => (
          <div key={c} style={{
            padding: '4px 8px',
            background: 'rgba(180,60,60,0.12)',
            border: '1px solid rgba(180,60,60,0.35)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#c46060',
            textTransform: 'uppercase',
          }}>
            {c}
          </div>
        ))}
        {conditions.length > 3 && (
          <div style={{
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            alignSelf: 'center',
          }}>
            +{conditions.length - 3} more
          </div>
        )}
      </div>

      {/* Action economy — shown for player's own turn */}
      {isOwnTurn && isPlayerCombatant && (
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '4px 0',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Action', ready: economy.actionAvailable },
            { label: 'Bonus', ready: economy.bonusActionAvailable },
            { label: 'Reaction', ready: economy.reactionAvailable },
          ].map(({ label, ready }) => (
            <span key={label} style={{
              padding: '3px 10px',
              borderRadius: 20,
              border: `1px solid ${ready ? 'var(--green-mid)' : 'var(--border)'}`,
              background: ready ? 'var(--green-dim)' : 'transparent',
              color: ready ? 'var(--green-bright)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
            }}>
              {label} {ready ? '●' : '○'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Main CombatCarousel component.
 * Renders the full-height portrait carousel with the combat feed as a side panel.
 */
export default function CombatCarousel({ loggedInAs }) {
  const combatCombatants = usePlayerStore(s => s.combatCombatants)
  const combatActiveCombatantIndex = usePlayerStore(s => s.combatActiveCombatantIndex)
  const combatRound = usePlayerStore(s => s.combatRound)
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const ilyaAssignedTo = usePlayerStore(s => s.ilyaAssignedTo)

  // Track previous index to determine slide direction
  const prevIndexRef = useRef(combatActiveCombatantIndex)
  const [slideDirection, setSlideDirection] = useState(0)

  useEffect(() => {
    const prev = prevIndexRef.current
    const curr = combatActiveCombatantIndex
    if (prev !== curr) {
      setSlideDirection(curr > prev ? 1 : -1)
      prevIndexRef.current = curr
      const t = setTimeout(() => setSlideDirection(0), 400)
      return () => clearTimeout(t)
    }
  }, [combatActiveCombatantIndex])

  if (!combatCombatants?.length) return null

  const totalCount = combatCombatants.length
  const activeIdx = combatActiveCombatantIndex ?? 0
  const activeCombatant = combatCombatants[activeIdx]

  // Determine which characters the logged-in player controls
  const controlledIds = new Set()
  if (loggedInAs && loggedInAs !== 'party') {
    controlledIds.add(loggedInAs)
    if (ilyaAssignedTo === loggedInAs) controlledIds.add('ilya')
  }

  const isOwnTurn = controlledIds.has(activeCombatant?.id)

  const sheet = activeCombatant?.type === 'player'
    ? playerCharacters[activeCombatant.id]
    : null
  const charColour = sheet?.colour || '#6aaa5a'

  // Build ordered list: combatants sorted by initiative position with active centred
  // Show up to 2 above and 2 below
  const VISIBLE_ABOVE = 2
  const VISIBLE_BELOW = 2

  const above = []
  for (let d = VISIBLE_ABOVE; d >= 1; d--) {
    const idx = (activeIdx - d + totalCount) % totalCount
    above.push({ combatant: combatCombatants[idx], distance: d })
  }

  const below = []
  for (let d = 1; d <= VISIBLE_BELOW; d++) {
    const idx = (activeIdx + d) % totalCount
    below.push({ combatant: combatCombatants[idx], distance: d })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      padding: '0 0 60px',
    }}>
      {/* Round indicator */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          Round {combatRound ?? 1}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: isOwnTurn ? charColour : 'var(--text-muted)',
          letterSpacing: '0.06em',
        }}>
          {isOwnTurn ? '▶ Your Turn' : `${activeCombatant?.name}'s Turn`}
        </span>
      </div>

      {/* Carousel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 20px',
        gap: 8,
      }}>

        {/* Above combatants (closest last = just above active) */}
        {above.map(({ combatant, distance }) => (
          <div key={combatant.id} style={{ width: '100%', maxWidth: 420 }}>
            <InactiveTile combatant={combatant} distance={distance} />
          </div>
        ))}

        {/* Divider above active */}
        <div style={{
          width: '100%',
          maxWidth: 420,
          height: 1,
          background: `linear-gradient(to right, transparent, ${charColour}50, transparent)`,
          margin: '4px 0',
          transition: 'background 350ms ease',
        }} />

        {/* Active (centred, large) */}
        {activeCombatant && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            <ActiveTile
              combatant={activeCombatant}
              isOwnTurn={isOwnTurn}
              charColour={charColour}
              loggedInAs={loggedInAs}
              ilyaAssignedTo={ilyaAssignedTo}
            />
          </div>
        )}

        {/* Divider below active */}
        <div style={{
          width: '100%',
          maxWidth: 420,
          height: 1,
          background: `linear-gradient(to right, transparent, ${charColour}50, transparent)`,
          margin: '4px 0',
          transition: 'background 350ms ease',
        }} />

        {/* Below combatants */}
        {below.map(({ combatant, distance }) => (
          <div key={combatant.id} style={{ width: '100%', maxWidth: 420 }}>
            <InactiveTile combatant={combatant} distance={distance} />
          </div>
        ))}
      </div>

      {/* Combat Feed (side panel equivalent — appears below carousel on mobile) */}
      <div style={{
        padding: '0 16px 16px',
        maxWidth: 680,
        width: '100%',
        margin: '0 auto',
      }}>
        <CombatFeed />
      </div>
    </div>
  )
}
