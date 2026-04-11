import React, { useState, useEffect } from 'react'
import { BaseCharacterCard } from '@shared/components/character/index.js'
import { GreenMarkPanel } from '@shared/components/greenMarks/index.js'
import { useSessionStore } from '../../stores/sessionStore'
import { useCombatStore } from '../../stores/combatStore'
import { useCampaignStore } from '../../stores/campaignStore'
import { rosterToDmTargetOptions } from '@shared/lib/partyRoster.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'

function DeathSavesBlock({ char, markDeathSave }) {
  if (char.curHp !== 0) return null
  return (
    <div style={{
      marginBottom: 10,
      padding: '8px 10px',
      background: 'rgba(196,64,64,0.1)',
      border: '1px solid rgba(196,64,64,0.3)',
      borderRadius: 'var(--radius)',
    }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 6 }}>
        Death Saves
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--green-bright)' }}>✓</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => markDeathSave(char.id, 'successes', i < char.deathSaves.successes ? -1 : 1)}
              onKeyDown={(e) => e.key === 'Enter' && markDeathSave(char.id, 'successes', i < char.deathSaves.successes ? -1 : 1)}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '1px solid var(--green-dim)',
                background: i < char.deathSaves.successes ? 'var(--green-bright)' : 'transparent',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--danger)' }}>✗</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => markDeathSave(char.id, 'failures', i < char.deathSaves.failures ? -1 : 1)}
              onKeyDown={(e) => e.key === 'Enter' && markDeathSave(char.id, 'failures', i < char.deathSaves.failures ? -1 : 1)}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '1px solid var(--rot-mid)',
                background: i < char.deathSaves.failures ? 'var(--danger)' : 'transparent',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DmRuntimeCharacterCard({ char, tagLabel, assignmentSlot = null }) {
  const updateHp = useSessionStore((s) => s.updateCharacterHp)
  const updateTempHp = useSessionStore((s) => s.updateCharacterTempHp)
  const toggleConcentration = useSessionStore((s) => s.toggleConcentration)
  const setCharacterConcentration = useSessionStore((s) => s.setCharacterConcentration)
  const patchCharacterTacticalJson = useSessionStore((s) => s.patchCharacterTacticalJson)
  const useSpellSlot = useSessionStore((s) => s.useSpellSlot)
  const restoreSpellSlot = useSessionStore((s) => s.restoreSpellSlot)
  const markDeathSave = useSessionStore((s) => s.markDeathSave)
  const setCharacterConditions = useSessionStore((s) => s.setCharacterConditions)
  const adjustCharacterGreenMarks = useSessionStore((s) => s.adjustCharacterGreenMarks)
  const touchGreenMarkTriggered = useSessionStore((s) => s.touchGreenMarkTriggered)

  const [concSpellDraft, setConcSpellDraft] = useState(
    () => char.tacticalJson?.concentrationSpell || char.concentrationSpell || ''
  )
  useEffect(() => {
    setConcSpellDraft(char.tacticalJson?.concentrationSpell || char.concentrationSpell || '')
  }, [char.id, char.concentration, char.tacticalJson?.concentrationSpell, char.concentrationSpell])

  const hpPct = char.maxHp > 0 ? (char.curHp / char.maxHp) * 100 : 0
  const hpColour = hpPct > 60
    ? 'var(--green-bright)'
    : hpPct > 30
      ? 'var(--warning)'
      : 'var(--danger)'

  const cardChar = {
    ...char,
    portrait_thumb_storage_path: char.portrait_thumb_storage_path,
    portrait_original_storage_path: char.portrait_original_storage_path,
  }

  const vitalsSlot = (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {char.concentration && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--warning)',
          background: 'rgba(196,160,64,0.12)',
          border: '1px solid rgba(196,160,64,0.3)',
          borderRadius: 'var(--radius)',
          padding: '2px 6px',
          textTransform: 'uppercase',
        }}
        >
          Conc
        </span>
      )}
      <button
        type="button"
        onClick={() => toggleConcentration(char.id)}
        title="Toggle concentration"
        style={{
          fontSize: 11,
          padding: '3px 7px',
          background: char.concentration ? 'rgba(196,160,64,0.2)' : 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: char.concentration ? 'var(--warning)' : 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        ◎
      </button>
      {char.concentration && (
        <>
          <input
            value={concSpellDraft}
            onChange={(e) => setConcSpellDraft(e.target.value)}
            onBlur={() => patchCharacterTacticalJson(char.id, { concentrationSpell: concSpellDraft || null })}
            placeholder="Spell name"
            style={{
              flex: 1,
              minWidth: 100,
              padding: '4px 8px',
              fontSize: 11,
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={() => {
              setConcSpellDraft('')
              setCharacterConcentration(char.id, false, null)
            }}
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            End conc
          </button>
        </>
      )}
      {assignmentSlot}
    </div>
  )

  return (
    <BaseCharacterCard
      char={cardChar}
      tagLabel={tagLabel}
      portraitSize="md"
      vitalsSlot={vitalsSlot}
      curHp={char.curHp}
      maxHp={char.maxHp}
      tempHp={char.tempHp ?? 0}
      hpColour={hpColour}
      ac={char.ac}
      speed={char.speed}
      hpControlProps={{
        onApplyDelta: (d) => updateHp(char.id, char.curHp + d),
        onSetTempHp: (t) => updateTempHp(char.id, t),
        readOnly: false,
      }}
      resourceStripProps={{
        spellSlots: char.spellSlots,
        classResources: char.classResources || [],
        onSpellSlotClick: (level, mode) => {
          const lv = parseInt(level, 10)
          if (mode === 'use') useSpellSlot(char.id, lv)
          else restoreSpellSlot(char.id, lv)
        },
        readOnly: false,
        compact: true,
      }}
      conditions={char.conditions || []}
      onRemoveCondition={(name) => setCharacterConditions(char.id, (char.conditions || []).filter((c) => c !== name))}
      conditionsReadOnly={false}
      footer={(
        <>
          {!char.isNPC && (
            <GreenMarkPanel
              characterId={char.id}
              characterName={char.name}
              current={char.greenMarks ?? 0}
              maxMarks={char.greenMarkCap ?? 10}
              onAdjust={adjustCharacterGreenMarks}
              onMarkLastTriggered={touchGreenMarkTriggered}
            />
          )}
          <DeathSavesBlock char={char} markDeathSave={markDeathSave} />
        </>
      )}
    />
  )
}

/** Collapsed: name + HP. Expand for full DM card (optional assignment slot for companions/NPCs). */
export function CollapsibleDmCharacterPanel({ char, tagLabel = 'Player', assignmentSlot = null }) {
  const [expanded, setExpanded] = useState(false)
  const pct = char.maxHp > 0 ? Math.round((char.curHp / char.maxHp) * 100) : 0

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          border: 'none',
          background: expanded ? 'rgba(100,140,100,0.08)' : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{char.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            {tagLabel} · HP {char.curHp}/{char.maxHp} ({pct}%)
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green-bright)' }}>{expanded ? 'Hide' : 'Show'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 10px 12px', borderTop: '1px solid var(--border)' }}>
          <DmRuntimeCharacterCard char={char} tagLabel={tagLabel} assignmentSlot={assignmentSlot} />
        </div>
      )}
    </div>
  )
}

export function CompanionsAndNpcsSection({ characters }) {
  const patchCharacterAssignment = useCampaignStore((s) => s.patchCharacterAssignment)
  const setIlyaAssignment = useCombatStore((s) => s.setIlyaAssignment)
  const pcs = characters.filter((c) => !c.isNPC)
  const npcs = characters.filter((c) => c.isNPC)
  const playerOptions = rosterToDmTargetOptions(characters)

  async function assignCompanion(companionId, pcId) {
    const res = await patchCharacterAssignment(companionId, pcId || null)
    if (res.error) {
      warnFallback('patchCharacterAssignment failed', { system: 'dmParty', reason: res.error })
      return
    }
    if (companionId === 'ilya') {
      await setIlyaAssignment(pcId || null)
    }
    useSessionStore.setState({
      characters: useSessionStore.getState().characters.map((c) =>
        c.id === companionId ? { ...c, assignedPcId: pcId || null } : c
      ),
    })
  }

  const assignedByPc = {}
  for (const n of npcs) {
    const k = n.assignedPcId || ''
    if (!k) continue
    if (!assignedByPc[k]) assignedByPc[k] = []
    assignedByPc[k].push(n)
  }
  const unassigned = npcs.filter((n) => !n.assignedPcId)

  if (npcs.length === 0) return null

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        marginBottom: 10,
      }}
      >
        Companions & NPCs
      </div>
      {pcs.map((pc) => {
        const list = assignedByPc[pc.id] || []
        if (!list.length) return null
        return (
          <div key={pc.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
              With {pc.name}
            </div>
            {list.map((c) => (
              <div key={c.id} style={{ marginBottom: 8 }}>
                <CollapsibleDmCharacterPanel
                  char={c}
                  tagLabel="Companion"
                  assignmentSlot={(
                    <select
                      value={c.assignedPcId || ''}
                      onChange={(e) => assignCompanion(c.id, e.target.value || null)}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text-base)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        padding: '4px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Unassigned</option>
                      {playerOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                />
              </div>
            ))}
          </div>
        )
      })}
      {unassigned.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Unassigned</div>
          {unassigned.map((c) => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <CollapsibleDmCharacterPanel
                char={c}
                tagLabel="NPC"
                assignmentSlot={(
                  <select
                    value={c.assignedPcId || ''}
                    onChange={(e) => assignCompanion(c.id, e.target.value || null)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text-base)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      padding: '4px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {playerOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
