import React, { useState } from 'react'

/**
 * Condition metadata — icons and short descriptions for the most common 5e conditions.
 * No rules logic lives here; this is purely display.
 */
const CONDITION_META = {
  blinded:      { icon: '👁', colour: '#808080', desc: 'Attack rolls against you have advantage. Your attack rolls have disadvantage.' },
  charmed:      { icon: '💫', colour: '#ff80a0', desc: 'Cannot attack the charmer. Charmer has advantage on social checks against you.' },
  deafened:     { icon: '🔇', colour: '#888888', desc: 'Cannot hear. Automatically fail checks requiring hearing.' },
  exhaustion:   { icon: '💀', colour: '#a06040', desc: 'Disadvantage on ability checks. Speed halved at level 2+.' },
  frightened:   { icon: '😨', colour: '#c0a030', desc: 'Disadvantage on checks and attacks while source is visible. Cannot move toward source.' },
  grappled:     { icon: '🤜', colour: '#c08040', desc: 'Speed is 0. Ends if grappler is incapacitated or you are moved away.' },
  incapacitated:{ icon: '✕',  colour: '#b03030', desc: 'Cannot take actions or reactions.' },
  invisible:    { icon: '◌',  colour: '#80c0c0', desc: 'Cannot be seen without special sense. Attacks against you have disadvantage.' },
  paralysed:    { icon: '⚡', colour: '#c0a000', desc: 'Incapacitated, cannot move or speak. Attacks against you have advantage. Hits within 5 ft are critical.' },
  petrified:    { icon: '🪨', colour: '#808060', desc: 'Transformed to stone, incapacitated, restrained, immune to poison and disease.' },
  poisoned:     { icon: '☠', colour: '#50a040', desc: 'Disadvantage on attack rolls and ability checks.' },
  prone:        { icon: '↓',  colour: '#a06020', desc: 'Melee attacks have advantage vs you. Ranged attacks have disadvantage vs you. Costs half move to stand.' },
  restrained:   { icon: '⛓', colour: '#b06020', desc: 'Speed 0. Attack rolls have disadvantage. Attacks against you have advantage. DEX saves at disadvantage.' },
  stunned:      { icon: '✵',  colour: '#c0a040', desc: 'Incapacitated. Fail STR and DEX saves. Attacks against you have advantage.' },
  unconscious:  { icon: '💤', colour: '#6060a0', desc: 'Incapacitated, cannot move or speak, drop held items, fall prone, fail STR/DEX saves, attacks have advantage and are crits within 5 ft.' },
}

function getConditionMeta(name) {
  const key = name.toLowerCase().replace(/[^a-z]/g, '')
  return CONDITION_META[key] || { icon: '●', colour: '#7a8070', desc: name }
}

function EffectDot({ colour }) {
  return (
    <div style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: colour,
      flexShrink: 0,
      boxShadow: `0 0 4px ${colour}80`,
    }} />
  )
}

function Chip({ label, icon, colour, description, concentration }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        className="condition-chip"
        onClick={() => setExpanded(e => !e)}
        style={{
          background: `${colour}18`,
          borderColor: `${colour}50`,
          color: colour,
        }}
      >
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span>{label}</span>
        {concentration && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--warning)',
            marginLeft: 2,
            opacity: 0.8,
          }}>◈</span>
        )}
      </button>
      {expanded && description && (
        <div style={{
          marginTop: 4,
          padding: '6px 10px',
          background: 'var(--bg-raised)',
          border: `1px solid ${colour}40`,
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          maxWidth: 280,
        }}>
          {description}
        </div>
      )}
    </div>
  )
}

/**
 * ConditionsBar
 *
 * Displays active conditions, spell effects, and buffs as an icon-led chip strip.
 * Each chip is clickable to expand a short description.
 * Returns null when there is nothing to show.
 */
export default function ConditionsBar({ conditions, effects, myBuffs, concentration }) {
  const hasAnything =
    (conditions?.length > 0) ||
    (effects?.length > 0) ||
    concentration ||
    (myBuffs?.length > 0)

  if (!hasAnything) return null

  return (
    <div className="conditions-bar" style={{ margin: '0 0 12px' }}>
      {/* Conditions (from combatant state) */}
      {conditions?.map(cond => {
        const meta = getConditionMeta(cond)
        return (
          <Chip
            key={cond}
            label={cond}
            icon={meta.icon}
            colour={meta.colour}
            description={meta.desc}
          />
        )
      })}

      {/* Active spell effects (applied by DM or store) */}
      {effects?.map((eff, i) => (
        <Chip
          key={eff.name + i}
          label={eff.name}
          icon={<EffectDot colour={eff.colour || '#9070a0'} />}
          colour={eff.colour || '#9070a0'}
          description={eff.mechanic || ''}
          concentration={eff.concentration}
        />
      ))}

      {/* Active buffs (bardic inspiration, bless, etc.) */}
      {myBuffs?.map((buff, i) => {
        const label = buff.type === 'bardic' ? 'Bardic Inspiration' : buff.type
        return (
          <Chip
            key={buff.type + i}
            label={label}
            icon="✨"
            colour="#b090c0"
            description={
              buff.type === 'bardic'
                ? '+1d6 to one ability check, attack roll, or saving throw.'
                : (buff.mechanic || '')
            }
          />
        )
      })}
    </div>
  )
}
