import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useCombatStore } from '../../stores/combatStore'
import { useCampaignStore } from '../../stores/campaignStore'
import StatBlockView from '../statblocks/StatBlockView'
import RevealPanel from '../reveals/RevealPanel'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { DmRuntimeCharacterCard, CompanionsAndNpcsSection } from './DmPartyCards.jsx'
import CollapsibleDmPartyPanel from './CollapsibleDmPartyPanel.jsx'
import SessionMapsRunPanel from './SessionMapsRunPanel.jsx'

function emptyEncounterParticipant() {
  return { stat_block_id: '', count: 1, initiative: '' }
}

function EncountersPanel() {
  const launchCorruptedHunt = useCombatStore(s => s.launchCorruptedHunt)
  const launchDarcy = useCombatStore(s => s.launchDarcy)
  const launchRottingBlooms = useCombatStore(s => s.launchRottingBlooms)
  const launchDamir = useCombatStore(s => s.launchDamir)
  const launchEncounterFromDbRow = useCombatStore(s => s.launchEncounterFromDbRow)
  const encountersFromDb = useCampaignStore(s => s.encounters)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const saveEncounter = useCampaignStore(s => s.saveEncounter)
  const deleteEncounter = useCampaignStore(s => s.deleteEncounter)
  const sessions = useSessionStore(s => s.sessions)
  const activeSessionId = useSessionStore(s => s.activeSessionId)
  const switchSession = useSessionStore(s => s.switchSession)
  const rosterCharacters = useSessionStore(s => s.characters)
  const includedPlayerIds = useCombatStore(s => s.includedPlayerIds)
  const toggleIncludedPlayerId = useCombatStore(s => s.toggleIncludedPlayerId)
  const setIncludedPlayerIds = useCombatStore(s => s.setIncludedPlayerIds)
  const [expandedStatBlock, setExpandedStatBlock] = useState(null)
  const [detailEncId, setDetailEncId] = useState(null)
  const [openStatKey, setOpenStatKey] = useState(null)
  const [editingEncounterId, setEditingEncounterId] = useState(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('combat')
  const [formParticipants, setFormParticipants] = useState([emptyEncounterParticipant()])
  const [saveEncBusy, setSaveEncBusy] = useState(false)
  const [encFormErr, setEncFormErr] = useState(null)
  const rosterPlayers = useMemo(
    () => (rosterCharacters || []).filter((c) => !c.isNPC),
    [rosterCharacters]
  )
  const allPlayerIds = useMemo(() => rosterPlayers.map((c) => c.id), [rosterPlayers])
  const selectedIds = includedPlayerIds?.length ? includedPlayerIds : allPlayerIds

  const statBlockById = useMemo(
    () => Object.fromEntries(statBlocks.map((sb) => [sb.id, sb])),
    [statBlocks],
  )

  const useDbEncounters =
    featureFlags.encountersDbOnly && !featureFlags.encountersDbOnlyKillSwitch && encountersFromDb.length > 0

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
  const usedSessionNumberFallback =
    !!fallbackSessionKey &&
    !encounters[activeSessionId] &&
    !!encounters[fallbackSessionKey]

  const warnedRef = useRef(false)
  useEffect(() => {
    if (useDbEncounters || warnedRef.current) return
    if (usedSessionNumberFallback && activeSessionId) {
      warnedRef.current = true
      warnFallback('Encounters panel keyed by session_number (UUID did not match static keys)', {
        system: 'dmEncountersPanel',
        activeSessionId,
        fallbackSessionKey,
      })
    }
  }, [useDbEncounters, usedSessionNumberFallback, activeSessionId, fallbackSessionKey])

  const activeEncounters =
    encounters[activeSessionId] ||
    (fallbackSessionKey ? encounters[fallbackSessionKey] : null) ||
    []

  const dbOnlyEmptyWarned = useRef(false)
  useEffect(() => {
    if (dbOnlyEmptyWarned.current) return
    if (featureFlags.encountersDbOnly && !featureFlags.encountersDbOnlyKillSwitch && encountersFromDb.length === 0) {
      dbOnlyEmptyWarned.current = true
      warnFallback('VITE_ENCOUNTERS_DB_ONLY is on but no encounters rows; legacy static list is used until you seed or add rows', {
        system: 'dmEncountersPanel',
      })
    }
  }, [encountersFromDb.length])

  const resetEncounterForm = () => {
    setEditingEncounterId(null)
    setFormTitle('')
    setFormType('combat')
    setFormParticipants([emptyEncounterParticipant()])
    setEncFormErr(null)
  }

  const startEditEncounter = (enc) => {
    setEditingEncounterId(enc.id)
    setFormTitle(enc.title || '')
    setFormType(enc.type || 'combat')
    const parts = Array.isArray(enc.participants) && enc.participants.length
      ? enc.participants.map((p) => ({
          stat_block_id: p.stat_block_id || '',
          count: Math.max(1, Number(p.count) || 1),
          initiative: p.initiative === 0 || p.initiative ? String(p.initiative) : '',
        }))
      : [emptyEncounterParticipant()]
    setFormParticipants(parts)
  }

  const updateFormParticipant = (idx, field, value) => {
    setFormParticipants((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    )
  }

  const addFormParticipantRow = () => {
    setFormParticipants((rows) => [...rows, emptyEncounterParticipant()])
  }

  const removeFormParticipantRow = (idx) => {
    setFormParticipants((rows) => {
      if (rows.length <= 1) return [emptyEncounterParticipant()]
      return rows.filter((_, i) => i !== idx)
    })
  }

  const handleSaveEncounterForm = async () => {
    if (!formTitle.trim()) return
    const participants = formParticipants
      .filter((p) => p.stat_block_id)
      .map((p) => {
        const row = {
          stat_block_id: p.stat_block_id,
          count: Math.max(1, parseInt(String(p.count), 10) || 1),
        }
        const ini = String(p.initiative).trim()
        if (ini !== '') {
          const n = Number(ini)
          if (!Number.isNaN(n)) row.initiative = n
        }
        return row
      })
    if (!participants.length) return
    setSaveEncBusy(true)
    setEncFormErr(null)
    const result = await saveEncounter({
      id: editingEncounterId || undefined,
      title: formTitle.trim(),
      type: formType,
      participants,
    })
    setSaveEncBusy(false)
    if (result.error) setEncFormErr(result.error)
    else resetEncounterForm()
  }

  const handleDeleteEncounter = async (enc) => {
    if (!window.confirm(`Delete encounter “${enc.title}”?`)) return
    setSaveEncBusy(true)
    setEncFormErr(null)
    const del = await deleteEncounter(enc.id)
    setSaveEncBusy(false)
    if (del.error) {
      setEncFormErr(del.error)
      return
    }
    if (editingEncounterId === enc.id) resetEncounterForm()
    if (detailEncId === enc.id) {
      setDetailEncId(null)
      setOpenStatKey(null)
    }
  }

  const encounterParticipantSummary = (enc) => {
    const parts = Array.isArray(enc.participants) ? enc.participants : []
    return parts
      .map((p) => {
        const sb = p.stat_block_id ? statBlockById[p.stat_block_id] : null
        const name = sb?.name || '?'
        const c = Math.max(1, Number(p.count) || 1)
        return c > 1 ? `${c}× ${name}` : name
      })
      .join(', ')
  }

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
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Include Players In Combat
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => setIncludedPlayerIds([])}
            style={{
              padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: includedPlayerIds?.length ? 'transparent' : 'var(--green-dim)',
              color: includedPlayerIds?.length ? 'var(--text-muted)' : 'var(--green-bright)',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {rosterPlayers.map((pc) => {
            const included = selectedIds.includes(pc.id)
            return (
              <button
                key={pc.id}
                type="button"
                onClick={() => toggleIncludedPlayerId(pc.id)}
                style={{
                  padding: '3px 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${included ? 'var(--green-mid)' : 'var(--border)'}`,
                  background: included ? 'var(--green-dim)' : 'transparent',
                  color: included ? 'var(--green-bright)' : 'var(--text-muted)',
                  opacity: included ? 1 : 0.6,
                  cursor: 'pointer',
                }}
              >
                {pc.name}
              </button>
            )
          })}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
          {selectedIds.length}/{allPlayerIds.length} selected
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Encounters
      </div>
      {useDbEncounters && encountersFromDb.map((enc) => {
        const sub = enc.type ? `${enc.type}${enc.difficulty ? ` · ${enc.difficulty}` : ''}` : 'Combat'
        const summary = encounterParticipantSummary(enc)
        const showDetail = detailEncId === enc.id
        return (
          <div key={enc.id} style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', gap: 6, alignItems: 'stretch',
              background: 'rgba(196,64,64,0.07)',
              border: '1px solid rgba(196,64,64,0.25)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden'
            }}>
              <button
                type="button"
                onClick={() => launchEncounterFromDbRow(enc, statBlockById)}
                style={{
                  flex: 1, padding: '10px 12px',
                  color: '#d48060', textAlign: 'left', cursor: 'pointer',
                  background: 'transparent', border: 'none'
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.04em', marginBottom: 3 }}>
                  ⚔ {enc.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
                {summary && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {summary}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailEncId(showDetail ? null : enc.id)
                  setOpenStatKey(null)
                }}
                style={{
                  padding: '0 10px',
                  background: showDetail ? 'rgba(196,64,64,0.15)' : 'transparent',
                  border: 'none', borderLeft: '1px solid rgba(196,64,64,0.2)',
                  color: '#d48060', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}
                title="Preview stat blocks"
              >
                {showDetail ? '▲' : '▼'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={saveEncBusy}
                onClick={() => startEditEncounter(enc)}
                style={{
                  padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={saveEncBusy}
                onClick={() => handleDeleteEncounter(enc)}
                style={{
                  padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  background: 'transparent', border: '1px solid rgba(196,64,64,0.35)', borderRadius: 'var(--radius)',
                  color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
            {showDetail && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(196,64,64,0.2)',
                borderRadius: 'var(--radius-lg)',
                marginTop: 6,
                padding: '8px 10px',
                maxHeight: 480,
                overflow: 'auto'
              }}>
                {(Array.isArray(enc.participants) ? enc.participants : []).map((p, i) => {
                  const sb = p.stat_block_id ? statBlockById[p.stat_block_id] : null
                  const slug = sb?.slug || sb?.id
                  const key = `${enc.id}:${i}`
                  const open = openStatKey === key
                  const c = Math.max(1, Number(p.count) || 1)
                  return (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {c}× {sb?.name || 'Unknown stat block'}
                        </span>
                        {slug && (
                          <button
                            type="button"
                            onClick={() => setOpenStatKey(open ? null : key)}
                            style={{
                              padding: '2px 8px', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                              background: open ? 'rgba(196,64,64,0.12)' : 'transparent',
                              border: '1px solid rgba(196,64,64,0.25)', borderRadius: 'var(--radius)',
                              color: '#d48060', cursor: 'pointer',
                            }}
                          >
                            {open ? 'Hide' : 'View'}
                          </button>
                        )}
                      </div>
                      {open && slug && (
                        <div style={{ marginTop: 6, maxHeight: 360, overflow: 'auto' }}>
                          <StatBlockView statBlockId={slug} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {!useDbEncounters && activeEncounters.map((enc, i) => (
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
      {!useDbEncounters && activeEncounters.length === 0 && (
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
      {useDbEncounters && encountersFromDb.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          No rows in <code style={{ fontSize: 10 }}>encounters</code>. Add one below or run the Phase 2 migration seed.
        </div>
      )}
      <div style={{
        marginTop: 12,
        padding: 10,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          {editingEncounterId ? 'Edit encounter' : 'Add encounter (library)'}
        </div>
        {editingEncounterId && (
          <button
            type="button"
            onClick={resetEncounterForm}
            style={{
              marginBottom: 8, width: '100%', padding: '4px', fontSize: 10, fontFamily: 'var(--font-mono)',
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            Cancel edit
          </button>
        )}
        <input
          placeholder="Title"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          style={{
            width: '100%', marginBottom: 6, padding: '6px 8px', boxSizing: 'border-box',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-primary)', fontSize: 12,
          }}
        />
        <select
          value={formType}
          onChange={(e) => setFormType(e.target.value)}
          style={{
            width: '100%', marginBottom: 8, padding: '6px 8px',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-primary)', fontSize: 11,
          }}
        >
          <option value="combat">combat</option>
          <option value="social">social</option>
          <option value="skill">skill</option>
          <option value="puzzle">puzzle</option>
        </select>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>
          Participants (stat block × count; optional initiative)
        </div>
        {formParticipants.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 52px 48px 28px',
              gap: 6,
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <select
              value={row.stat_block_id}
              onChange={(e) => updateFormParticipant(idx, 'stat_block_id', e.target.value)}
              style={{
                minWidth: 0, padding: '5px 6px',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                color: 'var(--text-primary)', fontSize: 10,
              }}
            >
              <option value="">Stat block…</option>
              {statBlocks.map((sb) => (
                <option key={sb.id} value={sb.id}>{sb.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              title="Count"
              value={row.count}
              onChange={(e) => updateFormParticipant(idx, 'count', parseInt(e.target.value, 10) || 1)}
              style={{
                width: '100%', padding: '4px 4px', boxSizing: 'border-box',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                color: 'var(--text-primary)', fontSize: 11,
              }}
            />
            <input
              type="number"
              title="Initiative"
              placeholder="Ini"
              value={row.initiative}
              onChange={(e) => updateFormParticipant(idx, 'initiative', e.target.value)}
              style={{
                width: '100%', padding: '4px 4px', boxSizing: 'border-box',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                color: 'var(--text-primary)', fontSize: 10,
              }}
            />
            <button
              type="button"
              onClick={() => removeFormParticipantRow(idx)}
              title="Remove row"
              style={{
                padding: '2px 0', fontSize: 12, background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1,
              }}
            >
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addFormParticipantRow}
          style={{
            width: '100%', marginBottom: 8, padding: '4px', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          + Add creature row
        </button>
        {encFormErr && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
            {encFormErr}
          </div>
        )}
        <button
          type="button"
          disabled={
            saveEncBusy ||
            !formTitle.trim() ||
            !formParticipants.some((p) => p.stat_block_id)
          }
          onClick={handleSaveEncounterForm}
          style={{
            width: '100%', padding: '8px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            background: 'var(--green-dim)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)',
            color: 'var(--green-bright)', cursor: saveEncBusy ? 'wait' : 'pointer',
          }}
        >
          {editingEncounterId ? 'Update in DB' : 'Save to DB'}
        </button>
      </div>
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
  maps: '#6090b0',
  encounters: 'var(--danger)',
  rolls: 'var(--info)',
  reveal: 'var(--rot-bright)',
}

export default function RightRail({ onCollapse = null }) {
  const characters = useSessionStore(s => s.characters)
  const playerRolls = useCombatStore(s => s.playerRolls)
  const [tab, setTab] = useState('party')

  const tabs = ['party', 'maps', 'encounters', 'rolls', 'reveal']

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
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse sidebar"
            style={{
              width: 28,
              border: 'none',
              borderRight: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
            }}
          >
            ▶
          </button>
        )}
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
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--text-muted)', marginBottom: 8,
          }}
          >
            Party
          </div>
          <CollapsibleDmPartyPanel characters={characters.filter((c) => !c.isNPC)} tagLabel="Player" />
          <CompanionsAndNpcsSection characters={characters} />
        </div>
      ) : tab === 'maps' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <SessionMapsRunPanel />
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
