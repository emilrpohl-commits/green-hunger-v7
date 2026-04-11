import React from 'react'
import { BaseCharacterCard } from '@shared/components/character/index.js'
import { usePlayerStore } from '../stores/playerStore'

export default function PartyStatus() {
  const characters = usePlayerStore((s) => s.characters)
  const canEditCharacterState = usePlayerStore((s) => s.canEditCharacterState)
  const updateMyCharacterHp = usePlayerStore((s) => s.updateMyCharacterHp)
  const updateMyCharacterTempHp = usePlayerStore((s) => s.updateMyCharacterTempHp)
  const setMyCharacterConditions = usePlayerStore((s) => s.setMyCharacterConditions)

  const pcs = characters.filter((c) => !c.isNPC)
  const npcs = characters.filter((c) => c.isNPC)

  const byAssignee = {}
  for (const n of npcs) {
    const k = n.assignedPcId || '_unassigned'
    if (!byAssignee[k]) byAssignee[k] = []
    byAssignee[k].push(n)
  }
  const unassigned = byAssignee._unassigned || []

  function renderCard(char) {
    const canEdit = canEditCharacterState(char.id)
    const hpPct = char.maxHp > 0 ? (char.curHp / char.maxHp) * 100 : 0
    const hpColour = char.curHp === 0
      ? 'var(--danger)'
      : hpPct > 60
        ? 'var(--green-bright)'
        : hpPct > 30
          ? 'var(--warning)'
          : '#c46040'

    return (
      <BaseCharacterCard
        key={char.id}
        char={char}
        tagLabel={char.isNPC ? (char.assignedPcId ? 'Companion' : 'NPC') : 'Player'}
        portraitSize="sm"
        curHp={char.curHp}
        maxHp={char.maxHp}
        tempHp={char.tempHp ?? 0}
        hpColour={hpColour}
        ac={char.ac}
        speed={char.speed}
        hpControlProps={canEdit ? {
          onApplyDelta: (d) => updateMyCharacterHp(char.id, char.curHp + d),
          onSetTempHp: (t) => updateMyCharacterTempHp(char.id, t),
          readOnly: false,
        } : { readOnly: true }}
        resourceStripProps={{
          spellSlots: char.spellSlots,
          classResources: char.classResources || [],
          readOnly: true,
          compact: true,
        }}
        conditions={char.conditions || []}
        onRemoveCondition={canEdit
          ? (name) => setMyCharacterConditions(char.id, (char.conditions || []).filter((c) => c !== name))
          : null}
        conditionsReadOnly={!canEdit}
        footer={char.curHp === 0 ? (
          <div style={{
            marginTop: 10,
            padding: '8px 10px',
            background: 'rgba(176,48,48,0.1)',
            border: '1px solid rgba(176,48,48,0.25)',
            borderRadius: 'var(--radius)',
          }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 6 }}>
              Death saves
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--green-bright)' }}>✓</span>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: i < (char.deathSaves?.successes || 0) ? 'var(--green-bright)' : 'transparent',
                      border: '1px solid var(--green-dim)',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>✗</span>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: i < (char.deathSaves?.failures || 0) ? 'var(--danger)' : 'transparent',
                      border: '1px solid rgba(176,48,48,0.4)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      />
    )
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}
    >
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
        >
          Party Status
        </span>
      </div>

      <div style={{ padding: '12px 14px 16px' }}>
        {pcs.map((char) => (
          <div key={char.id}>
            {renderCard(char)}
            {(byAssignee[char.id] || []).map((comp) => renderCard(comp))}
          </div>
        ))}
        {unassigned.map((char) => renderCard(char))}
      </div>
    </div>
  )
}
