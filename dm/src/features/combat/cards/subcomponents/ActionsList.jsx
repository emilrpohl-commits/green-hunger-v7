import React, { useState } from 'react'
import { useCombatStore } from '../../../../stores/combatStore.js'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import {
  applyDeterministicRollModifiers,
  getAcWithEffects,
  encodePlayerSavePrompt,
  buildSavePromptDamageMeta,
} from '@shared/lib/combatRules.js'
import { rollDie, parseDmgString, parseDamageFromStatblock } from '../constants.js'
import { primaryDamageTypeFromAction } from '@shared/lib/rules/damagePipeline.js'
import { formatDcWithLabel } from '@shared/lib/rules/dcDisplay.js'
import { playDmSfx } from '@shared/lib/sfxEngine.js'
import { shouldForceCriticalOnHit } from '@shared/lib/rules/criticalConditionRules.js'
import {
  adaptMonsterAction,
  monsterActionToHit,
  primaryTypeFromAdaptedDamage,
} from '@shared/lib/combat/monsterActionAdapter.js'
import DiceRichText from '@shared/components/combat/DiceRichText.jsx'
import { createDmDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

/**
 * ActionsList
 *
 * Two modes:
 *   inline (default) — action buttons always visible as a horizontal strip.
 *     When one is selected and a target is chosen, roll UI appears inline.
 *   popover — wrapped inside a "⚔ Attack ▾" toggle (original behaviour,
 *     used when vertical space is very limited, e.g. FocusedCard Actions tab).
 *
 * Pass `mode="popover"` to get the old collapsed panel.
 */
export default function ActionsList({ combatant, players = [], mode = 'inline' }) {
  function inferAttackRange(action) {
    const range = String(action?.range || action?.distance || '')
    const name = String(action?.name || '')
    if (/ranged|range\s*\(|\d+\/\d+\s*ft/i.test(range)) return 'ranged'
    if (/\bbow\b|\bcrossbow\b|\bdart\b|\bsling\b|\bjavelin\b|\bneedle\b|\bbolt\b/i.test(name)) return 'ranged'
    return 'melee'
  }

  const useCombatantActionType = useCombatStore(s => s.useCombatantActionType)
  const pushFeedEvent          = useCombatStore(s => s.pushFeedEvent)
  const damageCombatant        = useCombatStore(s => s.damageCombatant)

  const [open, setOpen]             = useState(mode === 'inline')
  const [monsterAction, setMonsterAction] = useState(null)
  const [atkTarget, setAtkTarget]   = useState(null)
  const [atkBonus, setAtkBonus]     = useState(4)
  const [dmgInput, setDmgInput]     = useState('2d4+2')
  const [atkResult, setAtkResult]   = useState(null)
  const handleInlineRoll = createDmDiceRollHandler({
    pushFeedEvent,
    type: 'roll',
    shared: true,
    defaultContextLabel: `${combatant.name}: ${monsterAction?.name || 'Action'}`,
  })

  const isEnemy = combatant.type === 'enemy'
  const isDead  = combatant.curHp === 0 && isEnemy

  if (!isEnemy || isDead) return null

  function selectAction(a) {
    setMonsterAction(prev => prev?.name === a.name ? null : a)
    const p = parseDamageFromStatblock(a.damage)
    if (p) setDmgInput(p)
    const hit = monsterActionToHit(a)
    setAtkBonus(hit != null ? hit : 0)
    setAtkResult(null)
  }

  async function rollEnemyAttack() {
    const selected = monsterAction || {
      toHit: atkBonus, damage: dmgInput, name: 'Attack', type: 'attack', actionType: 'action',
    }
    const adapted = adaptMonsterAction(selected)
    const needsTarget = adapted.actionKind !== 'special' && adapted.actionKind !== 'trait' && adapted.actionKind !== 'other'
    if (!atkTarget && needsTarget) return

    if (selected.actionType) {
      const ok = await useCombatantActionType(combatant.id, selected.actionType, selected.name)
      if (!ok) {
        pushFeedEvent(
          `${combatant.name} already used ${selected.actionType === 'bonus_action' ? 'bonus action' : selected.actionType} this turn.`,
          'system', false,
        )
        return
      }
    }

    if (adapted.actionKind === 'save') {
      const dcMissing = adapted.saveDC == null
      const dc       = adapted.saveDC ?? 10
      const saveType = adapted.saveType || 'DEX'
      const dcLabel = formatDcWithLabel(dc)
      if (dcMissing) {
        pushFeedEvent(`[System] ${selected.name}: save DC missing, fallback to DC 10`, 'system', false)
      }
      pushFeedEvent(
        `${combatant.name} uses ${selected.name}: ${atkTarget?.name || 'target'} makes ${saveType} save (${dcLabel || `DC ${dc}`}).`,
        'save-prompt', true,
      )
      if (atkTarget?.id) {
        const sessionRunId = getSessionRunId()
        const payload = encodePlayerSavePrompt({
          sourceName: combatant.name, sourceId: combatant.id,
          actionName: selected.name, saveAbility: saveType,
          saveDc: dc, targetId: atkTarget.id,
          outcome: selected.effect || selected.desc || null,
          damageMeta: buildSavePromptDamageMeta(selected),
        })
        try {
          const { error } = await supabase.from('combat_feed').insert({
            session_id: sessionRunId, session_run_id: sessionRunId,
            round: useCombatStore.getState().round || 1,
            text: payload, type: 'player-save-prompt',
            target_id: atkTarget.id, shared: false,
            visibility: 'targeted', prompt_status: 'pending',
            timestamp: new Date().toISOString(),
          })
          if (error) throw error
        } catch {
          try {
            await supabase.from('combat_feed').insert({
              session_id: sessionRunId, round: useCombatStore.getState().round || 1,
              text: payload, type: 'player-save-prompt',
              target_id: atkTarget.id, shared: false,
              timestamp: new Date().toISOString(),
            })
          } catch (e) { console.error('Failed to deliver save prompt:', e) }
        }
      }
      setAtkResult({ hit: null, targetName: atkTarget?.name, total: dc, d20: null, type: 'save' })
      return
    }

    if (adapted.actionKind === 'special' || adapted.actionKind === 'trait' || adapted.actionKind === 'other') {
      pushFeedEvent(
        `${combatant.name} uses ${selected.name}. ${selected.desc || selected.effect || ''}`.trim(),
        'action', true,
      )
      setAtkResult({ hit: null, targetName: atkTarget?.name || '—', type: 'special' })
      return
    }

    const d20    = rollDie(20)
    const toHit  = Number(monsterActionToHit(selected) ?? atkBonus) || 0
    playDmSfx(selected.sound_effect_url || selected.soundEffectUrl)
    const modded = applyDeterministicRollModifiers({ combatant, baseRoll: d20 + toHit, rollType: 'attack' })
    const total  = modded.total
    const forcedCrit = shouldForceCriticalOnHit({
      attackRange: inferAttackRange(selected),
      targetConditions: atkTarget?.conditions || [],
    })
    const crit   = d20 === 20 || forcedCrit
    const hit    = forcedCrit || crit || total >= getAcWithEffects(atkTarget)
    const modsStr = modded.applied.length > 0
      ? ` (${modded.applied.map(m => `${m.source}${m.op}${m.roll}`).join(', ')})`
      : ''

    if (hit) {
      const primaryT = primaryDamageTypeFromAction(selected.damage) || primaryTypeFromAdaptedDamage(adapted)
      /** @type {{ amount: number, type: string|null }[]} */
      const components = []
      const rows = Array.isArray(adapted.damage) ? adapted.damage : []
      if (rows.length > 0) {
        for (const row of rows) {
          const ds = row && typeof row === 'object' && row.dice != null
            ? String(row.dice).replace(/\s+/g, '')
            : null
          if (!ds) continue
          const dmg = parseDmgString(ds, crit)
          const t = row.type != null && row.type !== '' ? row.type : primaryT
          components.push({ amount: dmg.total, type: t })
        }
      }
      if (components.length === 0) {
        const dmgExpr = parseDamageFromStatblock(selected.damage) || dmgInput
        const dmg = parseDmgString(dmgExpr, crit)
        components.push({ amount: dmg.total, type: primaryT })
      }
      const dmgTotal = components.reduce((s, c) => s + c.amount, 0)
      await damageCombatant(atkTarget.id, 0, null, { components })
      const critStr = forcedCrit ? ' AUTO-CRIT!' : crit ? ' CRIT!' : ''
      pushFeedEvent(
        `${combatant.name} → ${selected.name} on ${atkTarget.name}${critStr}: d20(${d20})+${toHit}${modsStr} = ${total} → HIT! ${dmgTotal} dmg`,
        'damage', true,
      )
      setAtkResult({ hit: true, d20, total, crit, dmgTotal, targetName: atkTarget.name })
    } else {
      pushFeedEvent(
        `${combatant.name} → ${selected.name} on ${atkTarget.name}: d20(${d20})+${toHit}${modsStr} = ${total} vs AC ${getAcWithEffects(atkTarget)} → MISS`,
        'roll', true,
      )
      setAtkResult({ hit: false, d20, total, targetName: atkTarget.name })
    }
  }

  const actionOptions = combatant.actionOptions || []

  // ── Inline mode (always visible, attack buttons shown as a row) ─────────
  if (mode === 'inline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {/* Section label */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          ⚔ Attacks
        </div>

        {/* Action option buttons */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {actionOptions.length > 0 ? actionOptions.map(a => {
            const sel     = monsterAction?.name === a.name
            const aTag    = a.actionType === 'bonus_action' ? 'BA' : a.actionType === 'reaction' ? 'R' : 'A'
            const ad      = adaptMonsterAction(a)
            const isSpec  = ad.actionKind === 'special' || ad.actionKind === 'trait' || ad.actionKind === 'other'
            const hitDisp = monsterActionToHit(a)
            return (
              <button
                key={`${a.actionType}-${a.name}`}
                onClick={() => selectAction(a)}
                style={{
                  padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                  background: sel ? 'rgba(196,64,64,0.2)' : 'rgba(196,64,64,0.05)',
                  border: `1px solid ${sel ? 'rgba(196,64,64,0.7)' : 'rgba(196,64,64,0.3)'}`,
                  borderRadius: 'var(--radius)',
                  color: sel ? '#ff9070' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {a.name}
                {hitDisp != null && !isSpec && (
                  <span style={{ opacity: 0.65, marginLeft: 4 }}>
                    {Number(hitDisp) >= 0 ? `+${hitDisp}` : hitDisp}
                  </span>
                )}
                {a.recharge && (
                  <span style={{ color: 'var(--warning)', marginLeft: 4, fontSize: 8 }}>[{a.recharge}]</span>
                )}
                <span style={{ marginLeft: 4, opacity: 0.45, fontSize: 8 }}>[{aTag}]</span>
              </button>
            )
          }) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              No action data — use manual roll below
            </span>
            )}
        </div>

        {monsterAction && /multi\s*-?\s*attack/i.test(String(monsterAction.name || '')) && (
          <div style={{
            fontSize: 9, color: 'var(--warning)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}>
            Multiattack: resolve one strike at a time; repeat for remaining attacks.
          </div>
        )}

        {monsterAction?.desc && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: 520 }}>
            <DiceRichText
              text={monsterAction.desc}
              contextLabel={`${combatant.name}: ${monsterAction.name}`}
              onRoll={handleInlineRoll}
            />
          </div>
        )}

        {/* Target picker (visible once an action is selected or actionOptions is empty) */}
        {(monsterAction || actionOptions.length === 0) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>→</span>
            {players.filter(p => (p.curHp ?? 0) > 0).map(p => {
              const sel = atkTarget?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setAtkTarget(sel ? null : p)}
                  style={{
                    padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: sel ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: `1px solid ${sel ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: sel ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.name}
                  <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 9 }}>AC {p.ac ?? '?'}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Manual to-hit/damage + Roll (when no actionOptions, or extra control wanted) */}
        {atkTarget && (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {actionOptions.length === 0 && (
              <>
                <input
                  type="number" value={atkBonus}
                  onChange={e => setAtkBonus(parseInt(e.target.value) || 0)}
                  placeholder="+hit"
                  style={{ width: 48, padding: '2px 5px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <input
                  value={dmgInput} onChange={e => setDmgInput(e.target.value)}
                  placeholder="2d6+3"
                  style={{ width: 68, padding: '2px 5px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </>
            )}
            <button
              onClick={rollEnemyAttack}
              style={{
                padding: '3px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
                background: 'rgba(196,64,64,0.18)',
                border: '1px solid rgba(196,64,64,0.5)',
                borderRadius: 'var(--radius)',
                color: 'var(--danger)', cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Roll
            </button>
          </div>
        )}

        {/* Result line */}
        {atkResult && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: atkResult.hit === true ? 'var(--danger)'
              : atkResult.hit === false ? 'var(--text-muted)'
              : 'var(--warning)',
            padding: '3px 7px',
            background: atkResult.hit === true ? 'rgba(196,64,64,0.08)'
              : atkResult.hit === false ? 'rgba(255,255,255,0.02)'
              : 'rgba(196,160,64,0.08)',
            border: `1px solid ${atkResult.hit === true ? 'rgba(196,64,64,0.2)' : atkResult.hit === false ? 'var(--border)' : 'rgba(196,160,64,0.2)'}`,
            borderRadius: 'var(--radius)',
          }}>
            {atkResult.hit === true
              ? `${atkResult.crit ? 'CRIT! ' : 'HIT '}d20(${atkResult.d20})=${atkResult.total} → ${atkResult.dmgTotal} dmg to ${atkResult.targetName}`
              : atkResult.hit === false
                ? `MISS d20(${atkResult.d20})=${atkResult.total} vs ${atkResult.targetName}`
                : atkResult.type === 'save'
                  ? `${atkResult.targetName}: ${formatDcWithLabel(atkResult.total) || `DC ${atkResult.total}`} save`
                  : `${atkResult.targetName}: special`
            }
          </div>
        )}
      </div>
    )
  }

  // ── Popover mode (toggle button + collapsible panel) ─────────────────────
  return (
    <div>
      <button
        onClick={() => { setOpen(o => !o); setAtkResult(null) }}
        style={{
          padding: '3px 10px', fontSize: 10,
          fontFamily: 'var(--font-mono)',
          background: open ? 'rgba(196,64,64,0.15)' : 'transparent',
          border: '1px solid rgba(196,64,64,0.4)',
          borderRadius: 'var(--radius)', color: 'var(--danger)', cursor: 'pointer',
        }}
      >
        ⚔ Attack {open ? '▴' : '▾'}
      </button>

      {open && (
        <div style={{
          marginTop: 6, padding: '10px 12px',
          background: 'rgba(196,64,64,0.04)',
          border: '1px solid rgba(196,64,64,0.18)',
          borderRadius: 'var(--radius-lg)',
          animation: 'fade-in-down 150ms ease forwards',
        }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {actionOptions.map(a => {
              const aLabel = a.actionType === 'bonus_action' ? 'BA' : a.actionType === 'reaction' ? 'R' : 'A'
              const sel    = monsterAction?.name === a.name
              return (
                <button
                  key={`${a.actionType}-${a.name}`}
                  onClick={() => selectAction(a)}
                  style={{
                    padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: sel ? 'rgba(196,160,64,0.18)' : 'transparent',
                    border: `1px solid ${sel ? 'rgba(196,160,64,0.5)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: sel ? 'var(--warning)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {a.name} <span style={{ opacity: 0.6 }}>[{aLabel}]</span>
                </button>
              )
            })}
            {players.filter(p => (p.curHp ?? 0) > 0).map(p => {
              const sel = atkTarget?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setAtkTarget(sel ? null : p)}
                  style={{
                    padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: sel ? 'rgba(196,64,64,0.15)' : 'transparent',
                    border: `1px solid ${sel ? 'rgba(196,64,64,0.6)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: sel ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {p.name} <span style={{ opacity: 0.6 }}>(AC {p.ac ?? '?'})</span>
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>To Hit</span>
            <input type="number" value={atkBonus} onChange={e => setAtkBonus(parseInt(e.target.value) || 0)}
              style={{ width: 46, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Damage</span>
            <input value={dmgInput} onChange={e => setDmgInput(e.target.value)} placeholder="2d4+2"
              style={{ width: 72, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} />
            <button onClick={rollEnemyAttack} disabled={!atkTarget}
              style={{ padding: '4px 14px', fontSize: 11, fontFamily: 'var(--font-mono)', background: atkTarget ? 'rgba(196,64,64,0.2)' : 'transparent', border: '1px solid rgba(196,64,64,0.4)', borderRadius: 'var(--radius)', color: atkTarget ? 'var(--danger)' : 'var(--text-muted)', cursor: atkTarget ? 'pointer' : 'not-allowed' }}>
              Roll
            </button>
          </div>
          {atkResult && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11,
              color: atkResult.hit === true ? 'var(--danger)' : atkResult.hit === false ? 'var(--text-muted)' : 'var(--warning)',
              padding: '4px 8px', background: atkResult.hit === true ? 'rgba(196,64,64,0.08)' : atkResult.hit === false ? 'rgba(255,255,255,0.02)' : 'rgba(196,160,64,0.08)',
              border: `1px solid ${atkResult.hit === true ? 'rgba(196,64,64,0.2)' : atkResult.hit === false ? 'var(--border)' : 'rgba(196,160,64,0.2)'}`,
              borderRadius: 'var(--radius)',
            }}>
              {atkResult.hit === true
                ? `${atkResult.crit ? 'CRIT! ' : 'HIT '}d20(${atkResult.d20}) = ${atkResult.total} → ${atkResult.dmgTotal} dmg to ${atkResult.targetName}`
                : atkResult.hit === false
                  ? `MISS — d20(${atkResult.d20}) = ${atkResult.total} vs ${atkResult.targetName}`
                  : atkResult.type === 'save'
                    ? `${atkResult.targetName}: make ${formatDcWithLabel(atkResult.total) || `DC ${atkResult.total}`} save`
                    : `${atkResult.targetName}: special used`
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
