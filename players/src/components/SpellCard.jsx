import React, { useState } from 'react'

/**
 * Determine the display category for a spell based on its mechanic and whether
 * it has damage. This drives the CSS class and outcome line rendering.
 *
 * attack   → roll to hit + damage
 * save-dmg → save + damage on fail
 * control  → save but no damage (pure control/debuff)
 * heal     → restoration
 * auto     → missiles / forced damage
 * utility  → no roll, no damage (buffs, summons, exploration)
 */
function getSpellCategory(spell) {
  if (spell.mechanic === 'attack') return 'attack'
  if (spell.mechanic === 'auto')   return 'auto'
  if (spell.mechanic === 'heal')   return 'heal'
  if (spell.mechanic === 'save') {
    return spell.damage ? 'save-dmg' : 'control'
  }
  return 'utility'
}

const CATEGORY_CSS = {
  'attack':   'spell-card--attack',
  'save-dmg': 'spell-card--save',
  'control':  'spell-card--control',
  'heal':     'spell-card--heal',
  'auto':     'spell-card--attack',
  'utility':  'spell-card--utility',
}

const CATEGORY_LABEL = {
  'attack':   'Attack',
  'save-dmg': 'Save + Dmg',
  'control':  'Control',
  'heal':     'Heal',
  'auto':     'Auto-hit',
  'utility':  'Utility',
}

const CATEGORY_COLOUR = {
  'attack':   'var(--spell-attack-border)',
  'save-dmg': 'var(--spell-save-border)',
  'control':  'var(--spell-control-border)',
  'heal':     'var(--spell-heal-border)',
  'auto':     'var(--spell-attack-border)',
  'utility':  'var(--spell-utility-border)',
}

function ActionTimeBadge({ spell }) {
  const actionType = spell.actionType || 'action'
  const label =
    actionType === 'bonus_action' ? 'Bonus' :
    actionType === 'reaction'     ? 'React' :
    spell.castingTime === '1 minute' || spell.castingTime === '10 minutes' ? spell.castingTime :
    'Action'
  const colour =
    actionType === 'bonus_action' ? 'var(--warning)' :
    actionType === 'reaction'     ? '#a6b5ff' :
    'var(--text-muted)'
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 8,
      color: colour,
      border: `1px solid ${colour}60`,
      borderRadius: 3,
      padding: '1px 5px',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}>
      {label}
    </span>
  )
}

function OutcomeLine({ spell, category }) {
  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: CATEGORY_COLOUR[category],
    lineHeight: 1.4,
  }

  if (category === 'attack') {
    const dmg = spell.damage
    return (
      <span style={style}>
        +{spell.toHit ?? '?'} to hit
        {dmg ? ` · ${dmg.count}d${dmg.sides}${dmg.mod ? `+${dmg.mod}` : ''} ${dmg.type}` : ''}
      </span>
    )
  }

  if (category === 'auto') {
    const dmg = spell.damage
    const missiles = spell.missiles ?? 1
    return (
      <span style={style}>
        {missiles} missile{missiles !== 1 ? 's' : ''}
        {dmg ? ` · ${dmg.count}d${dmg.sides}+${dmg.mod ?? 0} ${dmg.type} each` : ''}
      </span>
    )
  }

  if (category === 'save-dmg') {
    const dmg = spell.damage
    return (
      <span style={style}>
        {spell.saveType ?? 'Save'} DC {spell.saveDC ?? '?'}
        {dmg ? ` · ${dmg.count}d${dmg.sides} ${dmg.type}` : ''}
      </span>
    )
  }

  if (category === 'control') {
    return (
      <span style={style}>
        {spell.saveType ?? 'Save'} DC {spell.saveDC ?? '?'} · no damage
      </span>
    )
  }

  if (category === 'heal') {
    const hd = spell.healDice
    return (
      <span style={style}>
        {hd ? `${hd.count}d${hd.sides}+${hd.mod ?? 0} HP` : 'Restore HP'}
      </span>
    )
  }

  // utility
  return (
    <span style={{ ...style, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {spell.castingTime ?? 'Special effect'}
    </span>
  )
}

/**
 * SpellCard
 *
 * Displays a single spell as a styled card. The visual variant (border tint,
 * badge colour, outcome line) is driven entirely by `spell.mechanic` + presence
 * of damage — no rules decisions are made here.
 *
 * Props:
 *   spell       - resolved spell object (after resolveSpellForCasting)
 *   isActive    - whether this spell's casting panel is currently open
 *   isExhausted - true when no slots remain for this level
 *   onCast      - () => void — open the casting panel
 *   onCancel    - () => void — close the casting panel
 *   charColour  - character accent colour
 */
export default function SpellCard({
  spell,
  isActive,
  isExhausted,
  onCast,
  onCancel,
  charColour,
}) {
  const [descExpanded, setDescExpanded] = useState(false)
  const category = getSpellCategory(spell)
  const cssClass = CATEGORY_CSS[category]

  return (
    <div
      className={`spell-card ${cssClass}`}
      style={{
        opacity: isExhausted ? 0.45 : 1,
        outline: isActive ? `1px solid ${charColour}80` : 'none',
        outlineOffset: 1,
      }}
    >
      {/* ── Main row ── */}
      <div style={{
        padding: '10px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        {/* Left: identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '0.01em',
            }}>
              {spell.name}
            </span>

            {/* Category badge */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: CATEGORY_COLOUR[category],
              border: `1px solid ${CATEGORY_COLOUR[category]}60`,
              borderRadius: 3,
              padding: '1px 5px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {CATEGORY_LABEL[category]}
            </span>

            {spell.concentration && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: 'var(--warning)',
                border: '1px solid rgba(176,144,48,0.40)',
                borderRadius: 3,
                padding: '1px 5px',
                letterSpacing: '0.06em',
              }}>
                ◈ CONC
              </span>
            )}

            {spell.limitedUse && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                padding: '1px 5px',
              }}>
                {spell.limitedUse}
              </span>
            )}
          </div>

          {/* Outcome line */}
          <OutcomeLine spell={spell} category={category} />

          {/* Meta line: action type + range */}
          <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <ActionTimeBadge spell={spell} />
            {spell.range && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-muted)',
              }}>
                {spell.range}
              </span>
            )}
            {spell.aoe && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-muted)',
              }}>
                {spell.aoe}
              </span>
            )}
          </div>
        </div>

        {/* Right: cast / cancel button */}
        <button
          onClick={() => isActive ? onCancel() : onCast()}
          style={{
            padding: '6px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            background: isActive ? `${charColour}30` : 'transparent',
            border: `1px solid ${isActive ? charColour : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            color: isActive ? charColour : 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {isActive ? 'Cancel' : 'Cast'}
        </button>
      </div>

      {/* ── Description (expandable) ── */}
      {spell.description && (
        <>
          <button
            onClick={() => setDescExpanded(e => !e)}
            style={{
              display: 'block',
              width: '100%',
              padding: '4px 12px',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {descExpanded ? '▲ Hide' : '▼ Description'}
          </button>
          {descExpanded && (
            <div style={{
              padding: '8px 12px 10px',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              fontStyle: 'italic',
              borderTop: '1px solid var(--border)',
            }}>
              {spell.description}
            </div>
          )}
        </>
      )}
    </div>
  )
}
