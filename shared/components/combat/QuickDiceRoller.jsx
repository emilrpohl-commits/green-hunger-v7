import React from 'react'
import { DICE, DAMAGE_TYPES, MAX_QUICK_DICE_COUNT, MIN_QUICK_DICE_COUNT } from '@shared/lib/combat/quickDiceRollerConstants.js'

export default function QuickDiceRoller({
  title,
  die,
  diceCount = 1,
  modifier,
  target,
  damageType,
  mode,
  effectKind = 'damage',
  d20Mode,
  targets,
  canApplyToTarget,
  lastRoll,
  layout = 'dm',
  onDieChange,
  onDiceCountChange,
  onModifierChange,
  onTargetChange,
  onDamageTypeChange,
  onModeChange,
  onEffectKindChange = () => {},
  onD20ModeChange,
  onRoll,
}) {
  const isPlayer = layout === 'player'
  const dmRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const controlBase = {
    padding: isPlayer ? '8px 10px' : '5px 8px',
    fontFamily: 'var(--font-mono)',
    fontSize: isPlayer ? 12 : 11,
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)',
  }
  const isHealing = effectKind === 'heal'
  const isCheck = effectKind === 'check'
  const displayedRollEffect = lastRoll?.effectKind ?? effectKind
  const displayedDamageType = lastRoll?.damageType ?? damageType
  const resultColour = lastRoll?.crit ? '#d4a820' : lastRoll?.fumble ? '#b03030' : 'var(--green-bright)'
  const showDiceCount = !(die === 20 && d20Mode !== 'normal')
  const nDice = Math.min(MAX_QUICK_DICE_COUNT, Math.max(MIN_QUICK_DICE_COUNT, Number(diceCount) || 1))

  const selectInPlayerGrid = {
    ...controlBase,
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  }

  const playerSelectGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 8,
    width: '100%',
    boxSizing: 'border-box',
  }

  const diceRow = (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {DICE.map(d => (
        <button type="button" key={d} onClick={() => onDieChange(d)} style={{
          padding: isPlayer ? '6px 10px' : '4px 8px',
          minWidth: isPlayer ? 40 : undefined,
          fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 12 : 11,
          background: die === d ? 'var(--green-dim)' : 'var(--bg-raised)',
          border: `1px solid ${die === d ? 'var(--green-mid)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          color: die === d ? 'var(--green-bright)' : 'var(--text-muted)',
          cursor: 'pointer'
        }}>d{d}</button>
      ))}
    </div>
  )

  const bumpDiceCount = (delta) => {
    if (!onDiceCountChange) return
    const next = Math.min(MAX_QUICK_DICE_COUNT, Math.max(MIN_QUICK_DICE_COUNT, nDice + delta))
    onDiceCountChange(next)
  }

  const countRow = showDiceCount && onDiceCountChange && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Number of dice (e.g. 3d6)">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 10 : 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>#</span>
      <button type="button" onClick={() => bumpDiceCount(-1)} disabled={nDice <= MIN_QUICK_DICE_COUNT} style={{ padding: isPlayer ? '8px 10px' : '4px 8px', fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 14 : 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: nDice <= MIN_QUICK_DICE_COUNT ? 'default' : 'pointer', opacity: nDice <= MIN_QUICK_DICE_COUNT ? 0.45 : 1 }}>−</button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 14 : 12, color: 'var(--text-primary)', minWidth: 28, textAlign: 'center' }}>{nDice}</span>
      <button type="button" onClick={() => bumpDiceCount(1)} disabled={nDice >= MAX_QUICK_DICE_COUNT} style={{ padding: isPlayer ? '8px 10px' : '4px 8px', fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 14 : 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: nDice >= MAX_QUICK_DICE_COUNT ? 'default' : 'pointer', opacity: nDice >= MAX_QUICK_DICE_COUNT ? 0.45 : 1 }}>+</button>
    </div>
  )

  const modRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 10 : 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>Mod</span>
      <button type="button" onClick={() => onModifierChange(modifier - 1)} style={{ padding: isPlayer ? '8px 10px' : '4px 8px', fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 14 : 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>−</button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 14 : 12, color: modifier === 0 ? 'var(--text-muted)' : 'var(--text-primary)', minWidth: 32, textAlign: 'center' }}>
        {modifier >= 0 ? `+${modifier}` : modifier}
      </span>
      <button type="button" onClick={() => onModifierChange(modifier + 1)} style={{ padding: isPlayer ? '8px 10px' : '4px 8px', fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 14 : 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>+</button>
    </div>
  )

  const rollButton = (
    <button type="button" onClick={onRoll} style={{
      padding: isPlayer ? '10px 18px' : '6px 18px',
      minWidth: isPlayer ? 110 : undefined,
      fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 13 : 12,
      background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
      borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer',
      letterSpacing: '0.06em', textTransform: 'uppercase'
    }}>Roll</button>
  )

  const lastRollBlock = lastRoll && (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: isPlayer ? 18 : 20, fontWeight: 700, color: resultColour, marginLeft: isPlayer ? 0 : 8 }}>
      {lastRoll.total}
      {(displayedRollEffect === 'heal' || (displayedRollEffect === 'damage' && displayedDamageType)) && (
        <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {displayedRollEffect === 'heal' ? 'heal' : displayedDamageType}
        </span>
      )}
      {lastRoll.d20Mode && lastRoll.d20Mode !== 'normal' && (
        <span style={{ fontSize: 10, marginLeft: 5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {lastRoll.d20Mode === 'advantage' ? 'adv' : 'dis'} {lastRoll.rollA}/{lastRoll.rollB}
        </span>
      )}
      {(lastRoll.diceCount ?? 1) > 1 && !(lastRoll.d20Mode && lastRoll.d20Mode !== 'normal') && (
        <span style={{ fontSize: 10, marginLeft: 5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {lastRoll.diceCount}d{lastRoll.die}
        </span>
      )}
      {lastRoll.crit && <span style={{ fontSize: 11, marginLeft: 5, color: '#d4a820' }}>CRIT</span>}
      {lastRoll.fumble && <span style={{ fontSize: 11, marginLeft: 5, color: '#b03030' }}>nat 1</span>}
    </span>
  )

  return (
    <div style={{
      marginTop: isPlayer ? 0 : 20,
      background: 'rgba(64,96,64,0.08)',
      border: '1px solid var(--border-bright)',
      borderRadius: 'var(--radius-lg)',
      padding: isPlayer ? '10px 12px' : '14px 18px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {title}
      </div>

      {isPlayer ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', width: '100%' }}>
            {diceRow}
            {countRow}
            {modRow}
          </div>
          <div style={playerSelectGridStyle}>
            {die === 20 && (
              <select value={d20Mode} onChange={(e) => onD20ModeChange(e.target.value)} style={selectInPlayerGrid}>
                <option value="normal">Normal d20</option>
                <option value="advantage">Advantage</option>
                <option value="disadvantage">Disadvantage</option>
              </select>
            )}
            <select value={target} onChange={e => onTargetChange(e.target.value)} style={selectInPlayerGrid}>
              {targets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={effectKind} onChange={(e) => onEffectKindChange(e.target.value)} style={selectInPlayerGrid}>
              <option value="damage">Damage</option>
              <option value="heal">Heal</option>
              <option value="check">Check / save</option>
            </select>
            {effectKind === 'damage' && (
              <select value={damageType} onChange={(e) => onDamageTypeChange(e.target.value)} style={{ ...selectInPlayerGrid, textTransform: 'capitalize' }}>
                {DAMAGE_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            )}
            <select
              value={isCheck ? 'roll_only' : mode}
              onChange={(e) => onModeChange(e.target.value)}
              disabled={!canApplyToTarget || isCheck}
              style={{
                ...selectInPlayerGrid,
                color: canApplyToTarget && !isCheck ? 'var(--text-secondary)' : 'var(--text-muted)',
                opacity: canApplyToTarget && !isCheck ? 1 : 0.6,
              }}
            >
              <option value="roll_only">Roll only</option>
              <option value="roll_apply" disabled={isCheck}>Roll + apply</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {rollButton}
            {lastRollBlock}
          </div>
        </div>
      ) : (
        <div style={dmRowStyle}>
          {diceRow}
          {countRow}
          {modRow}
          {die === 20 && (
            <select value={d20Mode} onChange={(e) => onD20ModeChange(e.target.value)} style={{ ...controlBase }}>
              <option value="normal">Normal d20</option>
              <option value="advantage">Advantage</option>
              <option value="disadvantage">Disadvantage</option>
            </select>
          )}
          <select value={target} onChange={e => onTargetChange(e.target.value)} style={{ ...controlBase }}>
            {targets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={effectKind} onChange={(e) => onEffectKindChange(e.target.value)} style={{ ...controlBase }}>
            <option value="damage">Damage</option>
            <option value="heal">Heal</option>
            <option value="check">Check / save</option>
          </select>
          {effectKind === 'damage' && (
            <select value={damageType} onChange={(e) => onDamageTypeChange(e.target.value)} style={{ ...controlBase, textTransform: 'capitalize' }}>
              {DAMAGE_TYPES.map((dt) => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          )}
          <select
            value={isCheck ? 'roll_only' : mode}
            onChange={(e) => onModeChange(e.target.value)}
            disabled={!canApplyToTarget || isCheck}
            style={{
              ...controlBase,
              color: canApplyToTarget && !isCheck ? 'var(--text-secondary)' : 'var(--text-muted)',
              opacity: canApplyToTarget && !isCheck ? 1 : 0.6,
            }}
          >
            <option value="roll_only">Roll only</option>
            <option value="roll_apply" disabled={isCheck}>Roll + apply</option>
          </select>
          {rollButton}
          {lastRollBlock}
        </div>
      )}
    </div>
  )
}
