import React, { useEffect, useMemo, useState } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { rosterToDmTargetOptions } from '@shared/lib/partyRoster.js'
import QuickDiceRoller from '@shared/components/combat/QuickDiceRoller.jsx'
import { MAX_QUICK_DICE_COUNT, MIN_QUICK_DICE_COUNT } from '@shared/lib/combat/quickDiceRollerConstants.js'

export default function PlayerDiceRollerDock({ actorName = 'Player', expanded = false, onExpandedChange = () => {} }) {
  const characters = usePlayerStore((s) => s.characters)
  const combatCombatants = usePlayerStore((s) => s.combatCombatants)
  const combatActive = usePlayerStore((s) => s.combatActive)
  const pushRoll = usePlayerStore((s) => s.pushRoll)
  const applyDamageToEnemy = usePlayerStore((s) => s.applyDamageToEnemy)
  const applyDamageToCharacter = usePlayerStore((s) => s.applyDamageToCharacter)
  const applyHealingToCharacter = usePlayerStore((s) => s.applyHealingToCharacter)
  const applyHealingToEnemy = usePlayerStore((s) => s.applyHealingToEnemy)

  const targets = useMemo(
    () => [...rosterToDmTargetOptions(Array.isArray(characters) ? characters : []), { id: 'all', name: 'All Players' }],
    [characters]
  )

  const [die, setDie] = useState(20)
  const [diceCount, setDiceCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [target, setTarget] = useState('all')
  const [damageType, setDamageType] = useState('fire')
  const [mode, setMode] = useState('roll_only')
  const [effectKind, setEffectKind] = useState('damage')
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

  const applyToTarget = async (total) => {
    if (!canApplyToTarget || mode !== 'roll_apply' || effectKind === 'check') return
    const amount = Math.max(0, total)
    const isPlayerTarget = targets.some((t) => t.id === target)
    const components = [{ amount, type: damageType }]

    if (effectKind === 'heal') {
      if (isPlayerTarget) {
        await applyHealingToCharacter(target, amount, actorName, 'Dice roller')
        return
      }
      const combatantTarget = (combatCombatants || []).find((c) => c.id === target)
      if (combatActive && combatantTarget) {
        await applyHealingToEnemy(target, amount, actorName, 'Dice roller')
      }
      return
    }

    if (isPlayerTarget) {
      await applyDamageToCharacter(target, amount, actorName, 'Dice roller', damageType, { components })
      return
    }

    const combatantTarget = (combatCombatants || []).find((c) => c.id === target)
    if (combatActive && combatantTarget) {
      await applyDamageToEnemy(target, amount, actorName, 'Dice roller', damageType, { components })
    }
  }

  const roll = async () => {
    const targetLabel = targets.find(c => c.id === target)?.name || 'All Players'
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
    const effectVerb = effectKind === 'heal' ? 'heals' : effectKind === 'check' ? 'rolls' : 'hits'
    const text = applying
      ? `${effectVerb} with ${rollDescriptor}${modStr}${totalLabel}${typeLabel} -> applied to ${targetLabel}`
      : `rolls ${rollDescriptor}${modStr}${totalLabel}${typeLabel}${target !== 'all' ? ` (for ${targetLabel})` : ''}`

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

    await pushRoll(text, actorName, {
      shared: target === 'all',
      visibility: target === 'all' ? 'player_visible' : 'targeted',
      targetId: target,
      metadata: {
        kind: 'player_dice_roller',
        effect_kind: effectKind,
        damage_type: effectKind === 'damage' ? damageType : null,
        apply_damage: applying && effectKind === 'damage',
        apply_heal: applying && effectKind === 'heal',
        dice_count: die === 20 && d20Mode !== 'normal' ? 2 : nPool,
        d20_mode: die === 20 ? d20Mode : 'normal',
        roll_a: rollA,
        roll_b: rollB,
      },
    })

    await applyToTarget(total)
  }

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 110,
      background: 'linear-gradient(to top, rgba(10,14,12,0.98), rgba(10,14,12,0.92))',
      borderTop: '1px solid var(--border)',
      padding: '10px 0 calc(10px + env(safe-area-inset-bottom, 0px))',
      boxShadow: '0 -8px 24px rgba(0,0,0,0.28)',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' }}>
        <button
          onClick={() => onExpandedChange(!expanded)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-bright)',
            background: 'rgba(64,96,64,0.14)',
            color: 'var(--green-bright)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Dice Roller</span>
          <span>{expanded ? 'Hide' : 'Show'}</span>
        </button>
        {expanded && (
          <QuickDiceRoller
            title="Quick Roll"
            die={die}
            diceCount={diceCount}
            modifier={modifier}
            target={target}
            damageType={damageType}
            mode={mode}
            effectKind={effectKind}
            d20Mode={d20Mode}
            targets={targets}
            canApplyToTarget={canApplyToTarget}
            lastRoll={lastRoll}
            layout="player"
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
        )}
      </div>
    </div>
  )
}
