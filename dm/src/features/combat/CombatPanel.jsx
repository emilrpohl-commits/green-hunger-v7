import React, { useState, useEffect } from 'react'
import { useCombatStore } from '../../stores/combatStore'
import { decodeSavePrompt, applyDeterministicRollModifiers, getAcWithEffects } from '@shared/lib/combatRules.js'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { qaHoldSavePromptChannelName } from '@shared/lib/qaDevChannels.js'
import { encodePlayerSavePrompt, buildSavePromptDamageMeta } from '@shared/lib/combatRules.js'
import DmCombatCarousel from './DmCombatCarousel.jsx'

const CONDITIONS = ['Blinded', 'Charmed', 'Frightened', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Grappled', 'Paralysed']

// Debuffs / monster-oriented effects (DM applies to enemies)
const HOSTILE_SPELL_EFFECTS = [
  { name: 'Bane',           colour: '#a060c0', mechanic: '−1d4 attacks & saves',    concentration: true,  source: null },
  { name: 'Hex',            colour: '#8040a0', mechanic: '−1d4 ability checks',      concentration: true,  source: null },
  { name: 'Faerie Fire',    colour: '#80c0ff', mechanic: 'Advantage on attacks vs.', concentration: true,  source: null },
  { name: 'Guiding Bolt',   colour: '#ffd080', mechanic: 'Adv. on next attack vs.',  concentration: false, source: null },
  { name: 'Hold Person',    colour: '#c08040', mechanic: 'Paralysed, attacks crit',  concentration: true,  source: null },
  { name: 'Ray of Enfeeblement', colour: '#906040', mechanic: 'Half dmg STR attacks', concentration: true, source: null },
  { name: 'Hunter\'s Mark', colour: '#c04040', mechanic: '+1d6 damage from hunter',  concentration: true,  source: null },
  { name: 'Silvery Barbs',  colour: '#c0c0ff', mechanic: 'Reroll next success',      concentration: false, source: null },
  { name: 'Command',        colour: '#e0a040', mechanic: 'Obeying command',          concentration: false, source: null },
  { name: 'Charm',          colour: '#ff80a0', mechanic: 'Charmed by caster',        concentration: false, source: null },
]

// Buffs DM applies to PCs / Ilya (deterministic in shared/lib/combatRules.js)
const PC_BUFF_SPELL_EFFECTS = [
  { name: 'Bless',           colour: '#6080c0', mechanic: '+1d4 attacks & saves', concentration: true,  source: null },
  { name: 'Shield of Faith', colour: '#8090ff', mechanic: '+2 AC',                concentration: true,  source: null },
  { name: 'Guidance',        colour: '#90b070', mechanic: '+1d4 ability checks',  concentration: true,  source: null },
]

const HP_COLOUR = (pct, curHp) => {
  if (curHp === 0) return 'var(--danger)'
  if (pct > 60) return 'var(--green-bright)'
  if (pct > 30) return 'var(--warning)'
  return '#c46040'
}

function rollDie(sides) { return Math.floor(Math.random() * sides) + 1 }

function parseDmgString(str, crit = false) {
  const m = String(str).trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!m) { const n = parseInt(str) || 0; return { total: crit ? n * 2 : n, rolls: [] } }
  const count = (crit ? 2 : 1) * parseInt(m[1])
  const sides = parseInt(m[2])
  const mod = m[3] ? parseInt(m[3]) : 0
  const rolls = Array.from({ length: count }, () => rollDie(sides))
  return { total: rolls.reduce((a, b) => a + b, 0) + mod, rolls }
}

function parseDamageFromStatblock(text) {
  const raw = String(text || '')
  const m = raw.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i)
  if (!m) return null
  return m[1].replace(/\s+/g, '')
}

function CombatantCard({ combatant, isActive, flashActive = false, players = [] }) {
  const damageCombatant = useCombatStore(s => s.damageCombatant)
  const healCombatant = useCombatStore(s => s.healCombatant)
  const toggleCondition = useCombatStore(s => s.toggleCondition)
  const setInitiative = useCombatStore(s => s.setInitiative)
  const addEffect = useCombatStore(s => s.addEffect)
  const removeEffect = useCombatStore(s => s.removeEffect)
  const pushFeedEvent = useCombatStore(s => s.pushFeedEvent)
  const useCombatantActionType = useCombatStore(s => s.useCombatantActionType)

  const [amount, setAmount] = useState('')
  const [showConditions, setShowConditions] = useState(false)
  const [showEffects, setShowEffects] = useState(false)
  const [showAtk, setShowAtk] = useState(false)
  const [atkTarget, setAtkTarget] = useState(null)
  const [atkBonus, setAtkBonus] = useState(4)
  const [dmgInput, setDmgInput] = useState('2d4+2')
  const [atkResult, setAtkResult] = useState(null)
  const [monsterAction, setMonsterAction] = useState(null)

  const hpPct = combatant.maxHp > 0 ? (combatant.curHp / combatant.maxHp) * 100 : 0
  const hpColour = HP_COLOUR(hpPct, combatant.curHp)
  const isEnemy = combatant.type === 'enemy'
  const isPlayerCombatant = combatant.type === 'player'
  const isDead = combatant.curHp === 0 && isEnemy
  const effectPickerList = isEnemy ? HOSTILE_SPELL_EFFECTS : PC_BUFF_SPELL_EFFECTS
  const canPickEffects = (isEnemy && !isDead) || isPlayerCombatant
  const effects = combatant.effects || []
  const economy = combatant.actionEconomy || {}

  const applyDamage = () => {
    const val = parseInt(amount)
    if (!val || val <= 0) return
    damageCombatant(combatant.id, val)
    setAmount('')
  }

  const applyHeal = () => {
    const val = parseInt(amount)
    if (!val || val <= 0) return
    healCombatant(combatant.id, val)
    setAmount('')
  }

  const rollEnemyAttack = async () => {
    const selected = monsterAction || { toHit: atkBonus, damage: dmgInput, name: 'Attack', type: 'attack', actionType: 'action' }
    if (!atkTarget && selected.type !== 'special') return
    if (selected.actionType) {
      const ok = await useCombatantActionType(combatant.id, selected.actionType, selected.name)
      if (!ok) {
        pushFeedEvent(`${combatant.name} already used ${selected.actionType === 'bonus_action' ? 'bonus action' : selected.actionType} this turn.`, 'system', false)
        return
      }
    }
    if (selected.type === 'save') {
      const dc = selected.saveDC || 12
      const saveType = selected.saveType || 'DEX'
      pushFeedEvent(`${combatant.name} uses ${selected.name}: ${atkTarget?.name || 'target'} makes ${saveType} save (DC ${dc}).`, 'save-prompt', true)
      if (atkTarget?.id) {
        const sessionRunId = getSessionRunId()
        try {
          const primaryPayload = {
            session_id: sessionRunId,
            session_run_id: sessionRunId,
            round: useCombatStore.getState().round || 1,
            text: encodePlayerSavePrompt({
              sourceName: combatant.name,
              sourceId: combatant.id,
              actionName: selected.name,
              saveAbility: saveType,
              saveDc: dc,
              targetId: atkTarget.id,
              outcome: selected.effect || selected.desc || null,
              damageMeta: buildSavePromptDamageMeta(selected),
            }),
            type: 'player-save-prompt',
            target_id: atkTarget.id,
            shared: false,
            visibility: 'targeted',
            prompt_status: 'pending',
            timestamp: new Date().toISOString()
          }
          const { error } = await supabase.from('combat_feed').insert(primaryPayload)
          if (error) throw error
        } catch (e) {
          // Compatibility fallback for older schemas that may not yet include
          // visibility/prompt_status/session_run_id columns.
          try {
            const { error: legacyError } = await supabase.from('combat_feed').insert({
              session_id: sessionRunId,
              round: useCombatStore.getState().round || 1,
              text: encodePlayerSavePrompt({
                sourceName: combatant.name,
                sourceId: combatant.id,
                actionName: selected.name,
                saveAbility: saveType,
                saveDc: dc,
                targetId: atkTarget.id,
                outcome: selected.effect || selected.desc || null,
                damageMeta: buildSavePromptDamageMeta(selected),
              }),
              type: 'player-save-prompt',
              target_id: atkTarget.id,
              shared: false,
              timestamp: new Date().toISOString()
            })
            if (legacyError) throw legacyError
          } catch (legacyErr) {
            console.error('Failed to deliver player-save-prompt:', legacyErr)
          }
        }
      }
      setAtkResult({ hit: null, targetName: atkTarget?.name, total: dc, d20: null })
      return
    }
    if (selected.type === 'special') {
      pushFeedEvent(`${combatant.name} uses ${selected.name}. ${selected.desc || selected.effect || ''}`.trim(), 'action', true)
      setAtkResult({ hit: null, targetName: atkTarget?.name || '—', total: null, d20: null })
      return
    }
    const d20 = rollDie(20)
    const toHit = Number(selected.toHit ?? atkBonus) || 0
    const modded = applyDeterministicRollModifiers({ combatant, baseRoll: d20 + toHit, rollType: 'attack' })
    const total = modded.total
    const crit = d20 === 20
    const hit = crit || total >= getAcWithEffects(atkTarget)
    if (hit) {
      const damageExpr = parseDamageFromStatblock(selected.damage) || dmgInput
      const dmg = parseDmgString(damageExpr, crit)
      damageCombatant(atkTarget.id, dmg.total)
      const critStr = crit ? ' CRIT!' : ''
      const modsStr = modded.applied.length > 0 ? ` (${modded.applied.map(m => `${m.source}${m.op}${m.roll}`).join(', ')})` : ''
      pushFeedEvent(`${combatant.name} uses ${selected.name} on ${atkTarget.name}${critStr}: d20(${d20}) + ${toHit}${modsStr} = ${total} → HIT! ${dmg.total} damage`, 'damage', true)
      setAtkResult({ hit: true, d20, total, crit, dmgTotal: dmg.total, targetName: atkTarget.name })
    } else {
      const modsStr = modded.applied.length > 0 ? ` (${modded.applied.map(m => `${m.source}${m.op}${m.roll}`).join(', ')})` : ''
      pushFeedEvent(`${combatant.name} uses ${selected.name} on ${atkTarget.name}: d20(${d20}) + ${toHit}${modsStr} = ${total} vs AC ${getAcWithEffects(atkTarget)} → MISS`, 'roll', true)
      setAtkResult({ hit: false, d20, total, targetName: atkTarget.name })
    }
  }

  const portraitSrc = combatant.image
    ? (isEnemy
      ? combatant.image
      : `https://emilrpohl-commits.github.io/greenhunger-players/characters/${combatant.image}`)
    : null

  return (
    <div style={{
      background: isActive ? 'rgba(122,184,106,0.06)' : isDead ? 'rgba(196,64,64,0.04)' : 'var(--bg-card)',
      border: `1px solid ${isActive ? 'var(--green-dim)' : 'var(--border)'}`,
      borderTop: `3px solid ${isActive ? 'var(--green-bright)' : isDead ? 'var(--danger)' : isEnemy ? 'var(--rot-mid)' : 'var(--green-dim)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      opacity: isDead ? 0.5 : 1,
      transition: 'all 0.2s ease',
      boxShadow: flashActive ? `0 0 0 2px rgba(122,184,106,0.4), 0 0 24px rgba(122,184,106,0.35)` : 'none',
    }}>

      {/* ── Portrait header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
      }}>
        {/* Portrait thumbnail */}
        <div style={{
          width: 64,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          background: `${isEnemy ? 'rgba(122,64,32,0.25)' : 'rgba(32,64,24,0.25)'}`,
        }}>
          {portraitSrc ? (
            <img
              src={portraitSrc}
              alt={combatant.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
              }}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 22,
              color: isEnemy ? 'var(--rot-mid)' : 'var(--green-mid)',
            }}>
              {combatant.name[0]}
            </div>
          )}
          {/* Subtle overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, transparent 60%, rgba(10,12,10,0.6) 100%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Identity + stats */}
        <div style={{
          flex: 1,
          padding: '10px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 0,
        }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{
                fontFamily: isEnemy ? 'var(--font-body)' : 'var(--font-display)',
                fontSize: isEnemy ? 14 : 13,
                fontWeight: isEnemy ? 400 : 600,
                color: isEnemy ? '#d49070' : 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {combatant.name}
              </span>
              {isActive && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7,
                  color: 'var(--green-bright)',
                  background: 'rgba(122,184,106,0.15)',
                  border: '1px solid rgba(122,184,106,0.3)',
                  borderRadius: 'var(--radius)',
                  padding: '1px 4px',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  ▶ Active
                </span>
              )}
              {combatant.concentration && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7,
                  color: 'var(--warning)',
                  border: '1px solid rgba(196,160,64,0.35)',
                  borderRadius: 'var(--radius)',
                  padding: '1px 4px',
                  flexShrink: 0,
                }}>
                  ◈
                </span>
              )}
            </div>

            {/* HP number */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 600,
                color: hpColour,
                lineHeight: 1,
              }}>
                {combatant.curHp}
                {combatant.tempHp > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--info)' }}>+{combatant.tempHp}</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                / {combatant.maxHp}
              </div>
            </div>
          </div>

          {/* Meta: AC + conditions */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <span>AC {combatant.ac}</span>
            {combatant.conditions?.map(c => (
              <span key={c} style={{ color: 'var(--warning)', fontSize: 9 }}>{c}</span>
            ))}
          </div>

          {/* Initiative input + action economy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Initiative */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Init</span>
              <input
                type="number"
                value={combatant.initiative}
                onChange={e => setInitiative(combatant.id, e.target.value)}
                style={{
                  width: 36, height: 22, textAlign: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                  background: isActive ? 'var(--green-dim)' : 'var(--bg-raised)',
                  border: `1px solid ${isActive ? 'var(--green-mid)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: isActive ? 'var(--green-bright)' : 'var(--text-secondary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action economy chips */}
            {[
              { label: 'A', ready: economy.actionAvailable },
              { label: 'BA', ready: economy.bonusActionAvailable },
              { label: 'R', ready: economy.reactionAvailable },
            ].map(({ label, ready }) => (
              <span key={label} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                padding: '1px 6px',
                border: `1px solid ${ready ? 'var(--green-dim)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: ready ? 'var(--green-bright)' : 'var(--danger)',
                background: ready ? 'rgba(74,122,66,0.15)' : 'transparent',
              }}>
                {label} {ready ? '●' : '○'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ height: 4, background: 'var(--bg-raised)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${hpPct}%`, background: hpColour, transition: 'width 0.4s ease' }} />
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 14px' }}>

      {/* Active spell effects */}
      {effects.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {effects.map(eff => (
            <div key={eff.name} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px',
              background: `${eff.colour}18`,
              border: `1px solid ${eff.colour}50`,
              borderRadius: 'var(--radius)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: eff.colour, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {eff.name}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                {eff.mechanic}
              </span>
              {eff.concentration && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--warning)', marginLeft: 2 }}>●</span>
              )}
              <button
                onClick={() => removeEffect(combatant.id, eff.name)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '0 2px', lineHeight: 1 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyDamage()}
          placeholder="Amt"
          min="0"
          style={{
            width: 60, padding: '5px 8px',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none'
          }}
        />
        <button onClick={applyDamage} style={{ padding: '5px 12px', fontSize: 12, background: 'rgba(196,64,64,0.12)', border: '1px solid rgba(196,64,64,0.35)', borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer' }}>
          − DMG
        </button>
        <button onClick={applyHeal} style={{ padding: '5px 12px', fontSize: 12, background: 'rgba(122,184,106,0.08)', border: '1px solid rgba(122,184,106,0.3)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer' }}>
          + Heal
        </button>
        <div style={{ display: 'flex', gap: 3 }}>
          {[2, 4, 5, 6, 8, 10].map(n => (
            <button key={n} onClick={() => damageCombatant(combatant.id, n)} style={{
              padding: '3px 6px', fontSize: 10, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer'
            }}>-{n}</button>
          ))}
        </div>
      </div>

      {/* Enemy attack roller */}
      {isEnemy && !isDead && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => { setShowAtk(!showAtk); setAtkResult(null) }}
            style={{ padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', background: showAtk ? 'rgba(196,64,64,0.15)' : 'transparent', border: '1px solid rgba(196,64,64,0.4)', borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer' }}
          >
            ⚔ Attack
          </button>
          {showAtk && (
            <div style={{ marginTop: 6, padding: '10px 12px', background: 'rgba(196,64,64,0.05)', border: '1px solid rgba(196,64,64,0.2)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {(combatant.actionOptions || []).map((a) => (
                  <button
                    key={`${a.actionType || 'action'}-${a.name}`}
                    onClick={() => {
                      setMonsterAction(a)
                      const parsed = parseDamageFromStatblock(a.damage)
                      if (parsed) setDmgInput(parsed)
                      setAtkBonus(Number(a.toHit || 0))
                    }}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      background: monsterAction?.name === a.name ? 'rgba(196,160,64,0.18)' : 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: monsterAction?.name === a.name ? 'var(--warning)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {a.name} [{a.actionType === 'bonus_action' ? 'BA' : a.actionType === 'reaction' ? 'R' : 'A'}]
                  </button>
                ))}
                {players.filter(p => p.curHp > 0).map(p => (
                  <button key={p.id} onClick={() => setAtkTarget(p)} style={{
                    padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: atkTarget?.id === p.id ? 'rgba(196,64,64,0.15)' : 'transparent',
                    border: `1px solid ${atkTarget?.id === p.id ? 'rgba(196,64,64,0.6)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', color: atkTarget?.id === p.id ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer'
                  }}>{p.name} (AC {p.ac})</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>To Hit</span>
                <input type="number" value={atkBonus} onChange={e => setAtkBonus(parseInt(e.target.value) || 0)} style={{ width: 46, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Damage</span>
                <input value={dmgInput} onChange={e => setDmgInput(e.target.value)} placeholder="2d4+2" style={{ width: 72, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} />
                <button onClick={rollEnemyAttack} disabled={!atkTarget} style={{ padding: '4px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', background: atkTarget ? 'rgba(196,64,64,0.2)' : 'transparent', border: '1px solid rgba(196,64,64,0.4)', borderRadius: 'var(--radius)', color: atkTarget ? 'var(--danger)' : 'var(--text-muted)', cursor: atkTarget ? 'pointer' : 'not-allowed' }}>
                  Roll
                </button>
              </div>
              {atkResult && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: atkResult.hit ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {atkResult.hit
                    ? `${atkResult.crit ? 'CRIT! ' : 'HIT! '}d20(${atkResult.d20}) = ${atkResult.total} → ${atkResult.dmgTotal} dmg to ${atkResult.targetName}`
                    : `MISS — d20(${atkResult.d20}) = ${atkResult.total} vs ${atkResult.targetName}`
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conditions + Effects row */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
        {combatant.conditions?.map(cond => (
          <span key={cond} onClick={() => toggleCondition(combatant.id, cond)} style={{
            padding: '2px 7px', fontSize: 10, background: 'rgba(196,160,64,0.12)', border: '1px solid rgba(196,160,64,0.3)',
            borderRadius: 'var(--radius)', color: 'var(--warning)', cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {cond} ×
          </span>
        ))}
        <button onClick={() => { setShowConditions(!showConditions); setShowEffects(false) }} style={{
          padding: '2px 7px', fontSize: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer'
        }}>+ condition</button>
        {canPickEffects && (
          <button onClick={() => { setShowEffects(!showEffects); setShowConditions(false) }} style={{
            padding: '2px 7px', fontSize: 10, background: 'transparent', border: '1px solid rgba(160,96,192,0.35)', borderRadius: 'var(--radius)', color: '#a060c0', cursor: 'pointer'
          }}>✦ effect</button>
        )}

        {showConditions && (
          <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap', padding: '8px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 320 }}>
            {CONDITIONS.map(cond => (
              <button key={cond} onClick={() => { toggleCondition(combatant.id, cond); setShowConditions(false) }} style={{
                padding: '3px 8px', fontSize: 11,
                background: combatant.conditions?.includes(cond) ? 'rgba(196,160,64,0.2)' : 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                color: combatant.conditions?.includes(cond) ? 'var(--warning)' : 'var(--text-secondary)', cursor: 'pointer'
              }}>{cond}</button>
            ))}
          </div>
        )}

        {showEffects && (
          <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 4, padding: '10px 12px', background: 'var(--bg-raised)', border: '1px solid rgba(160,96,192,0.3)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: 280 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{isEnemy ? 'Apply Spell Effect' : 'Apply Buff (PC)'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {effectPickerList.map(eff => {
                const already = effects.find(e => e.name === eff.name)
                return (
                  <div key={eff.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: eff.colour }}>{eff.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{eff.mechanic}</span>
                      {eff.concentration && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--warning)', marginLeft: 5 }}>CONC</span>}
                    </div>
                    {already
                      ? <button onClick={() => { removeEffect(combatant.id, eff.name); setShowEffects(false) }} style={{ padding: '2px 8px', fontSize: 10, background: 'transparent', border: `1px solid ${eff.colour}50`, borderRadius: 'var(--radius)', color: eff.colour, cursor: 'pointer' }}>Remove</button>
                      : <button onClick={() => { addEffect(combatant.id, { ...eff }); setShowEffects(false) }} style={{ padding: '2px 8px', fontSize: 10, background: `${eff.colour}18`, border: `1px solid ${eff.colour}50`, borderRadius: 'var(--radius)', color: eff.colour, cursor: 'pointer' }}>Apply</button>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default function CombatPanel() {
  const active = useCombatStore(s => s.active)
  const round = useCombatStore(s => s.round)
  const combatants = useCombatStore(s => s.combatants)
  const activeCombatantIndex = useCombatStore(s => s.activeCombatantIndex)
  const feed = useCombatStore(s => s.feed)
  const nextTurn = useCombatStore(s => s.nextTurn)
  const prevTurn = useCombatStore(s => s.prevTurn)
  const sortInitiative = useCombatStore(s => s.sortInitiative)
  const endCombat = useCombatStore(s => s.endCombat)
  const initiativePhase = useCombatStore(s => s.initiativePhase)
  const setInitiative = useCombatStore(s => s.setInitiative)
  const savePrompts = useCombatStore(s => s.savePrompts)
  const resolveSavePrompt = useCombatStore(s => s.resolveSavePrompt)

  const [logOpen, setLogOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'carousel'
  const [flashActiveIndex, setFlashActiveIndex] = useState(activeCombatantIndex)
  const [manualSaveTotals, setManualSaveTotals] = useState({})
  const [qaHoldSavePrompt, setQaHoldSavePrompt] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    const sessionRunId = getSessionRunId()
    const channel = supabase.channel(qaHoldSavePromptChannelName(sessionRunId), {
      config: {
        presence: {
          key: 'dm-qa-hold-save-prompt',
        },
      },
    })
    let cancelled = false
    channel.subscribe(async (status) => {
      if (cancelled || status !== 'SUBSCRIBED') return
      await channel.track({
        role: 'dm-qa-hold-save-prompt',
        holdSavePrompt: qaHoldSavePrompt,
      })
    })
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [qaHoldSavePrompt])

  React.useEffect(() => {
    setFlashActiveIndex(activeCombatantIndex)
    const t = setTimeout(() => setFlashActiveIndex(-1), 1200)
    return () => clearTimeout(t)
  }, [activeCombatantIndex])

  const activeCombatant = combatants[activeCombatantIndex]
  const nextCombatant = combatants[(activeCombatantIndex + 1) % Math.max(combatants.length, 1)]
  const players = combatants.filter(c => c.type === 'player')
  const enemies = combatants.filter(c => c.type === 'enemy')

  return (
    <div style={{ gridArea: 'main', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-deep)' }}>

      {/* Combat header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'rgba(196,64,64,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--danger)', letterSpacing: '0.08em' }}>COMBAT</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>Round {round}</span>
          {activeCombatant && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>— {activeCombatant.name}'s turn</span>
          )}
          {nextCombatant && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Next: {nextCombatant.name}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {import.meta.env.DEV && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={qaHoldSavePrompt}
                onChange={(e) => setQaHoldSavePrompt(e.target.checked)}
              />
              Hold save prompts (QA)
            </label>
          )}
          <button onClick={() => setViewMode(m => m === 'grid' ? 'carousel' : 'grid')} style={{
            padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
            background: viewMode === 'carousel' ? 'rgba(176,144,64,0.15)' : 'var(--bg-card)',
            border: `1px solid ${viewMode === 'carousel' ? 'rgba(176,144,64,0.5)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', color: viewMode === 'carousel' ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {viewMode === 'carousel' ? '⊞ Grid' : '⊟ Carousel'}
          </button>
          <button onClick={() => setLogOpen(o => !o)} style={{
            padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
            background: logOpen ? 'rgba(122,184,106,0.1)' : 'var(--bg-card)',
            border: `1px solid ${logOpen ? 'var(--green-mid)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', color: logOpen ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {logOpen ? '▶ Hide Log' : '◀ Log'}
          </button>
          <button onClick={sortInitiative} style={{ padding: '6px 12px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Sort Init
          </button>
          <button onClick={prevTurn} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            ← Prev
          </button>
          <button onClick={nextTurn} style={{ padding: '6px 20px', fontSize: 12, background: 'var(--green-dim)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            Next →
          </button>
          <button onClick={endCombat} style={{ padding: '6px 10px', fontSize: 11, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            End
          </button>
        </div>
      </div>

      {/* Initiative phase banner */}
      {initiativePhase && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(196,160,64,0.08)',
          borderBottom: '1px solid rgba(196,160,64,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Initiative Phase
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              — players are rolling. Set enemy initiatives, then Sort Init to begin.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Quick enemy initiative rollers */}
            {combatants.filter(c => c.type === 'enemy').map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{e.name.replace(/ \d+$/, '')}:</span>
                <button onClick={() => {
                  const roll = Math.floor(Math.random() * 20) + 1 + 2
                  setInitiative(e.id, roll)
                }} style={{
                  padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                  background: e.initiativeSet ? 'rgba(196,160,64,0.15)' : 'transparent',
                  border: '1px solid rgba(196,160,64,0.4)', borderRadius: 'var(--radius)',
                  color: e.initiativeSet ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer'
                }}>
                  {e.initiativeSet ? `${e.initiative} ↺` : 'Roll'}
                </button>
              </div>
            ))}
            <button onClick={sortInitiative} style={{
              padding: '5px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'rgba(196,160,64,0.2)', border: '1px solid rgba(196,160,64,0.5)',
              borderRadius: 'var(--radius)', color: 'var(--warning)', cursor: 'pointer',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Begin →
            </button>
          </div>
        </div>
      )}

      {savePrompts.filter(p => !p.resolved).length > 0 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(196,160,64,0.25)', background: 'rgba(196,160,64,0.08)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Pending Save Prompts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savePrompts.filter(p => !p.resolved).slice(0, 4).map((prompt) => (
              <div key={prompt.promptId} style={{ background: 'var(--bg-card)', border: '1px solid rgba(196,160,64,0.4)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  <strong>{prompt.casterName}</strong> casts <strong>{prompt.spellName}</strong> — {prompt.saveAbility} save DC {prompt.saveDc}
                </div>
                {prompt.damage && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    Fail: {prompt.damage.amount} {prompt.damage.type || ''} damage · Success: {prompt.damage.halfOnSuccess ? 'half damage' : 'no damage'}
                  </div>
                )}
                {prompt.effect?.name && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    On fail effect: {prompt.effect.name}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {(prompt.targets || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', minWidth: 120 }}>{t.name}</span>
                      <button
                        onClick={() => resolveSavePrompt({ prompt, targetId: t.id, mode: 'roll' })}
                        style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        Roll Save
                      </button>
                      <input
                        type="number"
                        value={manualSaveTotals[`${prompt.promptId}:${t.id}`] || ''}
                        onChange={(e) => setManualSaveTotals(s => ({ ...s, [`${prompt.promptId}:${t.id}`]: e.target.value }))}
                        placeholder="Manual total"
                        style={{ width: 96, padding: '3px 6px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
                      />
                      <button
                        onClick={() => resolveSavePrompt({ prompt, targetId: t.id, mode: 'manual', manualTotal: manualSaveTotals[`${prompt.promptId}:${t.id}`] })}
                        style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(122,184,106,0.1)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer' }}
                      >
                        Apply Manual
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {viewMode === 'carousel' ? (
          <DmCombatCarousel feed={feed} logOpen={logOpen} />
        ) : (
          <>
            {/* Combatant columns */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', gap: 16 }}>

              {/* Players */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Players</div>
                {players.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <CombatantCard combatant={c} isActive={combatants.indexOf(c) === activeCombatantIndex} flashActive={combatants.indexOf(c) === flashActiveIndex} />
                  </div>
                ))}
              </div>

              {/* Enemies */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#c48060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Enemies</div>
                {enemies.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <CombatantCard combatant={c} isActive={combatants.indexOf(c) === activeCombatantIndex} flashActive={combatants.indexOf(c) === flashActiveIndex} players={players} />
                  </div>
                ))}
              </div>
            </div>

            {/* Combat log — collapsible sidebar */}
            {logOpen && (
              <div style={{
                width: 220, borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
              }}>
                <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Combat Log
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {feed.filter(e => e.type !== 'player-save-prompt').map(event => (
                    <div key={event.id} style={{
                      fontSize: event.type === 'round' ? 9 : 12,
                      fontFamily: event.type === 'round' ? 'var(--font-mono)' : 'var(--font-body)',
                      color: event.type === 'damage' ? '#c49070'
                        : event.type === 'heal' ? 'var(--green-bright)'
                        : event.type === 'save-prompt' ? 'var(--warning)'
                        : event.type === 'round' ? 'var(--text-muted)'
                        : event.type === 'system' ? 'var(--warning)'
                        : 'var(--text-secondary)',
                      borderTop: event.type === 'round' ? '1px solid var(--border)' : 'none',
                      paddingTop: event.type === 'round' ? 5 : 0,
                      marginTop: event.type === 'round' ? 3 : 0,
                      display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.4
                    }}>
                      {event.shared && <span style={{ fontSize: 5, color: 'var(--green-dim)', marginTop: 4, flexShrink: 0 }}>●</span>}
                      {event.type === 'save-prompt' ? (() => {
                        const p = decodeSavePrompt(event.text)
                        if (!p) return event.text
                        return `${p.casterName} casts ${p.spellName}: ${p.saveAbility} save DC ${p.saveDc} (${(p.targets || []).map(t => t.name).join(', ')})`
                      })() : event.type === 'save-prompt-resolved' ? (() => {
                        const p = decodeSavePrompt(event.text)
                        return p?.resolutionText || event.text
                      })() : event.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
