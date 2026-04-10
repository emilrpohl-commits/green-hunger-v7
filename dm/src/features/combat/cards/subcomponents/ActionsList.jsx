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

/**
 * ActionsList
 *
 * Enemy attack panel:
 *   - Action option buttons (from combatant.actionOptions)
 *   - PC target picker
 *   - To Hit / Damage inputs
 *   - Roll button
 *   - Result line with hit/miss/crit styling
 *
 * All attack resolution logic is self-contained here.
 * Pass `players` array (all live player combatants) for target selection.
 */
export default function ActionsList({ combatant, players = [] }) {
  const useCombatantActionType = useCombatStore(s => s.useCombatantActionType)
  const pushFeedEvent          = useCombatStore(s => s.pushFeedEvent)
  const damageCombatant        = useCombatStore(s => s.damageCombatant)

  const [open, setOpen]               = useState(false)
  const [monsterAction, setMonsterAction] = useState(null)
  const [atkTarget, setAtkTarget]     = useState(null)
  const [atkBonus, setAtkBonus]       = useState(4)
  const [dmgInput, setDmgInput]       = useState('2d4+2')
  const [atkResult, setAtkResult]     = useState(null)

  const isEnemy = combatant.type === 'enemy'
  const isDead  = combatant.curHp === 0 && isEnemy

  if (!isEnemy || isDead) return null

  async function rollEnemyAttack() {
    const selected = monsterAction || {
      toHit: atkBonus, damage: dmgInput, name: 'Attack', type: 'attack', actionType: 'action',
    }
    if (!atkTarget && selected.type !== 'special') return

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

    if (selected.type === 'save') {
      const dc       = selected.saveDC || 12
      const saveType = selected.saveType || 'DEX'
      pushFeedEvent(
        `${combatant.name} uses ${selected.name}: ${atkTarget?.name || 'target'} makes ${saveType} save (DC ${dc}).`,
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

    if (selected.type === 'special') {
      pushFeedEvent(
        `${combatant.name} uses ${selected.name}. ${selected.desc || selected.effect || ''}`.trim(),
        'action', true,
      )
      setAtkResult({ hit: null, targetName: atkTarget?.name || '—', type: 'special' })
      return
    }

    const d20    = rollDie(20)
    const toHit  = Number(selected.toHit ?? atkBonus) || 0
    const modded = applyDeterministicRollModifiers({ combatant, baseRoll: d20 + toHit, rollType: 'attack' })
    const total  = modded.total
    const crit   = d20 === 20
    const hit    = crit || total >= getAcWithEffects(atkTarget)
    const modsStr = modded.applied.length > 0
      ? ` (${modded.applied.map(m => `${m.source}${m.op}${m.roll}`).join(', ')})`
      : ''

    if (hit) {
      const dmgExpr = parseDamageFromStatblock(selected.damage) || dmgInput
      const dmg     = parseDmgString(dmgExpr, crit)
      damageCombatant(atkTarget.id, dmg.total)
      const critStr = crit ? ' CRIT!' : ''
      pushFeedEvent(
        `${combatant.name} → ${selected.name} on ${atkTarget.name}${critStr}: d20(${d20})+${toHit}${modsStr} = ${total} → HIT! ${dmg.total} dmg`,
        'damage', true,
      )
      setAtkResult({ hit: true, d20, total, crit, dmgTotal: dmg.total, targetName: atkTarget.name })
    } else {
      pushFeedEvent(
        `${combatant.name} → ${selected.name} on ${atkTarget.name}: d20(${d20})+${toHit}${modsStr} = ${total} vs AC ${getAcWithEffects(atkTarget)} → MISS`,
        'roll', true,
      )
      setAtkResult({ hit: false, d20, total, targetName: atkTarget.name })
    }
  }

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
          {/* Action options + targets */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {(combatant.actionOptions || []).map(a => {
              const aLabel = a.actionType === 'bonus_action' ? 'BA' : a.actionType === 'reaction' ? 'R' : 'A'
              const sel    = monsterAction?.name === a.name
              return (
                <button
                  key={`${a.actionType}-${a.name}`}
                  onClick={() => {
                    setMonsterAction(a)
                    const p = parseDamageFromStatblock(a.damage)
                    if (p) setDmgInput(p)
                    setAtkBonus(Number(a.toHit || 0))
                  }}
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

            {/* Target buttons */}
            {players.filter(p => p.curHp > 0).map(p => {
              const sel = atkTarget?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setAtkTarget(p)}
                  style={{
                    padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: sel ? 'rgba(196,64,64,0.15)' : 'transparent',
                    border: `1px solid ${sel ? 'rgba(196,64,64,0.6)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: sel ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {p.name} <span style={{ opacity: 0.6 }}>(AC {p.ac})</span>
                </button>
              )
            })}
          </div>

          {/* To Hit / Damage / Roll */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>To Hit</span>
            <input
              type="number" value={atkBonus}
              onChange={e => setAtkBonus(parseInt(e.target.value) || 0)}
              style={{ width: 46, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Damage</span>
            <input
              value={dmgInput} onChange={e => setDmgInput(e.target.value)} placeholder="2d4+2"
              style={{ width: 72, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button
              onClick={rollEnemyAttack}
              disabled={!atkTarget}
              style={{
                padding: '4px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
                background: atkTarget ? 'rgba(196,64,64,0.2)' : 'transparent',
                border: '1px solid rgba(196,64,64,0.4)',
                borderRadius: 'var(--radius)',
                color: atkTarget ? 'var(--danger)' : 'var(--text-muted)',
                cursor: atkTarget ? 'pointer' : 'not-allowed',
              }}
            >
              Roll
            </button>
          </div>

          {/* Result */}
          {atkResult && (
            <div style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: atkResult.hit === true ? 'var(--danger)' : atkResult.hit === false ? 'var(--text-muted)' : 'var(--warning)',
              padding: '4px 8px',
              background: atkResult.hit === true
                ? 'rgba(196,64,64,0.08)'
                : atkResult.hit === false
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(196,160,64,0.08)',
              border: `1px solid ${atkResult.hit === true ? 'rgba(196,64,64,0.2)' : atkResult.hit === false ? 'var(--border)' : 'rgba(196,160,64,0.2)'}`,
              borderRadius: 'var(--radius)',
            }}>
              {atkResult.hit === true
                ? `${atkResult.crit ? 'CRIT! ' : 'HIT '}d20(${atkResult.d20}) = ${atkResult.total} → ${atkResult.dmgTotal} dmg to ${atkResult.targetName}`
                : atkResult.hit === false
                  ? `MISS — d20(${atkResult.d20}) = ${atkResult.total} vs ${atkResult.targetName}`
                  : atkResult.type === 'save'
                    ? `${atkResult.targetName}: make DC ${atkResult.total} save`
                    : `${atkResult.targetName}: special used`
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
