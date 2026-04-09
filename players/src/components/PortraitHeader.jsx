import React from 'react'

/**
 * PortraitHeader
 *
 * The visual anchor of every character view. Displays the portrait as a full-bleed
 * hero image with identity text and live HP overlaid at the bottom, followed by a
 * thin HP bar and a badges row (AC, Speed, concentration).
 *
 * All data is passed as props — no store access here.
 */
export default function PortraitHeader({
  char,
  curHp,
  tempHp,
  concentration,
  myCombatant,
  combatActive,
  charColour,
  ilyaAssignedTo,
  loggedInAs,
}) {
  const maxHp = char.stats.maxHp
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (curHp / maxHp) * 100)) : 0
  const hpColour =
    curHp === 0
      ? 'var(--danger)'
      : hpPct > 60
      ? 'var(--green-bright)'
      : hpPct > 30
      ? 'var(--warning)'
      : '#c46040'

  const acValue = combatActive && myCombatant
    ? (myCombatant.effectiveAc ?? myCombatant.ac ?? char.stats.ac)
    : char.stats.ac

  const isIlyaPlayer = char.id === 'ilya' && ilyaAssignedTo === loggedInAs
  const playerLabel = isIlyaPlayer ? `Companion · ${loggedInAs}` : null

  return (
    <div>
      {/* ── Portrait image frame ── */}
      <div
        className={concentration ? 'portrait-concentrating' : ''}
        style={{
          width: '100%',
          height: 'var(--portrait-height)',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `3px solid ${charColour}`,
        }}
      >
        <img
          src={`characters/${char.image}`}
          alt={char.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
          onError={e => { e.target.style.display = 'none' }}
        />

        {/* Bottom fade gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 35%, rgba(8,10,8,0.92) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Subtle vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(8,10,8,0.45) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Character glow (char colour soft halo at bottom) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: `linear-gradient(to top, ${charColour}18, transparent)`,
          pointerEvents: 'none',
        }} />

        {/* Identity + HP overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}>
          {/* Left: identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {playerLabel && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: charColour,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 4,
                opacity: 0.85,
              }}>
                {playerLabel}
              </div>
            )}
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {char.name}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 3,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              {char.species} · {char.class} {char.level}
              {char.subclass ? ` · ${char.subclass}` : ''}
            </div>
            {char.background && (
              <div style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                marginTop: 2,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>
                {char.background}
              </div>
            )}
          </div>

          {/* Right: HP */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 38,
              color: hpColour,
              lineHeight: 1,
              fontWeight: 700,
              textShadow: `0 2px 12px ${hpColour}80`,
            }}>
              {curHp}
              {tempHp > 0 && (
                <span style={{ fontSize: 18, color: 'var(--info)', fontWeight: 500 }}>
                  +{tempHp}
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}>
              / {maxHp} hp
            </div>
            {concentration && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--warning)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginTop: 5,
              }}>
                ◈ Concentrating
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── HP bar ── */}
      <div className="hp-bar-track">
        <div
          className="hp-bar-fill"
          style={{ width: `${hpPct}%`, background: hpColour }}
        />
      </div>

      {/* ── Badges row ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 16px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <StatBadge label="AC" value={acValue} colour={charColour} />
        <StatBadge label="Speed" value={`${char.stats.speed}′`} colour={charColour} />
        <StatBadge label="Init" value={char.stats.initiative} colour={charColour} />
        <StatBadge label="Prof" value={char.stats.proficiencyBonus} colour={charColour} />
        {char.stats.spellSaveDC && (
          <StatBadge label="Save DC" value={char.stats.spellSaveDC} colour={charColour} />
        )}
        {concentration && (
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(176, 144, 48, 0.12)',
            border: '1px solid rgba(176, 144, 48, 0.40)',
            animation: 'glow-pulse 2s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 12 }}>◈</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--warning)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Concentration
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBadge({ label, value, colour }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '5px 10px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      minWidth: 46,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 15,
        color: 'var(--text-primary)',
        fontWeight: 500,
        lineHeight: 1.2,
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: 2,
      }}>
        {label}
      </span>
    </div>
  )
}
