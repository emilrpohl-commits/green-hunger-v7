import React, { useEffect, useMemo, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useCombatStore } from '../../stores/combatStore'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { rosterToDmTargetOptions } from '@shared/lib/partyRoster.js'
import { BEAT_TYPE_LABELS, BEAT_TYPE_STYLES } from '@shared/lib/constants.js'
import StatBlockView from '../statblocks/StatBlockView'

const BEAT_TYPE_LABEL = {
  ...BEAT_TYPE_LABELS,
  check: 'SKILL CHECK',
}

const BEAT_TYPE_STYLE = { ...BEAT_TYPE_STYLES }

const DICE = [4, 6, 8, 10, 12, 20]

function parseMechanicalEffect(value) {
  if (!value) return null
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

function SkillCheckTable({ rows }) {
  if (!rows?.length) return null
  const thStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
  }
  const tdStyle = {
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'top',
  }

  return (
    <div style={{ marginBottom: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Trigger</th>
            <th style={thStyle}>Skill / Save</th>
            <th style={{ ...thStyle, width: 70 }}>DC</th>
            <th style={thStyle}>What They Learn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}>{row.trigger || '—'}</td>
              <td style={tdStyle}>{row.skill || '—'}</td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--info)' }}>{row.dc ?? '—'}</td>
              <td style={tdStyle}>{row.whatTheyLearn || row.result || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OutcomeTable({ rows }) {
  if (!rows?.length) return null
  const thStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
  }
  const tdStyle = {
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'top',
  }

  return (
    <div style={{ marginBottom: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Outcome</th>
            <th style={thStyle}>Consequence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}>{row.outcome || '—'}</td>
              <td style={tdStyle}>{row.consequence || row.result || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DmDiceRoller({ supabaseClient }) {
  const roster = useSessionStore(s => s.characters)
  const dmRollTargets = useMemo(
    () => [...rosterToDmTargetOptions(roster), { id: 'all', name: 'All Players' }],
    [roster]
  )
  const [die, setDie] = useState(20)
  const [modifier, setModifier] = useState(0)
  const [target, setTarget] = useState('all')
  const [lastRoll, setLastRoll] = useState(null)

  const roll = async () => {
    const sessionRunId = getSessionRunId()
    const result = Math.floor(Math.random() * die) + 1
    const total = result + modifier
    const targetLabel = dmRollTargets.find(c => c.id === target)?.name || 'All Players'
    const modStr = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` − ${Math.abs(modifier)}` : ''
    const text = `DM rolls d${die}${modStr}: ${result}${modifier !== 0 ? ` → ${total}` : ''}${target !== 'all' ? ` (for ${targetLabel})` : ''}`
    setLastRoll({ result, total, die, crit: result === 20 && die === 20, fumble: result === 1 && die === 20 })
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        round: 0,
        text,
        type: 'dm-roll',
        shared: target === 'all',
        visibility: target === 'all' ? 'player_visible' : 'targeted',
        target_id: target,
        timestamp: new Date().toISOString()
      })
    } catch (e) {}
  }

  const resultColour = lastRoll?.crit ? '#d4a820' : lastRoll?.fumble ? '#b03030' : 'var(--green-bright)'

  return (
    <div style={{ marginTop: 20, background: 'rgba(64,96,64,0.08)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        DM Roll → Players
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Die selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {DICE.map(d => (
            <button key={d} onClick={() => setDie(d)} style={{
              padding: '4px 8px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              background: die === d ? 'var(--green-dim)' : 'var(--bg-raised)',
              border: `1px solid ${die === d ? 'var(--green-mid)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: die === d ? 'var(--green-bright)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}>d{d}</button>
          ))}
        </div>
        {/* Modifier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setModifier(m => m - 1)} style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>−</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: modifier === 0 ? 'var(--text-muted)' : 'var(--text-primary)', minWidth: 28, textAlign: 'center' }}>
            {modifier >= 0 ? `+${modifier}` : modifier}
          </span>
          <button onClick={() => setModifier(m => m + 1)} style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>+</button>
        </div>
        {/* Target */}
        <select value={target} onChange={e => setTarget(e.target.value)} style={{
          padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 11,
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-secondary)'
        }}>
          {dmRollTargets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {/* Roll button */}
        <button onClick={roll} style={{
          padding: '6px 18px', fontFamily: 'var(--font-mono)', fontSize: 12,
          background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
          borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer',
          letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>Roll</button>
        {/* Last result */}
        {lastRoll && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: resultColour, marginLeft: 8 }}>
            {lastRoll.total}
            {lastRoll.crit && <span style={{ fontSize: 11, marginLeft: 5, color: '#d4a820' }}>CRIT</span>}
            {lastRoll.fumble && <span style={{ fontSize: 11, marginLeft: 5, color: '#b03030' }}>nat 1</span>}
          </span>
        )}
      </div>
    </div>
  )
}

export default function MainPanel() {
  const session = useSessionStore(s => s.session)
  const activeSessionResolveError = useSessionStore(s => s.activeSessionResolveError)
  const sessions = useSessionStore(s => s.sessions)
  const currentSceneIndex = useSessionStore(s => s.currentSceneIndex)
  const currentBeatIndex = useSessionStore(s => s.currentBeatIndex)
  const nextBeat = useSessionStore(s => s.nextBeat)
  const prevBeat = useSessionStore(s => s.prevBeat)
  const jumpToSceneById = useSessionStore(s => s.jumpToSceneById)
  const launchEncounterByStatBlockId = useCombatStore(s => s.launchEncounterByStatBlockId)

  // Keyboard navigation — must be before any early returns (Rules of Hooks)
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextBeat()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevBeat()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextBeat, prevBeat])

  // No session loaded yet — show placeholder
  if (!session) {
    return (
      <div style={{
        gridArea: 'main',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deep)',
        color: 'var(--text-muted)',
        gap: 12
      }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>📖</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          No session loaded
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.6, textAlign: 'center', maxWidth: 420 }}>
          {sessions.length === 0
            ? 'Create a session in the Builder to get started.'
            : activeSessionResolveError === 'no_active_session'
              ? 'No live session is set. Select a session in the left rail — this updates active_session_uuid for players.'
              : activeSessionResolveError === 'active_session_not_found'
                ? 'session_state.active_session_uuid does not match any loaded session. Pick a session in the left rail to fix.'
                : 'Select a session in the left rail to continue.'}
        </div>
      </div>
    )
  }

  const scene = session?.scenes?.[currentSceneIndex]
  const beat = scene?.beats?.[currentBeatIndex]
  const totalBeats = scene?.beats?.length || 0
  const isLastBeat = currentBeatIndex === totalBeats - 1
  const isLastScene = currentSceneIndex === (session?.scenes?.length ?? 1) - 1
  const hasBranches = isLastBeat && scene?.branches?.length > 0

  if (!scene || !beat) return null

  const typeStyle = BEAT_TYPE_STYLE[beat.type] || BEAT_TYPE_STYLE.narrative
  const mechanicalRows = parseMechanicalEffect(beat.mechanical_effect)
  const checkRows = beat.type === 'check'
    ? (mechanicalRows || []).map(r => ({
        trigger: r?.trigger ?? '',
        skill: r?.skill ?? '',
        dc: r?.dc ?? '',
        whatTheyLearn: r?.whatTheyLearn ?? r?.result ?? '',
      }))
    : []
  const decisionRows = beat.type === 'decision'
    ? (mechanicalRows || []).map(r => ({
        outcome: r?.outcome ?? r?.trigger ?? '',
        consequence: r?.consequence ?? r?.whatTheyLearn ?? r?.result ?? '',
      }))
    : []

  return (
    <div style={{
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-deep)'
    }}>
      {/* Scene header */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em'
          }}>
            Scene {currentSceneIndex + 1} of {session?.scenes?.length ?? 0}
          </span>
          <span style={{ color: 'var(--border-bright)', fontSize: 10 }}>·</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            ⏱ {scene.estimatedTime}
          </span>
        </div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '0.06em'
        }}>
          {scene.title}
        </h1>
        <div style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          marginTop: 2
        }}>
          {scene.subtitle}
        </div>
      </div>

      {/* Beat content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

        {/* Beat type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 'var(--radius)',
            background: typeStyle.bg,
            color: typeStyle.color,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: `1px solid ${typeStyle.color}40`
          }}>
            {BEAT_TYPE_LABEL[beat.type] || beat.type}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)'
          }}>
            {currentBeatIndex + 1} / {totalBeats}
          </span>
        </div>

        {/* Beat title */}
        <h2 style={{
          fontSize: 18,
          color: 'var(--text-primary)',
          marginBottom: 16,
          letterSpacing: '0.04em'
        }}>
          {beat.title}
        </h2>

        {checkRows.length > 0 && <SkillCheckTable rows={checkRows} />}
        {decisionRows.length > 0 && <OutcomeTable rows={decisionRows} />}

        {/* Beat content — read aloud text */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--green-dim)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: 20,
          fontSize: 16,
          lineHeight: 1.8,
          color: 'var(--text-primary)',
          fontStyle: 'italic'
        }}>
          {beat.content}
        </div>

        {/* For beats with a linked stat block: render formatted stat block */}
        {beat.statBlockId ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(196,64,64,0.3)',
            borderLeft: '3px solid var(--danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            marginBottom: beat.dmNote ? 16 : 0
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              ⚔ Encounter Stat Block
            </div>
            <StatBlockView statBlockId={beat.statBlockId} />
            {beat.type === 'combat' && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => launchEncounterByStatBlockId(beat.statBlockId)}
                  style={{
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: 'rgba(196,64,64,0.12)',
                    border: '1px solid rgba(196,64,64,0.45)',
                    borderRadius: 'var(--radius)',
                    color: '#d48060',
                    cursor: 'pointer'
                  }}
                >
                  Start This Encounter
                </button>
              </div>
            )}
          </div>
        ) : null}
        {beat.dmNote ? (
          <div style={{
            background: 'var(--rot-dim)',
            border: '1px solid var(--rot-mid)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            fontSize: 14,
            color: '#d4a080',
            lineHeight: 1.7
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--rot-bright)',
              display: 'block',
              marginBottom: 6
            }}>
              DM Note
            </span>
            {beat.dmNote}
          </div>
        ) : null}

        {/* Scene DM note (shown on first beat) */}
        {currentBeatIndex === 0 && scene.dmNote && (
          <div style={{
            marginTop: 16,
            background: 'rgba(40,50,36,0.5)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 6
            }}>
              Scene Note
            </span>
            {scene.dmNote}
          </div>
        )}
        {/* DM dice roller — always visible */}
        <DmDiceRoller />

        {/* Branch picker — shown on last beat of branching scenes */}
        {hasBranches && (
          <div style={{
            marginTop: 20,
            background: 'rgba(196,160,64,0.06)',
            border: '1px solid rgba(196,160,64,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px'
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12
            }}>
              ⤵ Scene Branch — Choose Path
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scene.branches.map((branch) => (
                <button key={branch.targetId} onClick={() => jumpToSceneById(branch.targetId)} style={{
                  textAlign: 'left', padding: '12px 16px',
                  background: 'rgba(196,160,64,0.08)',
                  border: '1px solid rgba(196,160,64,0.4)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--warning)', cursor: 'pointer',
                  transition: 'var(--transition)'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, letterSpacing: '0.03em' }}>
                    → {branch.label}
                  </div>
                  {branch.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {branch.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div style={{
        padding: '12px 28px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--bg-surface)'
      }}>
        <button
          onClick={prevBeat}
          disabled={currentSceneIndex === 0 && currentBeatIndex === 0}
          style={{
            padding: '8px 20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            letterSpacing: '0.04em'
          }}
        >
          ← Prev
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {(scene?.beats || []).map((_, i) => (
            <div key={i} style={{
              width: i === currentBeatIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === currentBeatIndex
                ? 'var(--green-bright)'
                : i < currentBeatIndex
                  ? 'var(--green-dim)'
                  : 'var(--border)',
              transition: 'all 0.2s ease'
            }} />
          ))}
        </div>

        <button
          onClick={nextBeat}
          disabled={isLastBeat && isLastScene}
          style={{
            padding: '8px 20px',
            background: isLastBeat ? 'var(--bg-card)' : 'var(--green-dim)',
            border: `1px solid ${isLastBeat ? 'var(--border)' : 'var(--green-mid)'}`,
            borderRadius: 'var(--radius)',
            color: isLastBeat ? 'var(--text-secondary)' : 'var(--green-bright)',
            fontSize: 13,
            letterSpacing: '0.04em'
          }}
        >
          {isLastBeat && isLastScene ? 'Session End' : isLastBeat ? 'Next Scene →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
