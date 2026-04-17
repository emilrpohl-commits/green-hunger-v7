import React from 'react'
import { usePlayerStore } from '../stores/playerStore'
import DiceRichText from '@shared/components/combat/DiceRichText.jsx'
import { createPlayerDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

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

function formatSpellComponents(spell) {
  const c = spell.components ?? spell.rules_json?.components
  if (c == null || c === '') return ''
  if (typeof c === 'string') return c
  if (Array.isArray(c)) return c.join(', ')
  if (typeof c === 'object') {
    const parts = []
    if (c.V || c.verbal) parts.push('V')
    if (c.S || c.somatic) parts.push('S')
    const mat = c.M ?? c.material ?? c.material_text ?? spell.material
    if (typeof mat === 'string' && mat.trim()) parts.push(`M (${mat.trim()})`)
    else if (mat === true) parts.push('M')
    return parts.join(', ') || ''
  }
  return String(c)
}

function formatSpellArea(spell) {
  const a = spell.area
  if (a && (a.shape || a.size)) {
    const bits = [a.size, a.shape].filter(Boolean)
    if (bits.length) return bits.join(' ')
  }
  if (spell.aoe) return spell.aoe
  return ''
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
 *   rollerName  - name used on combat feed for inline dice rolls
 */
export default function SpellCard({
  spell,
  isActive,
  isExhausted,
  isReferenceExpanded = false,
  onToggleReference = () => {},
  onCast,
  onCancel,
  charColour,
  rollerName = 'Player',
}) {
  const pushRoll = usePlayerStore(s => s.pushRoll)
  const category = getSpellCategory(spell)
  const cssClass = CATEGORY_CSS[category]
  const handleInlineRoll = createPlayerDiceRollHandler({
    pushRoll,
    rollerName,
    defaultContextLabel: spell.name,
  })

  const compLine = formatSpellComponents(spell)
  const matOnly = spell.material && !String(compLine).includes(String(spell.material))
  const areaLine = formatSpellArea(spell)
  const higher = spell.higherLevel ?? spell.higher_levels ?? ''
  const descText = spell.description && String(spell.description).trim()
    ? spell.description
    : ''

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
        <button
          type="button"
          className="spell-card__header-hit"
          onClick={() => onToggleReference()}
        >
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
        </button>

        {/* Right: cast / cancel button */}
        <button
          type="button"
          onClick={() => (isActive ? onCancel() : onCast())}
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

      {isReferenceExpanded && (
        <div className="spell-reference-panel">
          <div className="spell-ref-meta">
            {spell.castingTime && <span>{spell.castingTime}</span>}
            {spell.range && <span>{spell.range}</span>}
            {spell.duration && <span>{spell.duration}</span>}
            {spell.concentration && <span className="spell-ref-conc-tag">Concentration</span>}
            {spell.ritual && <span className="spell-ref-ritual-tag">Ritual</span>}
          </div>
          {compLine ? (
            <div className="spell-ref-components">
              {compLine}
              {matOnly ? <span className="spell-ref-material-note">({spell.material})</span> : null}
            </div>
          ) : spell.material ? (
            <div className="spell-ref-components">
              <span className="spell-ref-material-note">({spell.material})</span>
            </div>
          ) : null}
          {areaLine ? (
            <div className="spell-ref-area">{areaLine}</div>
          ) : null}
          {spell.saveType ? (
            <div className="spell-ref-save">{spell.saveType} saving throw</div>
          ) : null}
          <div className="spell-ref-desc">
            {descText ? (
              <DiceRichText
                text={descText}
                contextLabel={spell.name}
                onRoll={handleInlineRoll}
              />
            ) : (
              'No description available.'
            )}
          </div>
          {higher ? (
            <p className="spell-ref-higher">
              <strong>At higher levels:</strong> {higher}
            </p>
          ) : null}
          {!isActive && (
            <button
              type="button"
              className="spell-cast-btn"
              disabled={isExhausted}
              onClick={() => onCast()}
            >
              Cast
            </button>
          )}
        </div>
      )}
    </div>
  )
}
