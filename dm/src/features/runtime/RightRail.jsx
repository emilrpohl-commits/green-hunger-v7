import React, { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useCombatStore } from '../../stores/combatStore'
import StatBlockView from '../statblocks/StatBlockView'
import RevealPanel from '../reveals/RevealPanel'

const CONDITIONS = ['Blinded', 'Charmed', 'Frightened', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious']

function CharacterCard({ char }) {
  const updateHp = useSessionStore(s => s.updateCharacterHp)
  const updateTempHp = useSessionStore(s => s.updateCharacterTempHp)
  const toggleConcentration = useSessionStore(s => s.toggleConcentration)
  const useSpellSlot = useSessionStore(s => s.useSpellSlot)
  const restoreSpellSlot = useSessionStore(s => s.restoreSpellSlot)
  const markDeathSave = useSessionStore(s => s.markDeathSave)

  const [hpInput, setHpInput] = useState('')
  const [hpMode, setHpMode] = useState('damage') // damage | heal

  const hpPct = char.maxHp > 0 ? (char.curHp / char.maxHp) * 100 : 0
  const hpColour = hpPct > 60
    ? 'var(--green-bright)'
    : hpPct > 30
      ? 'var(--warning)'
      : 'var(--danger)'

  const applyHp = () => {
    const val = parseInt(hpInput)
    if (isNaN(val) || val <= 0) return
    if (hpMode === 'damage') updateHp(char.id, char.curHp - val)
    else updateHp(char.id, char.curHp + val)
    setHpInput('')
  }

  const isDying = char.curHp === 0

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 10,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            {char.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {char.species} {char.class} {char.level}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {char.concentration && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--warning)',
              background: 'rgba(196,160,64,0.12)',
              border: '1px solid rgba(196,160,64,0.3)',
              borderRadius: 'var(--radius)',
              padding: '2px 5px',
              textTransform: 'uppercase'
            }}>CON</span>
          )}
          <button
            onClick={() => toggleConcentration(char.id)}
            title="Toggle Concentration"
            style={{
              fontSize: 11,
              padding: '3px 7px',
              background: char.concentration ? 'rgba(196,160,64,0.2)' : 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: char.concentration ? 'var(--warning)' : 'var(--text-muted)'
            }}>
            ◎
          </button>
        </div>
      </div>

      {/* HP bar and controls */}
      <div style={{ padding: '12px 14px 10px' }}>
        {/* HP bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>HP</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: hpColour }}>
              {char.curHp}{char.tempHp > 0 && <span style={{ color: 'var(--info)' }}>+{char.tempHp}</span>} / {char.maxHp}
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${hpPct}%`, background: hpColour, borderRadius: 3, transition: 'width 0.3s ease, background 0.3s ease' }} />
          </div>
        </div>

        {/* HP input */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          <button
            onClick={() => setHpMode(hpMode === 'damage' ? 'heal' : 'damage')}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              background: hpMode === 'damage' ? 'rgba(196,64,64,0.15)' : 'rgba(122,184,106,0.15)',
              border: `1px solid ${hpMode === 'damage' ? 'rgba(196,64,64,0.4)' : 'rgba(122,184,106,0.4)'}`,
              borderRadius: 'var(--radius)',
              color: hpMode === 'damage' ? 'var(--danger)' : 'var(--green-bright)',
              minWidth: 52
            }}>
            {hpMode === 'damage' ? '− DMG' : '+ HEAL'}
          </button>
          <input
            type="number"
            value={hpInput}
            onChange={e => setHpInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyHp()}
            placeholder="0"
            min="0"
            style={{
              flex: 1, padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 13,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
          <button onClick={applyHp} style={{
            padding: '5px 10px', fontSize: 12,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-secondary)'
          }}>
            Apply
          </button>
        </div>

        {/* Quick HP buttons */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {[1, 2, 3, 5, 10].map(n => (
            <button key={n} onClick={() => updateHp(char.id, char.curHp - n)} style={{
              padding: '3px 8px', fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--danger)'
            }}>−{n}</button>
          ))}
          {[1, 2, 3, 5, 10].map(n => (
            <button key={`h${n}`} onClick={() => updateHp(char.id, char.curHp + n)} style={{
              padding: '3px 8px', fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--green-bright)'
            }}>+{n}</button>
          ))}
        </div>

        {/* Temp HP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Temp</span>
          <button onClick={() => updateTempHp(char.id, char.tempHp - 1)} style={{ padding: '2px 6px', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>−</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--info)', minWidth: 20, textAlign: 'center' }}>{char.tempHp}</span>
          <button onClick={() => updateTempHp(char.id, char.tempHp + 1)} style={{ padding: '2px 6px', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>+</button>
        </div>

        {/* Death saves */}
        {isDying && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(196,64,64,0.1)', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 6 }}>Death Saves</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--green-bright)' }}>✓</span>
                {[0,1,2].map(i => (
                  <div key={i} onClick={() => markDeathSave(char.id, 'successes', i < char.deathSaves.successes ? -1 : 1)}
                    style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--green-dim)', background: i < char.deathSaves.successes ? 'var(--green-bright)' : 'transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>✗</span>
                {[0,1,2].map(i => (
                  <div key={i} onClick={() => markDeathSave(char.id, 'failures', i < char.deathSaves.failures ? -1 : 1)}
                    style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--rot-mid)', background: i < char.deathSaves.failures ? 'var(--danger)' : 'transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spell slots */}
        {char.spellSlots && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Spell Slots</div>
            {Object.entries(char.spellSlots).map(([level, slot]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', width: 14 }}>{level}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: slot.max }).map((_, i) => (
                    <div
                      key={i}
                      onClick={() => i < slot.used
                        ? restoreSpellSlot(char.id, parseInt(level))
                        : useSpellSlot(char.id, parseInt(level))
                      }
                      style={{
                        width: 12, height: 12,
                        borderRadius: '50%',
                        border: '1px solid var(--green-dim)',
                        background: i < (slot.max - slot.used) ? 'var(--green-mid)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 28 }}>
                  {slot.max - slot.used}/{slot.max}
                </span>
                {/* − restore one slot, + use one slot */}
                <button
                  onClick={() => restoreSpellSlot(char.id, parseInt(level))}
                  disabled={slot.used === 0}
                  style={{ padding: '1px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: slot.used === 0 ? 'var(--border)' : 'var(--green-bright)', cursor: slot.used === 0 ? 'default' : 'pointer', lineHeight: 1 }}
                >+</button>
                <button
                  onClick={() => useSpellSlot(char.id, parseInt(level))}
                  disabled={slot.used >= slot.max}
                  style={{ padding: '1px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: slot.used >= slot.max ? 'var(--border)' : 'var(--text-muted)', cursor: slot.used >= slot.max ? 'default' : 'pointer', lineHeight: 1 }}
                >−</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EncountersPanel() {
  const launchCorruptedHunt = useCombatStore(s => s.launchCorruptedHunt)
  const launchDarcy = useCombatStore(s => s.launchDarcy)
  const launchRottingBlooms = useCombatStore(s => s.launchRottingBlooms)
  const launchDamir = useCombatStore(s => s.launchDamir)
  const sessions = useSessionStore(s => s.sessions)
  const activeSessionId = useSessionStore(s => s.activeSessionId)
  const switchSession = useSessionStore(s => s.switchSession)
  const [expandedStatBlock, setExpandedStatBlock] = useState(null)

  const encounters = {
    'session-1': [
      { label: 'Corrupted Hunt', sub: '2× Corrupted Wolves', launch: launchCorruptedHunt, cr: 'CR ½', statBlockId: 'corrupted-wolf' }
    ],
    'session-2': [
      { label: 'Darcy, Recombined', sub: 'Corrupted Artificer · CR 4', launch: launchDarcy, cr: 'CR 4', statBlockId: 'darcy-recombined' },
      { label: 'Rotting Blooms × 3', sub: 'Corrupted Plants · CR 1 each', launch: launchRottingBlooms, cr: 'CR 1', statBlockId: 'rotting-bloom' },
      { label: 'Damir, the Woven Grief', sub: 'Corrupted Cleric · CR 7', launch: launchDamir, cr: 'CR 7', statBlockId: 'damir-woven-grief' }
    ]
  }
  const activeSession = sessions.find(s => s.id === activeSessionId)
  const fallbackSessionKey = activeSession?.session_number ? `session-${activeSession.session_number}` : null
  const activeEncounters =
    encounters[activeSessionId] ||
    (fallbackSessionKey ? encounters[fallbackSessionKey] : null) ||
    []

  return (
    <div style={{ padding: '12px 14px' }}>
      {/* Session switcher */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Session
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {sessions.map(s => (
            <button key={s.id} onClick={() => switchSession(s.id)} style={{
              flex: 1, padding: '5px 0',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              background: activeSessionId === s.id ? 'var(--green-dim)' : 'var(--bg-raised)',
              border: `1px solid ${activeSessionId === s.id ? 'var(--green-mid)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: activeSessionId === s.id ? 'var(--green-bright)' : 'var(--text-muted)',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              S{s.session_number || s.id.split('-')[1] || '?'}
            </button>
          ))}
        </div>
      </div>

      {/* Encounter list for active session */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Encounters
      </div>
      {activeEncounters.map((enc, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'stretch',
            background: 'rgba(196,64,64,0.07)',
            border: '1px solid rgba(196,64,64,0.25)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}>
            <button onClick={enc.launch} style={{
              flex: 1, padding: '10px 12px',
              color: '#d48060', textAlign: 'left', cursor: 'pointer',
              background: 'transparent', border: 'none'
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.04em', marginBottom: 3 }}>
                ⚔ {enc.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{enc.sub}</div>
            </button>
            {enc.statBlockId && (
              <button
                onClick={() => setExpandedStatBlock(expandedStatBlock === enc.statBlockId ? null : enc.statBlockId)}
                style={{
                  padding: '0 12px',
                  background: expandedStatBlock === enc.statBlockId ? 'rgba(196,64,64,0.15)' : 'transparent',
                  border: 'none', borderLeft: '1px solid rgba(196,64,64,0.2)',
                  color: '#d48060', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}
                title="View stat block"
              >
                {expandedStatBlock === enc.statBlockId ? '▲' : '▼'}
              </button>
            )}
          </div>
          {expandedStatBlock === enc.statBlockId && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(196,64,64,0.2)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              maxHeight: 420,
              overflow: 'auto'
            }}>
              <StatBlockView statBlockId={enc.statBlockId} />
            </div>
          )}
        </div>
      ))}
      {activeEncounters.length === 0 && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontStyle: 'italic'
        }}>
          No configured encounters for this session yet.
        </div>
      )}
    </div>
  )
}

function RollsPanel() {
  const playerRolls = useCombatStore(s => s.playerRolls)
  const clearPlayerRolls = useCombatStore(s => s.clearPlayerRolls)

  const timeLabel = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Player Rolls ({playerRolls.length})
        </div>
        {playerRolls.length > 0 && (
          <button onClick={clearPlayerRolls} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 8px',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            Clear
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        {playerRolls.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>
            No rolls yet. Rolls appear here as players make them.
          </div>
        ) : (
          playerRolls.map((roll, i) => (
            <div key={roll.id || i} style={{
              marginBottom: 6,
              padding: '6px 10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{roll.text}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                {roll.round ? `Round ${roll.round}` : ''} {timeLabel(roll.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const TAB_COLOUR = {
  party: 'var(--green-bright)',
  encounters: 'var(--danger)',
  rolls: 'var(--info)',
  reveal: 'var(--rot-bright)'
}

const PLAYER_OPTIONS = [
  { id: null, label: 'Unassigned' },
  { id: 'dorothea', label: 'Dorothea' },
  { id: 'kanan', label: 'Kanan' },
  { id: 'danil', label: 'Danil' },
]

function IlyaCompanionPanel() {
  const ilyaAssignedTo = useCombatStore(s => s.ilyaAssignedTo)
  const setIlyaAssignment = useCombatStore(s => s.setIlyaAssignment)

  return (
    <div style={{
      marginTop: 16,
      padding: '10px 12px',
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-muted)', marginBottom: 8,
      }}>
        NPC Companions
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
          overflow: 'hidden',
        }}>
          <img
            src="https://emilrpohl-commits.github.io/greenhunger-players/characters/Ilya.png"
            alt="Ilya"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-base)', flex: 1 }}>Ilya</span>
        <select
          value={ilyaAssignedTo || ''}
          onChange={e => setIlyaAssignment(e.target.value || null)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-base)',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            padding: '4px 6px', cursor: 'pointer',
          }}
        >
          {PLAYER_OPTIONS.map(o => (
            <option key={o.id ?? 'none'} value={o.id ?? ''}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function RightRail() {
  const characters = useSessionStore(s => s.characters)
  const playerRolls = useCombatStore(s => s.playerRolls)
  const [tab, setTab] = useState('party')

  const tabs = ['party', 'encounters', 'rolls', 'reveal']

  return (
    <div style={{
      gridArea: 'right',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0',
            fontFamily: 'var(--font-mono)', fontSize: 8,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: tab === t ? 'var(--bg-raised)' : 'transparent',
            border: 'none',
            borderBottom: tab === t ? `2px solid ${TAB_COLOUR[t]}` : '2px solid transparent',
            color: tab === t ? TAB_COLOUR[t] : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s ease',
            position: 'relative'
          }}>
            {t}
            {t === 'rolls' && playerRolls.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: 'var(--info)', color: '#000',
                borderRadius: '50%', width: 14, height: 14,
                fontSize: 8, fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700
              }}>
                {playerRolls.length > 9 ? '9+' : playerRolls.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'party' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
          {characters.filter(c => !c.isNPC).map(char => <CharacterCard key={char.id} char={char} />)}
          <IlyaCompanionPanel />
        </div>
      ) : tab === 'encounters' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <EncountersPanel />
        </div>
      ) : tab === 'rolls' ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <RollsPanel />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <RevealPanel />
        </div>
      )}
    </div>
  )
}
