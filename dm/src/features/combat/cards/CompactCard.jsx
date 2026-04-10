import React from 'react'
import VitalBar from './subcomponents/VitalBar.jsx'
import ConditionChips from './subcomponents/ConditionChips.jsx'
import ActionEconomyTrack from './subcomponents/ActionEconomyTrack.jsx'
import QuickAdjustPanel from './subcomponents/QuickAdjustPanel.jsx'
import ActionsList from './subcomponents/ActionsList.jsx'
import { useCombatStore } from '../../../stores/combatStore.js'
import { isDead, isBloodied, kindColourRaw, typeLine } from './constants.js'

/**
 * CompactCard
 *
 * The redesigned DM grid card. Used in CombatPanel's two-column grid.
 *
 * Layout:
 *   [Portrait 72px] | [Identity + HP + AC + Economy + Conditions + Controls]
 *
 * Visual states driven by CSS classes:
 *   .ccard--active / .ccard--bloodied / .ccard--dead / .ccard--concentrating / .ccard--boss / .ccard--elite
 */
export default function CompactCard({ combatant, isActive, flashActive = false, players = [] }) {
  const setInitiative = useCombatStore(s => s.setInitiative)

  const dead     = isDead(combatant)
  const bloodied = isBloodied(combatant)
  const isPC     = combatant.type === 'player'
  const isEnemy  = combatant.type === 'enemy'
  const kind     = combatant.kind || (isPC ? 'pc' : 'enemy')
  const accent   = kindColourRaw(combatant)
  const subtitle = typeLine(combatant)

  const portrait = combatant.image
    ? (isEnemy
      ? combatant.image
      : `https://emilrpohl-commits.github.io/greenhunger-players/characters/${combatant.image}`)
    : null

  const cardClasses = [
    'ccard',
    isActive   ? 'ccard--active'        : '',
    bloodied   ? 'ccard--bloodied'      : '',
    dead       ? 'ccard--dead'          : '',
    combatant.concentration && !isActive ? 'ccard--concentrating' : '',
    kind === 'boss'  ? 'ccard--boss'    : '',
    kind === 'elite' ? 'ccard--elite'   : '',
  ].filter(Boolean).join(' ')

  const topBorderColour = isActive
    ? 'var(--active-border)'
    : kind === 'boss'  ? 'var(--boss-border)'
    : kind === 'elite' ? 'var(--elite-border)'
    : dead             ? 'var(--danger)'
    : isPC             ? 'var(--green-dim)'
    : 'var(--rot-mid)'

  return (
    <div
      className={cardClasses}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isActive ? 'var(--green-dim)' : 'var(--border)'}`,
        borderTop: `3px solid ${topBorderColour}`,
        boxShadow: flashActive ? '0 0 0 2px rgba(122,184,106,0.4), 0 0 24px rgba(122,184,106,0.3)' : 'none',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* ── Portrait strip ── */}
        <div style={{
          width: 72, flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: isPC ? 'rgba(32,64,24,0.3)' : 'rgba(80,32,12,0.25)',
          minHeight: 90,
        }}>
          {portrait ? (
            <img
              src={portrait}
              alt={combatant.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', minHeight: 90,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 24, color: accent,
            }}>
              {combatant.name[0]}
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, transparent 55%, rgba(10,12,10,0.65) 100%)',
            pointerEvents: 'none',
          }} />
          {/* Active turn glow */}
          {isActive && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to right, ${accent}15, transparent)`,
              pointerEvents: 'none',
            }} />
          )}
          {/* Initiative badge */}
          <div style={{
            position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center',
          }}>
            <input
              type="number"
              value={combatant.initiative ?? ''}
              onChange={e => setInitiative(combatant.id, e.target.value)}
              title="Initiative"
              style={{
                width: 34, height: 20, textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                background: isActive ? `${accent}25` : 'rgba(0,0,0,0.5)',
                border: `1px solid ${isActive ? accent + '80' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 'var(--radius)', color: isActive ? accent : 'var(--text-muted)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, padding: '9px 12px 8px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>

          {/* Row 1: Name + turn badge + (dead strike) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{
                fontFamily: isPC ? 'var(--font-display)' : 'var(--font-body)',
                fontSize: isPC ? 13 : 14,
                fontWeight: isPC ? 600 : 400,
                color: dead ? 'var(--text-muted)' : isPC ? 'var(--text-primary)' : `${accent}`,
                textDecoration: dead ? 'line-through' : 'none',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {combatant.name}
              </span>
              {isActive && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px',
                  background: 'rgba(122,184,106,0.15)',
                  border: '1px solid rgba(122,184,106,0.35)',
                  borderRadius: 'var(--radius)', color: 'var(--green-bright)',
                  textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0,
                }}>▶ Active</span>
              )}
              {kind === 'boss' && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(196,160,64,0.15)', border: '1px solid rgba(196,160,64,0.4)', borderRadius: 'var(--radius)', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Boss</span>
              )}
              {kind === 'elite' && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(196,112,64,0.15)', border: '1px solid rgba(196,112,64,0.4)', borderRadius: 'var(--radius)', color: 'var(--rot-bright)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Elite</span>
              )}
            </div>
          </div>

          {/* Row 1b: subtitle */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: -3 }}>
            {subtitle}
          </div>

          {/* Row 2: HP + AC + speed */}
          <VitalBar
            curHp={combatant.curHp}
            maxHp={combatant.maxHp}
            tempHp={combatant.tempHp}
            ac={combatant.ac}
            speed={combatant.speed || combatant.stats?.speed}
            combatant={combatant}
          />

          {/* Row 3: Action economy + conditions */}
          {!dead && (
            <>
              <ActionEconomyTrack
                combatant={combatant}
                showLegendary={kind === 'boss' || kind === 'elite'}
              />

              {/* Visible condition chips */}
              <ConditionChips combatant={combatant} />
            </>
          )}
        </div>
      </div>

      {/* ── Controls section ── */}
      {!dead && (
        <div style={{
          padding: '8px 12px 10px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.08)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <QuickAdjustPanel combatant={combatant} />
          <ActionsList combatant={combatant} players={players} />
        </div>
      )}
    </div>
  )
}
