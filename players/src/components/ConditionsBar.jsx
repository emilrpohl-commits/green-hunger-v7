import React, { useState } from 'react'
import {
  normalizeConditionName,
  CONDITION_COLOUR,
  CONDITION_DESC,
} from '@shared/lib/rules/conditionCatalog.js'
import { lookupGlossaryForCondition } from '@shared/lib/rules/glossaryService.js'

/** Emoji hints keyed by normalized condition index (catalog-aligned). */
const CONDITION_ICONS = {
  blinded: '👁',
  charmed: '💫',
  deafened: '🔇',
  exhaustion: '💀',
  frightened: '😨',
  grappled: '🤜',
  incapacitated: '✕',
  invisible: '◌',
  paralyzed: '⚡',
  petrified: '🪨',
  poisoned: '☠',
  prone: '↓',
  restrained: '⛓',
  stunned: '✵',
  unconscious: '💤',
  silenced: '🔕',
}

/** Map "Exhaustion 2" etc. to catalog key "Exhaustion". */
function catalogKeyForCondition(cond) {
  const n = normalizeConditionName(cond)
  if (/^exhaustion\b/i.test(String(n))) return 'Exhaustion'
  return n
}

function conditionIcon(catalogKey) {
  const idx = String(catalogKey || '')
    .toLowerCase()
    .replace(/\s+/g, '')
  return CONDITION_ICONS[idx] || '●'
}

function conditionDescription(displayName, catalogKey) {
  const short = CONDITION_DESC[catalogKey] || displayName
  const gloss = lookupGlossaryForCondition(catalogKey)
  if (gloss?.definition && gloss.definition.length > (short?.length || 0) + 12) {
    return `${short}\n\n${gloss.definition}`
  }
  return short
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
 * Condition copy uses the shared catalog + rules glossary (no parallel meta map).
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
      {conditions?.map((cond) => {
        const catalogKey = catalogKeyForCondition(cond)
        const colour = CONDITION_COLOUR[catalogKey] || '#7a8070'
        return (
          <Chip
            key={cond}
            label={cond}
            icon={conditionIcon(catalogKey)}
            colour={colour}
            description={conditionDescription(cond, catalogKey)}
          />
        )
      })}

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
