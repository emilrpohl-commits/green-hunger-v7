import React from 'react'

const POSITIVE = new Set(['blessed', 'invisible', 'hasted', 'protected', 'inspired'])
const SPECIAL = new Set(['concentrating', 'concentration', 'charmed', 'dominated'])

function categoryFor(name) {
  const k = String(name || '').toLowerCase().replace(/[^a-z]/g, '')
  if (SPECIAL.has(k)) return 'special'
  if (POSITIVE.has(k)) return 'positive'
  return 'negative'
}

const CAT_BORDER = {
  negative: 'rgba(196,64,64,0.35)',
  positive: 'rgba(122,184,106,0.35)',
  special: 'rgba(196,160,64,0.4)',
}

const CAT_BG = {
  negative: 'rgba(196,64,64,0.1)',
  positive: 'rgba(122,184,106,0.1)',
  special: 'rgba(196,160,64,0.12)',
}

/**
 * @param {string[]} conditions
 * @param {(name: string) => void} [onRemove]
 */
export default function CharacterConditionChips({ conditions = [], onRemove, readOnly = false }) {
  if (!conditions.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {conditions.map((name) => {
        const cat = categoryFor(name)
        return (
          <button
            key={name}
            type="button"
            disabled={readOnly || !onRemove}
            onClick={() => onRemove?.(name)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${CAT_BORDER[cat]}`,
              background: CAT_BG[cat],
              color: 'var(--text-secondary)',
              cursor: readOnly || !onRemove ? 'default' : 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {name}
            {!readOnly && onRemove && <span style={{ marginLeft: 6, opacity: 0.7 }}>×</span>}
          </button>
        )
      })}
    </div>
  )
}
