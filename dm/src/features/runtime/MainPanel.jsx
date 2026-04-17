import React, { useEffect, useMemo, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useCombatStore } from '../../stores/combatStore'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { rosterToDmTargetOptions } from '@shared/lib/partyRoster.js'
import { BEAT_TYPE_LABELS, BEAT_TYPE_STYLES } from '@shared/lib/constants.js'
import StatBlockView from '../statblocks/StatBlockView'
import SceneBackdrop from '../../components/SceneBackdrop.jsx'
import DiceInlineText from '@shared/components/combat/DiceInlineText.jsx'
import { sanitizeUserText } from '@shared/lib/sanitizeUserText.js'
import { createDmDiceRollHandler } from '@shared/lib/diceText/dispatch.js'
import QuickDiceRoller from '@shared/components/combat/QuickDiceRoller.jsx'
import { MAX_QUICK_DICE_COUNT, MIN_QUICK_DICE_COUNT } from '@shared/lib/combat/quickDiceRollerConstants.js'

const BEAT_TYPE_LABEL = {
  ...BEAT_TYPE_LABELS,
  check: 'SKILL CHECK',
}

const BEAT_TYPE_STYLE = { ...BEAT_TYPE_STYLES }

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
  const damageCombatant = useCombatStore((s) => s.damageCombatant)
  const healCombatant = useCombatStore((s) => s.healCombatant)
  const combatants = useCombatStore((s) => s.combatants)
  const dmRollTargets = useMemo(
    () => [...rosterToDmTargetOptions(roster), { id: 'all', name: 'All Players' }],
    [roster]
  )
  const [die, setDie] = useState(20)
  const [diceCount, setDiceCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [target, setTarget] = useState('all')
  const [damageType, setDamageType] = useState('fire')
  const [effectKind, setEffectKind] = useState('damage')
  const [mode, setMode] = useState('roll_only')
  const [d20Mode, setD20Mode] = useState('normal')
  const [lastRoll, setLastRoll] = useState(null)
  const canApplyToTarget = target !== 'all'

  useEffect(() => {
    if (!canApplyToTarget && mode !== 'roll_only') setMode('roll_only')
  }, [canApplyToTarget, mode])

  useEffect(() => {
    if (effectKind === 'check' && mode !== 'roll_only') setMode('roll_only')
  }, [effectKind, mode])

  useEffect(() => {
    if (die === 20 && d20Mode !== 'normal') setDiceCount(1)
  }, [die, d20Mode])

  const roll = async () => {
    const sessionRunId = getSessionRunId()
    const targetLabel = dmRollTargets.find(c => c.id === target)?.name || 'All Players'
    const applying = mode === 'roll_apply' && canApplyToTarget && effectKind !== 'check'
    const typeLabel = effectKind === 'damage' && damageType ? ` (${damageType})` : ''

    const nPool = Math.min(MAX_QUICK_DICE_COUNT, Math.max(MIN_QUICK_DICE_COUNT, Number(diceCount) || 1))

    let rollA = null
    let rollB = null
    let picked = null
    let rollDescriptor = ''
    const individualRolls = []

    if (die === 20 && d20Mode !== 'normal') {
      rollA = Math.floor(Math.random() * 20) + 1
      rollB = Math.floor(Math.random() * 20) + 1
      const keepHigh = d20Mode === 'advantage'
      picked = keepHigh ? Math.max(rollA, rollB) : Math.min(rollA, rollB)
      rollDescriptor = `d20(${rollA},${rollB}) keep ${keepHigh ? 'high' : 'low'} ${picked}`
    } else {
      for (let i = 0; i < nPool; i += 1) {
        individualRolls.push(Math.floor(Math.random() * die) + 1)
      }
      picked = individualRolls.reduce((a, b) => a + b, 0)
      rollDescriptor = nPool === 1
        ? `d${die}(${individualRolls[0]})`
        : `${nPool}d${die}(${individualRolls.join('+')}=${picked})`
    }

    let crit = false
    let fumble = false
    if (die === 20 && d20Mode !== 'normal') {
      crit = picked === 20
      fumble = picked === 1
    } else if (die === 20 && nPool === 1) {
      crit = individualRolls[0] === 20
      fumble = individualRolls[0] === 1
    }

    const total = picked + modifier
    const modStr = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` − ${Math.abs(modifier)}` : ''
    const totalLabel = modifier !== 0 ? ` = ${total}` : ''
    const text = applying
      ? effectKind === 'heal'
        ? `DM rolls ${rollDescriptor}${modStr}${totalLabel} -> heals ${targetLabel} for ${total}`
        : `DM rolls ${rollDescriptor}${modStr}${totalLabel}${typeLabel} -> applied to ${targetLabel}`
      : `DM rolls ${rollDescriptor}${modStr}${totalLabel}${typeLabel}${target !== 'all' ? ` (for ${targetLabel})` : ''}`

    setLastRoll({
      result: picked,
      total,
      die,
      diceCount: nPool,
      effectKind,
      damageType: effectKind === 'damage' ? damageType : null,
      d20Mode: die === 20 ? d20Mode : 'normal',
      rollA,
      rollB,
      crit,
      fumble,
    })

    if (applying) {
      const targetCombatant = (combatants || []).find((c) => c.id === target)
      if (targetCombatant) {
        if (effectKind === 'heal') {
          await healCombatant(target, total)
        } else {
          await damageCombatant(target, total, null, {
            components: [{ amount: Math.max(0, total), type: damageType }],
          })
        }
      }
    }
    try {
      await supabase.from('combat_feed').insert({
        session_id: sessionRunId,
        round: 0,
        text,
        type: 'dm-roll',
        shared: target === 'all',
        visibility: target === 'all' ? 'player_visible' : 'targeted',
        target_id: target,
        metadata: {
          kind: 'dm_roll',
          effect_kind: effectKind,
          damage_type: effectKind === 'damage' ? damageType : null,
          apply_damage: applying && effectKind === 'damage',
          apply_heal: applying && effectKind === 'heal',
          dice_count: die === 20 && d20Mode !== 'normal' ? 2 : nPool,
          d20_mode: die === 20 ? d20Mode : 'normal',
          roll_a: rollA,
          roll_b: rollB,
        },
        timestamp: new Date().toISOString()
      })
    } catch (e) {}
  }

  return (
    <QuickDiceRoller
      title="DM Roll → Players"
      die={die}
      diceCount={diceCount}
      modifier={modifier}
      target={target}
      damageType={damageType}
      mode={mode}
      effectKind={effectKind}
      d20Mode={d20Mode}
      targets={dmRollTargets}
      canApplyToTarget={canApplyToTarget}
      lastRoll={lastRoll}
      layout="dm"
      onDieChange={setDie}
      onDiceCountChange={setDiceCount}
      onModifierChange={setModifier}
      onTargetChange={setTarget}
      onDamageTypeChange={setDamageType}
      onModeChange={setMode}
      onEffectKindChange={setEffectKind}
      onD20ModeChange={setD20Mode}
      onRoll={roll}
    />
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
  const pushFeedEvent = useCombatStore(s => s.pushFeedEvent)

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
  const handleInlineRoll = createDmDiceRollHandler({
    pushFeedEvent,
    type: 'roll',
    shared: true,
    defaultContextLabel: beat.title || scene.title || 'Session text',
  })

  return (
    <div style={{
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-deep)',
      position: 'relative',
    }}
    >
      <SceneBackdrop imageUrlOrPath={scene.image_url} transitionKey={scene.id} />
      {/* Scene header — tier 1 */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        background: scene.image_url ? 'rgba(10, 14, 12, 0.88)' : 'var(--bg-deep)',
        backdropFilter: scene.image_url ? 'blur(8px)' : 'none',
      }}
      >
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
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.06em',
          textShadow: scene.image_url ? '0 1px 12px rgba(0,0,0,0.65)' : 'none',
        }}
        >
          {sanitizeUserText(scene.title)}
        </h1>
        <div style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          marginTop: 2
        }}>
          {sanitizeUserText(scene.subtitle)}
        </div>
      </div>

      {/* Beat content — tier 2 narrative; dm notes tier 3 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px 28px',
        position: 'relative',
        zIndex: 1,
      }}
      >

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
          fontSize: 19,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 12,
          letterSpacing: '0.04em',
          textShadow: scene.image_url ? '0 1px 10px rgba(0,0,0,0.5)' : 'none',
        }}
        >
          {sanitizeUserText(beat.title)}
        </h2>

        {beat.flavour_text && (
          <DiceInlineText
            text={beat.flavour_text}
            contextLabel={`${beat.title}: flavour`}
            onRoll={handleInlineRoll}
            style={{
            margin: '0 0 16px',
            fontSize: 14,
            lineHeight: 1.65,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            opacity: 0.88,
            maxWidth: 720,
            display: 'block',
          }}
          />
        )}

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
          <DiceInlineText
            text={beat.content}
            contextLabel={`${beat.title}: content`}
            onRoll={handleInlineRoll}
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--text-primary)',
              fontStyle: 'italic',
            }}
          />
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
        ) : beat.inlineStatBlock ? (
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
            <StatBlockView data={beat.inlineStatBlock} />
          </div>
        ) : null}
        {beat.dmNote ? (
          <div style={{
            background: 'var(--rot-dim)',
            border: '1px solid var(--rot-mid)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            fontSize: 13,
            color: '#d4a080',
            lineHeight: 1.7,
            opacity: 0.92,
          }}
          >
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
            <DiceInlineText
              text={beat.dmNote}
              contextLabel={`${beat.title}: DM note`}
              onRoll={handleInlineRoll}
              style={{ fontSize: 13, color: '#d4a080', lineHeight: 1.7, opacity: 0.92 }}
            />
          </div>
        ) : null}

        {/* Scene DM note (shown on first beat) */}
        {currentBeatIndex === 0 && scene.dmNote && (
          <div style={{
            marginTop: 16,
            background: 'rgba(40,50,36,0.45)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            opacity: 0.85,
          }}
          >
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
            <DiceInlineText
              text={scene.dmNote}
              contextLabel={`${scene.title}: scene note`}
              onRoll={handleInlineRoll}
              style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, opacity: 0.85 }}
            />
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
                    → {sanitizeUserText(branch.label)}
                  </div>
                  {branch.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {sanitizeUserText(branch.description)}
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
