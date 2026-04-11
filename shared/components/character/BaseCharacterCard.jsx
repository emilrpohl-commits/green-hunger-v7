import React from 'react'
import CharacterPortrait from './CharacterPortrait.jsx'
import HPControl from './HPControl.jsx'
import { ResourceStrip } from './ResourcePips.jsx'
import CharacterConditionChips from './CharacterConditionChips.jsx'

/**
 * Shared layout: portrait left, vitals + interaction + resources + conditions.
 */
export default function BaseCharacterCard({
  char = {},
  tagLabel = null,
  portraitSize = 'md',
  vitalsSlot = null,
  showHpBar = true,
  hpPct = null,
  hpColour = 'var(--green-bright)',
  curHp,
  maxHp,
  tempHp = 0,
  ac = null,
  speed = null,
  hpControlProps = null,
  resourceStripProps = null,
  conditions = [],
  onRemoveCondition = null,
  conditionsReadOnly = false,
  footer = null,
  children = null,
}) {
  const pct = hpPct != null ? hpPct : (maxHp > 0 ? (curHp / maxHp) * 100 : 0)
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          alignItems: 'flex-start',
        }}
      >
        <CharacterPortrait char={char} size={portraitSize} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.04em',
                }}
              >
                {char.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {char.species} {char.class} {char.level}
                {tagLabel && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      textTransform: 'uppercase',
                      color: 'var(--green-bright)',
                    }}
                  >
                    {tagLabel}
                  </span>
                )}
              </div>
            </div>
            {ac != null && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-secondary)',
                }}
              >
                AC {ac}
              </div>
            )}
          </div>
          {speed != null && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
              Speed {speed}′
            </div>
          )}
          {vitalsSlot}
        </div>
      </div>

      {showHpBar && maxHp > 0 && (
        <div style={{ padding: '0 14px', marginTop: 8 }}>
          <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: hpColour,
                borderRadius: 3,
                transition: 'width 0.35s ease, background 0.35s ease',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ padding: '12px 14px 14px' }}>
        {hpControlProps && (
          <div style={{ marginBottom: 12 }}>
            <HPControl
              curHp={curHp}
              maxHp={maxHp}
              tempHp={tempHp}
              accentColour={char.colour || 'var(--green-mid)'}
              {...hpControlProps}
            />
          </div>
        )}
        {resourceStripProps && <ResourceStrip {...resourceStripProps} />}
        {conditions?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <CharacterConditionChips
              conditions={conditions}
              onRemove={onRemoveCondition}
              readOnly={conditionsReadOnly}
            />
          </div>
        )}
        {children}
        {footer}
      </div>
    </div>
  )
}
