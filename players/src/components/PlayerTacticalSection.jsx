import React, { useState } from 'react'
import {
  HPControl,
  ResourceStrip,
  CharacterConditionChips,
  ActionEconomyTrack,
} from '@shared/components/character/index.js'
import { formatDcWithLabel } from '@shared/lib/rules/dcDisplay.js'

/**
 * Sticky tactical + resource strip for the player sheet.
 */
export default function PlayerTacticalSection({
  char,
  characterId,
  curHp,
  tempHp,
  maxHp,
  ac,
  speed,
  initiativeLabel,
  spellSaveDC,
  spellSlots,
  conditions = [],
  concentration,
  concentrationSpell: concSpellProp = '',
  inspiration = false,
  classResources = [],
  combatActive,
  myTurnActive,
  myEconomy,
  canEdit,
  onHpDelta,
  onTempHp,
  onToggleConcentration,
  onConcentrationSpellBlur,
  onEndConcentration,
  onRemoveCondition,
  onSpellSlotClick,
  onToggleEconomy,
  onShortRest,
  onLongRest,
}) {
  const [concDraft, setConcDraft] = useState(concSpellProp || '')
  React.useEffect(() => {
    setConcDraft(concSpellProp || '')
  }, [concSpellProp, concentration])

  const slotsLine = spellSlots && typeof spellSlots === 'object'
    ? Object.entries(spellSlots)
      .map(([lv, s]) => `${lv}:${(s?.max ?? 0) - (s?.used ?? 0)}/${s?.max ?? 0}`)
      .join(' · ')
    : ''

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-deep)',
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <StatMini label="AC" value={ac} colour={char.colour} />
        <StatMini label="Spd" value={`${speed}′`} colour={char.colour} />
        <StatMini label="Init" value={initiativeLabel} colour={char.colour} />
        {spellSaveDC != null && (
          <StatMini
            label="DC"
            value={spellSaveDC}
            colour={char.colour}
            title={formatDcWithLabel(spellSaveDC) || undefined}
          />
        )}
        {inspiration && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--green-bright)',
            border: '1px solid var(--green-mid)',
            borderRadius: 20,
            padding: '4px 10px',
          }}
          >
            Inspiration
          </span>
        )}
      </div>

      <HPControl
        curHp={curHp}
        maxHp={maxHp}
        tempHp={tempHp}
        readOnly={!canEdit}
        accentColour={char.colour || 'var(--green-mid)'}
        onApplyDelta={canEdit ? onHpDelta : undefined}
        onSetTempHp={canEdit ? onTempHp : undefined}
      />

      {concentration && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(196,160,64,0.45)',
          background: 'rgba(196,160,64,0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)' }}>◈ Concentrating</span>
          <input
            value={concDraft}
            onChange={(e) => setConcDraft(e.target.value)}
            onBlur={() => onConcentrationSpellBlur?.(concDraft)}
            placeholder="Spell name"
            disabled={!canEdit}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '4px 8px',
              fontSize: 12,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
            }}
          />
          {canEdit && (
            <button
              type="button"
              onClick={onEndConcentration}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              End
            </button>
          )}
        </div>
      )}

      {!concentration && canEdit && (
        <button
          type="button"
          onClick={() => onToggleConcentration?.(true)}
          style={{
            marginTop: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            padding: '4px 10px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Mark concentrating
        </button>
      )}

      <div style={{ marginTop: 10 }}>
        <CharacterConditionChips
          conditions={conditions}
          onRemove={canEdit ? onRemoveCondition : null}
          readOnly={!canEdit}
        />
      </div>

      <ResourceStrip
        spellSlots={spellSlots}
        classResources={classResources}
        compact={false}
        readOnly={!canEdit}
        onSpellSlotClick={canEdit ? onSpellSlotClick : undefined}
      />

      {canEdit && onShortRest && onLongRest && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onShortRest}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '6px 12px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Short rest
          </button>
          <button
            type="button"
            onClick={onLongRest}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '6px 12px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--green-mid)',
              borderRadius: 'var(--radius)',
              color: 'var(--green-bright)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Long rest
          </button>
        </div>
      )}

      {curHp === 0 && (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)' }}>
          Unconscious — track death saves in Party or ask your DM.
        </div>
      )}

      {combatActive && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Action economy {myTurnActive ? '' : '(not your turn)'}
          </div>
          <ActionEconomyTrack
            economy={myEconomy}
            readOnly={!myTurnActive}
            onToggle={myTurnActive ? onToggleEconomy : undefined}
          />
        </div>
      )}
    </div>
  )
}

function StatMini({ label, value, colour, title }) {
  return (
    <div title={title} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '5px 10px',
      background: 'var(--bg-card)',
      border: `1px solid ${colour}44`,
      borderRadius: 'var(--radius-lg)',
      minWidth: 44,
    }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}
