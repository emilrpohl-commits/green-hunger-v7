import React, { useState, useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { parseCastingTimeMeta, buildSpellEffectMetadata, ensureActionEconomy, applyDeterministicRollModifiers, getAcWithEffects } from '@shared/lib/combatRules.js'

// ─── Dice helpers ────────────────────────────────────────────────────────────
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1

const rollDice = (count, sides) =>
  Array.from({ length: Math.max(count, 0) }, () => rollDie(sides))

const parseModNum = (modStr) => {
  const n = parseInt(modStr)
  return isNaN(n) ? 0 : n
}

const isAttackRoll = (hitStr) => /^[+-]?\d+$/.test(String(hitStr).trim())

const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`)
const parseDiceNotation = (notation) => {
  if (!notation || typeof notation !== 'string') return null
  const m = notation.trim().match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/)
  if (!m) return null
  const modVal = m[4] ? Number(m[4]) * (m[3] === '-' ? -1 : 1) : 0
  return { count: Number(m[1]), sides: Number(m[2]), mod: modVal }
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <div style={{
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 12
  }}>
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em'
    }}>
      {title}
    </div>
    <div style={{ padding: '14px 16px' }}>{children}</div>
  </div>
)

const RollBtn = ({ onClick, colour, small }) => (
  <button
    onClick={onClick}
    style={{
      padding: small ? '2px 7px' : '3px 9px',
      fontFamily: 'var(--font-mono)',
      fontSize: small ? 9 : 10,
      background: 'transparent',
      border: `1px solid ${colour}50`,
      borderRadius: 'var(--radius)',
      color: colour,
      cursor: 'pointer',
      letterSpacing: '0.06em',
      flexShrink: 0
    }}
  >
    d20
  </button>
)

// ─── Roll result panel ───────────────────────────────────────────────────────
function RollResultPanel({ result, charColour, onRollDamage, onUseBardicInspiration, hasBardic, onDismiss }) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onDismiss, 12000)
    return () => clearTimeout(t)
  }, [result, onDismiss])

  if (!result) return null

  const critColour = '#d4a820'
  const hitColour = '#6aaa5a'
  const missColour = '#b03030'

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#141814',
      border: `2px solid ${charColour}90`,
      borderRadius: 12,
      padding: '18px 22px',
      zIndex: 200,
      minWidth: 260, maxWidth: 340,
      boxShadow: `0 6px 32px ${charColour}40, 0 2px 8px rgba(0,0,0,0.7)`,
      textAlign: 'center'
    }}>
      {/* Dismiss */}
      <button onClick={onDismiss} style={{
        position: 'absolute', top: 8, right: 10,
        background: 'none', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 16, lineHeight: 1
      }}>×</button>

      {/* Skill / Save check */}
      {(result.type === 'skill' || result.type === 'save') && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            {result.type === 'skill' ? 'Skill Check' : 'Saving Throw'} — {result.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : 'var(--text-primary)', fontWeight: 500, lineHeight: 1 }}>
              {result.d20}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>+</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: charColour }}>{result.mod >= 0 ? result.mod : result.mod}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>=</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : charColour, fontWeight: 700, lineHeight: 1 }}>
              {result.total}
            </span>
          </div>
          {result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: critColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Natural 20!</div>}
          {result.fumble && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: missColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Natural 1</div>}
          {result.bardicBonus != null && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9070a0', marginBottom: 4 }}>
              + Bardic d6: {result.bardicBonus} → <strong style={{ color: charColour }}>{result.total}</strong>
            </div>
          )}
          {hasBardic && result.bardicBonus == null && (
            <button onClick={onUseBardicInspiration} style={{
              marginTop: 6, padding: '5px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              background: '#9070a020', border: '1px solid #9070a060',
              borderRadius: 'var(--radius)', color: '#b090c0', cursor: 'pointer'
            }}>
              + Use Bardic Inspiration (1d6)
            </button>
          )}
        </>
      )}

      {/* Attack roll */}
      {result.type === 'attack' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Attack — {result.weaponName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : 'var(--text-primary)', fontWeight: 500, lineHeight: 1 }}>
              {result.d20}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>+</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: charColour }}>{result.bonus}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)' }}>=</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: result.crit ? critColour : result.hit ? hitColour : missColour, fontWeight: 700, lineHeight: 1 }}>
              {result.total}
            </span>
          </div>
          {result.target && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              vs {result.target.name} (AC {result.target.ac})
            </div>
          )}
          {result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: critColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Critical Hit!</div>}
          {result.hit === true && !result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: hitColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Hit!</div>}
          {result.hit === false && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: missColour, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Miss</div>}
          {(result.hit || result.hit == null) && (
            <button onClick={onRollDamage} style={{
              padding: '8px 20px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              background: `${charColour}20`, border: `1px solid ${charColour}60`,
              borderRadius: 'var(--radius)', color: charColour, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Roll Damage
            </button>
          )}
        </>
      )}

      {/* Combined attack + damage (auto-applied on hit) */}
      {result.type === 'attack-damage' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            {result.crit ? 'Critical Hit!' : 'Hit!'} — {result.weaponName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, color: result.crit ? critColour : hitColour, fontWeight: 700 }}>{result.total}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>vs AC {result.target.ac}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            [{result.rolls.join(' + ')}]{result.modifier ? ` + ${result.modifier}` : ''} = <strong style={{ color: missColour, fontSize: 22 }}>{result.dmgTotal}</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {result.damageType} damage → {result.target.name}
          </div>
        </>
      )}

      {/* Save spell (no attack roll, roll damage) */}
      {result.type === 'save-spell' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Forced Save — {result.weaponName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Target must make a <strong style={{ color: charColour }}>{result.saveStr}</strong>
          </div>
          {result.damageTotal != null && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Rolled damage: <strong style={{ color: missColour }}>{result.damageTotal}</strong>
              {result.damageType ? ` ${result.damageType}` : ''}
              {result.target ? ` → ${result.target.name}` : ''}
            </div>
          )}
          <button onClick={onRollDamage} style={{
            padding: '8px 20px',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            background: `${charColour}20`, border: `1px solid ${charColour}60`,
            borderRadius: 'var(--radius)', color: charColour, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.08em'
          }}>
            {result.damageTotal != null ? 'Apply damage' : 'Roll damage'}
          </button>
        </>
      )}

      {/* Damage result */}
      {result.type === 'damage' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Damage — {result.weaponName}{result.crit ? ' (Crit!)' : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            [{result.rolls.join(' + ')}]{result.modifier !== 0 ? ` + ${result.modifier}` : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, color: missColour, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
            {result.total}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {result.damageType} damage
            {result.target ? ` → ${result.target.name}` : ''}
          </div>
          {result.crit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: critColour, marginTop: 4 }}>Dice doubled!</div>}
        </>
      )}

      {/* Heal result */}
      {result.type === 'heal' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Healing — {result.spellName}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            [{result.rolls.join(' + ')}]{result.modifier > 0 ? ` + ${result.modifier}` : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, color: hitColour, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
            +{result.total}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            HP restored → {result.targetName}
          </div>
        </>
      )}

      {/* Utility spell cast confirmation */}
      {result.type === 'utility' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
            Spell Cast
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: charColour, marginBottom: result.targetName ? 6 : 0 }}>
            {result.spellName}
          </div>
          {result.targetName && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>→ {result.targetName}</div>
          )}
        </>
      )}

      {/* Bardic inspiration grant */}
      {result.type === 'bardic' && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Bardic Inspiration Granted
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: '#b090c0', fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
            1d6
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Granted to <strong style={{ color: '#b090c0' }}>{result.targetName}</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
            Add to any d20 Test within the hour
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CharacterProfile({ characterId }) {
  const characters = usePlayerStore(s => s.characters)
  const combatActive = usePlayerStore(s => s.combatActive)
  const combatRound = usePlayerStore(s => s.combatRound)
  const combatCombatants = usePlayerStore(s => s.combatCombatants)
  const activeBuffs = usePlayerStore(s => s.activeBuffs)
  const bardicInspirationUses = usePlayerStore(s => s.bardicInspirationUses)
  const applyDamageToEnemy = usePlayerStore(s => s.applyDamageToEnemy)
  const applyConditionToEnemy = usePlayerStore(s => s.applyConditionToEnemy)
  const applyHealingToCharacter = usePlayerStore(s => s.applyHealingToCharacter)
  const grantBardicInspiration = usePlayerStore(s => s.grantBardicInspiration)
  const consumeBuff = usePlayerStore(s => s.consumeBuff)
  const pushRoll = usePlayerStore(s => s.pushRoll)
  const pushSavePrompt = usePlayerStore(s => s.pushSavePrompt)
  const useSpellSlot = usePlayerStore(s => s.useSpellSlot)
  const dmRoll = usePlayerStore(s => s.dmRoll)
  const clearDmRoll = usePlayerStore(s => s.clearDmRoll)
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const companionSpellSlots = usePlayerStore(s => s.companionSpellSlots)
  const initiativePhase = usePlayerStore(s => s.initiativePhase)
  const combatActiveCombatantIndex = usePlayerStore(s => s.combatActiveCombatantIndex)
  const submitInitiative = usePlayerStore(s => s.submitInitiative)
  const tryUseCombatActionType = usePlayerStore(s => s.tryUseCombatActionType)
  const getCombatantActionEconomy = usePlayerStore(s => s.getCombatantActionEconomy)

  const char = playerCharacters[characterId]
  const liveChar = characters.find(c => c.id === characterId)
  const [tab, setTab] = useState('stats')
  const [rollResult, setRollResult] = useState(null)
  const [pendingAttack, setPendingAttack] = useState(null) // { weapon, target, crit }
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [healTarget, setHealTarget] = useState(null)
  const [healSlot, setHealSlot] = useState(1)
  const [bardicTarget, setBardicTarget] = useState(null)
  // Spell casting state
  const [activeSpell, setActiveSpell] = useState(null)   // spell object being cast
  const [spellSlotLevel, setSpellSlotLevel] = useState(null)
  const [spellTarget, setSpellTarget] = useState(null)
  const [spellTargets, setSpellTargets] = useState([])
  const [pendingSpellDmg, setPendingSpellDmg] = useState(null) // { spell, target, slotLevel, crit }
  const [turnPromptVisible, setTurnPromptVisible] = useState(false)

  if (!char) return null

  const curHp = liveChar?.curHp ?? char.stats.maxHp
  const tempHp = liveChar?.tempHp ?? 0
  const spellSlots = liveChar?.spellSlots ?? companionSpellSlots[characterId] ?? char.spellSlots
  const concentration = liveChar?.concentration ?? false
  const hpPct = char.stats.maxHp > 0 ? (curHp / char.stats.maxHp) * 100 : 0
  const hpColour = curHp === 0 ? 'var(--danger)' : hpPct > 60 ? 'var(--green-bright)' : hpPct > 30 ? 'var(--warning)' : '#c46040'

  const myBuffs = activeBuffs[characterId] || []
  const hasBardic = myBuffs.some(b => b.type === 'bardic')

  const enemies = combatActive
    ? combatCombatants.filter(c => c.type === 'enemy' && (c.curHp ?? 0) > 0)
    : []

  const partyChars = characters.filter(c => c.id !== characterId)
  const myCombatantIndex = combatCombatants.findIndex(c => c.id === characterId)
  const myCombatant = combatCombatants[myCombatantIndex]
  const myTurnActive = combatActive && myCombatantIndex >= 0 && myCombatantIndex === combatActiveCombatantIndex
  const myEconomy = ensureActionEconomy(getCombatantActionEconomy(characterId))
  const nextCombatant = combatCombatants[(combatActiveCombatantIndex + 1) % Math.max(combatCombatants.length, 1)]

  const resolveSpellForCasting = (spell) => {
    const next = { ...spell }
    if (!next.mechanic) next.mechanic = next.combatProfile?.resolutionType || 'utility'
    if (!next.targetMode) next.targetMode = next.combatProfile?.targetMode || 'single'
    const castingMeta = parseCastingTimeMeta(next.castingTime)
    next.actionType = next.actionType || castingMeta.actionType
    next.isBonusAction = next.isBonusAction ?? castingMeta.isBonusAction
    next.isReaction = next.isReaction ?? castingMeta.isReaction
    if (!next.target) {
      if (next.targetMode === 'self') next.target = 'self'
      else if (next.targetMode === 'single' || next.targetMode === 'multi_select' || next.targetMode.startsWith('area')) next.target = 'enemy'
    }
    if (!next.saveType) next.saveType = next.combatProfile?.saveAbility || null
    if (!next.saveDC && next.saveType) next.saveDC = char.stats.spellSaveDC
    if (!next.toHit && next.mechanic === 'attack') {
      const parsed = parseInt(String(char.stats.spellAttack || '').replace('+', ''), 10)
      next.toHit = Number.isNaN(parsed) ? 0 : parsed
    }
    if (!next.damage && next.damage_dice) {
      const parsed = parseDiceNotation(next.damage_dice)
      if (parsed) {
        next.damage = { ...parsed, type: next.damage_type || 'Force' }
      }
    }
    if (!next.healDice && next.healing_dice) {
      const parsed = parseDiceNotation(next.healing_dice)
      if (parsed) next.healDice = parsed
    }
    return next
  }

  const canSpendActionType = async (actionType, label) => {
    if (!combatActive || !actionType || actionType === 'special') return true
    const result = await tryUseCombatActionType(characterId, actionType, label)
    if (result?.ok) return true
    const reason = result?.reason === 'not_your_turn'
      ? `It is not your turn. Resolve "${label}" manually?`
      : `${actionType.replace('_', ' ')} already used this turn. Resolve "${label}" manually?`
    return window.confirm(reason)
  }

  // ── Roll functions ──
  const rollSkill = (skill) => {
    const d20 = rollDie(20)
    const mod = parseModNum(skill.mod)
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + mod, rollType: 'check', includeGuidance: true })
    const total = modded.total
    setRollResult({ type: 'skill', name: skill.name, d20, mod, total, crit: d20 === 20, fumble: d20 === 1 })
    setPendingAttack(null)
    const label = d20 === 20 ? ` NAT 20!` : d20 === 1 ? ` nat 1` : ''
    pushRoll(`${skill.name} check: d20(${d20}) + ${mod} = ${total}${label}`, char.name)
  }

  const rollSave = (save) => {
    const d20 = rollDie(20)
    const mod = parseModNum(save.mod)
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + mod, rollType: 'save' })
    const total = modded.total
    setRollResult({ type: 'save', name: save.name, d20, mod, total, crit: d20 === 20, fumble: d20 === 1 })
    setPendingAttack(null)
    const label = d20 === 20 ? ` NAT 20!` : d20 === 1 ? ` nat 1` : ''
    pushRoll(`${save.name} save: d20(${d20}) + ${mod} = ${total}${label}`, char.name)
  }

  const rollAttack = async (weapon, target) => {
    const actionType = parseCastingTimeMeta(weapon.action || 'Action').actionType
    const canUse = await canSpendActionType(actionType, weapon.name)
    if (!canUse) return
    if (!isAttackRoll(weapon.hit)) {
      // Save spell — keep two-step so DM can declare whether save succeeds
      setRollResult({ type: 'save-spell', weaponName: weapon.name, saveStr: weapon.save || weapon.hit, weapon, target })
      setPendingAttack({ weapon, target, crit: false })
      pushRoll(`${weapon.name}: forced save — ${weapon.save || weapon.hit}`, char.name)
      return
    }
    const d20 = rollDie(20)
    const bonus = weapon.attackBonus || 0
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + bonus, rollType: 'attack' })
    const total = modded.total
    const crit = d20 === 20
    const hit = target ? (crit || total >= getAcWithEffects(target)) : null

    // If we have a target and it's a hit, auto-roll and apply damage immediately
    if (hit && target && weapon.damageDice) {
      const dd = weapon.damageDice
      const diceCount = crit ? dd.count * 2 : dd.count
      const rolls = rollDice(Math.max(diceCount, 0), dd.sides)
      const dmgTotal = rolls.reduce((a, b) => a + b, 0) + dd.modifier
      setRollResult({ type: 'attack-damage', weaponName: weapon.name, d20, bonus, total, crit, target, rolls, modifier: dd.modifier, dmgTotal, damageType: dd.type })
      setPendingAttack(null)
      applyDamageToEnemy(target.id, dmgTotal, char.name, weapon.name)
      const critStr = crit ? ' CRIT!' : ''
      pushRoll(`${weapon.name} attack: d20(${d20}) + ${bonus} = ${total} vs ${target.name} AC ${getAcWithEffects(target)} → HIT${critStr}`, char.name)
      pushRoll(`${weapon.name} damage${crit ? ' (crit)' : ''}: [${rolls.join('+')}]${dd.modifier ? `+${dd.modifier}` : ''} = ${dmgTotal} ${dd.type} → ${target.name}`, char.name)
      return
    }

    // Free roll, miss, or no damage dice — show result with optional Roll Damage button
    setRollResult({ type: 'attack', weaponName: weapon.name, d20, bonus, total, hit, target, crit })
    if (hit !== false) {
      setPendingAttack({ weapon, target, crit })
    } else {
      setPendingAttack(null)
    }
    const hitStr = hit === null ? '' : hit ? ` → HIT` : ` → MISS`
    const critStr = crit ? ` CRITICAL!` : ''
    const targetStr = target ? ` vs ${target.name} AC ${getAcWithEffects(target)}` : ''
    pushRoll(`${weapon.name} attack: d20(${d20}) + ${bonus} = ${total}${targetStr}${hitStr}${critStr}`, char.name)
  }

  const rollDamageFromPending = () => {
    if (!pendingAttack) return
    const { weapon, target, crit } = pendingAttack
    const dd = weapon.damageDice
    if (!dd) return
    const diceCount = crit ? dd.count * 2 : dd.count
    const rolls = rollDice(diceCount, dd.sides)
    const total = rolls.reduce((a, b) => a + b, 0) + dd.modifier
    setRollResult({ type: 'damage', weaponName: weapon.name, rolls, modifier: dd.modifier, total, damageType: dd.type, target, crit })
    setPendingAttack(null)
    if (target) {
      applyDamageToEnemy(target.id, total, char.name, weapon.name)
    }
    const critStr = crit ? ' (crit)' : ''
    const targetStr = target ? ` → ${target.name}` : ''
    pushRoll(`${weapon.name} damage${critStr}: [${rolls.join('+')}]${dd.modifier ? `+${dd.modifier}` : ''} = ${total} ${dd.type}${targetStr}`, char.name)
  }

  const useBardicInspiration = () => {
    const buff = consumeBuff(characterId, 'bardic')
    if (!buff || !rollResult) return
    const bonusRoll = rollDie(buff.die)
    setRollResult(prev => ({ ...prev, bardicBonus: bonusRoll, total: prev.total + bonusRoll }))
    pushRoll(`Bardic Inspiration used: +${bonusRoll} (d${buff.die})`, char.name)
  }

  const rollHeal = async (healAction, slotLvl, target) => {
    const actionType = parseCastingTimeMeta(healAction.action || 'Action').actionType
    const canUse = await canSpendActionType(actionType, healAction.name)
    if (!canUse) return
    const { baseDice, perLevelBonus, dice } = healAction
    let count, sides, modifier
    if (baseDice) {
      const extraLevels = Math.max(0, slotLvl - (healAction.slotLevel || 1))
      count = baseDice.count + (perLevelBonus ? perLevelBonus.count * extraLevels : 0)
      sides = baseDice.sides
      modifier = baseDice.modifier
    } else if (dice) {
      count = dice.count
      sides = dice.sides
      modifier = dice.modifier
    } else {
      return
    }

    const rolls = rollDice(count, sides)
    const total = rolls.reduce((a, b) => a + b, 0) + modifier
    const staticTarget = playerCharacters[target]
    const targetName = staticTarget?.name || target || char.name

    setRollResult({ type: 'heal', spellName: healAction.name, rolls, modifier, total, targetName })
    setPendingAttack(null)

    const healTargetId = target || characterId
    applyHealingToCharacter(healTargetId, total, char.name, healAction.name)
    pushRoll(`${healAction.name}: [${rolls.join('+')}]${modifier ? `+${modifier}` : ''} = +${total} HP → ${targetName}`, char.name)
  }

  const grantBardic = async (targetId) => {
    const canUse = await canSpendActionType('bonus_action', 'Bardic Inspiration')
    if (!canUse) return
    const ok = grantBardicInspiration(targetId, characterId)
    if (ok) {
      const staticTarget = playerCharacters[targetId]
      const targetName = staticTarget?.name || targetId
      setRollResult({ type: 'bardic', targetName })
      pushRoll(`Bardic Inspiration granted to ${targetName} (1d6)`, char.name)
    }
  }

  // ── Spell casting ──
  const openSpell = (spell) => {
    const resolved = resolveSpellForCasting(spell)
    setActiveSpell(resolved)
    setSpellSlotLevel(resolved.minSlot || (resolved.level > 0 ? resolved.level : null))
    setSpellTarget(null)
    setSpellTargets([])
    setPendingSpellDmg(null)
    setRollResult(null)
  }

  const closeSpellPanel = () => {
    setActiveSpell(null)
    setSpellSlotLevel(null)
    setSpellTarget(null)
    setSpellTargets([])
  }

  const closeSpell = () => {
    closeSpellPanel()
    setPendingSpellDmg(null)
  }

  const castSpell = async (spell, slotLevel, target, targets = []) => {
    const canUse = await canSpendActionType(spell.actionType || parseCastingTimeMeta(spell.castingTime).actionType, spell.name)
    if (!canUse) return
    const slotLvl = slotLevel ?? spell.minSlot ?? null
    // Consume slot (cantrips have no slot)
    if (slotLvl) {
      const ok = await useSpellSlot(characterId, slotLvl)
      if (!ok) return
    }
    const extraLevels = slotLvl && spell.minSlot ? slotLvl - spell.minSlot : 0
    const targetName = target?.name ?? (spell.target === 'self' ? char.name : null)
    const selectedTargets = targets.length > 0 ? targets : (target ? [target] : [])

    if (spell.mechanic === 'attack') {
      const d20 = rollDie(20)
      const bonus = spell.toHit || 0
      const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + bonus, rollType: 'attack' })
      const total = modded.total
      const crit = d20 === 20
      const hit = target ? (crit || total >= getAcWithEffects(target)) : null
      setRollResult({ type: 'attack', weaponName: spell.name, d20, bonus, total, hit, target, crit })
      if (hit !== false) {
        setPendingSpellDmg({ spell, target, slotLevel: slotLvl, crit, extraLevels })
      } else {
        setPendingSpellDmg(null)
      }
      const hitStr = hit === null ? '' : hit ? ' → HIT' : ' → MISS'
      const critStr = crit ? ' CRITICAL!' : ''
      const rangeStr = target ? ` vs ${target.name} AC ${getAcWithEffects(target)}` : ''
      pushRoll(`${spell.name} attack: d20(${d20}) + ${bonus} = ${total}${rangeStr}${hitStr}${critStr}`, char.name)

    } else if (spell.mechanic === 'save') {
      const dd = spell.damage
      if (dd) {
        const extraDice = spell.perLevel ? extraLevels * spell.perLevel.count : 0
        const totalDice = dd.count + extraDice
        const rolls = rollDice(totalDice, spell.damageIfHurt?.sides || dd.sides)
        const total = rolls.reduce((a, b) => a + b, 0) + dd.mod
        const primaryTarget = selectedTargets[0] || target || null
        setRollResult({ type: 'save-spell', weaponName: spell.name, saveStr: `${spell.saveType} DC ${spell.saveDC}`, weapon: spell, target: primaryTarget, rolls, modifier: dd.mod, damageTotal: total, damageType: dd.type })
        setPendingSpellDmg(null)
        const targetStr = selectedTargets.length > 1
          ? ` → ${selectedTargets.map(t => t.name).join(', ')}`
          : primaryTarget ? ` → ${primaryTarget.name}` : ''
        pushRoll(`${spell.name} (${spell.saveType} DC ${spell.saveDC}): [${rolls.join('+')}]${dd.mod ? `+${dd.mod}` : ''} = ${total} ${dd.type}${targetStr}`, char.name)
        const targetsPayload = (selectedTargets.length > 0 ? selectedTargets : primaryTarget ? [primaryTarget] : []).map(t => ({ id: t.id, name: t.name }))
        pushSavePrompt({
          promptId: `${Date.now()}-${characterId}-${spell.name}`,
          spellName: spell.name,
          casterId: characterId,
          casterName: char.name,
          saveAbility: spell.saveType,
          saveDc: spell.saveDC,
          targets: targetsPayload,
          damage: dd ? { amount: total, type: dd.type, halfOnSuccess: true } : null,
          effect: buildSpellEffectMetadata(spell),
          raw: { targetStr }
        })
        closeSpellPanel()
      } else {
        // Save with no damage (Bane, Command, Charm, etc.)
        const primaryTarget = selectedTargets[0] || target || null
        setRollResult({ type: 'save-spell', weaponName: spell.name, saveStr: `${spell.saveType} DC ${spell.saveDC}`, weapon: spell, target: primaryTarget })
        const targetStr = selectedTargets.length > 1
          ? ` → ${selectedTargets.map(t => t.name).join(', ')}`
          : primaryTarget ? ` → ${primaryTarget.name}` : ''
        pushRoll(`${spell.name}: ${spell.saveType} DC ${spell.saveDC}${targetStr}`, char.name)
        const targetsPayload = (selectedTargets.length > 0 ? selectedTargets : primaryTarget ? [primaryTarget] : []).map(t => ({ id: t.id, name: t.name }))
        pushSavePrompt({
          promptId: `${Date.now()}-${characterId}-${spell.name}`,
          spellName: spell.name,
          casterId: characterId,
          casterName: char.name,
          saveAbility: spell.saveType,
          saveDc: spell.saveDC,
          targets: targetsPayload,
          damage: null,
          effect: buildSpellEffectMetadata(spell),
          raw: { targetStr }
        })
        closeSpell()
      }

    } else if (spell.mechanic === 'auto') {
      // Magic Missile — auto-hits
      const missilesCount = (spell.missiles || 1) + extraLevels * (spell.perLevelMissiles || 0)
      const dd = spell.damage
      let totalDmg = 0
      const rollBreakdown = []
      for (let i = 0; i < missilesCount; i++) {
        const r = rollDice(dd.count, dd.sides)
        const dmg = r.reduce((a, b) => a + b, 0) + dd.mod
        totalDmg += dmg
        rollBreakdown.push(dmg)
      }
      setRollResult({ type: 'damage', weaponName: spell.name, rolls: rollBreakdown, modifier: 0, total: totalDmg, damageType: dd.type, target, crit: false })
      const targetStr = target ? ` → ${target.name}` : ''
      pushRoll(`${spell.name} (${missilesCount} missiles): [${rollBreakdown.join('+')}] = ${totalDmg} ${dd.type}${targetStr}`, char.name)
      if (target) applyDamageToEnemy(target.id, totalDmg, char.name, spell.name)
      closeSpell()

    } else if (spell.mechanic === 'heal') {
      // Route through existing rollHeal
      const healActionProxy = {
        name: spell.name,
        slotLevel: spell.minSlot || 1,
        maxSlotLevel: slotLvl,
        baseDice: spell.healDice ? { count: spell.healDice.count, sides: spell.healDice.sides, modifier: spell.healDice.mod } : null,
        perLevelBonus: spell.perLevelHeal || null,
        action: spell.castingTime,
      }
      rollHeal(healActionProxy, slotLvl || 1, target?.id || characterId)
      closeSpell()

    } else {
      // Utility — log it and show a simple cast confirmation
      const targetStr = targetName ? ` → ${targetName}` : ''
      setRollResult({ type: 'utility', spellName: spell.name, targetName })
      pushRoll(`${spell.name} cast${targetStr}`, char.name)
      closeSpell()
    }
  }

  const rollSpellDamage = () => {
    if (!pendingSpellDmg) return
    const { spell, target, targets, crit, extraLevels, precomputedDamage } = pendingSpellDmg
    const damageTargets = targets?.length ? targets : (target ? [target] : [])
    if (precomputedDamage != null) {
      if (damageTargets.length > 0) {
        for (const t of damageTargets) applyDamageToEnemy(t.id, precomputedDamage, char.name, spell.name)
        const targetStr = ` → ${damageTargets.map(t => t.name).join(', ')}`
        pushRoll(`${spell.name} damage (applied): ${precomputedDamage} ${spell.damage?.type || ''}${targetStr}`, char.name)
      }
      setRollResult({
        type: 'damage',
        weaponName: spell.name,
        rolls: [precomputedDamage],
        modifier: 0,
        total: precomputedDamage,
        damageType: spell.damage?.type,
        target: damageTargets[0] || target,
        crit: false
      })
      setPendingSpellDmg(null)
      closeSpell()
      return
    }
    if (!spell.damage) return
    const dd = spell.damage
    const extraDice = spell.perLevel ? extraLevels * spell.perLevel.count : 0
    const baseCount = crit ? (dd.count + extraDice) * 2 : dd.count + extraDice
    const rolls = rollDice(baseCount, dd.sides)
    const total = rolls.reduce((a, b) => a + b, 0) + dd.mod
    setRollResult({ type: 'damage', weaponName: spell.name, rolls, modifier: dd.mod, total, damageType: dd.type, target: damageTargets[0] || target, crit })
    setPendingSpellDmg(null)
    if (damageTargets.length > 0) {
      for (const t of damageTargets) applyDamageToEnemy(t.id, total, char.name, spell.name)
    }
    const critStr = crit ? ' (crit)' : ''
    const targetStr = damageTargets.length > 0 ? ` → ${damageTargets.map(t => t.name).join(', ')}` : ''
    pushRoll(`${spell.name} damage${critStr}: [${rolls.join('+')}]${dd.mod ? `+${dd.mod}` : ''} = ${total} ${dd.type}${targetStr}`, char.name)
    closeSpell()
  }

  const dismissRoll = () => setRollResult(null)

  const tabs = ['stats', 'spells', 'actions', 'features', 'equipment']

  // Auto-dismiss DM roll after 10s
  useEffect(() => {
    if (!dmRoll) return
    // Only show if targeted at this character or all
    const relevant = dmRoll.targetId === 'all' || dmRoll.targetId === characterId
    if (!relevant) return
    const t = setTimeout(clearDmRoll, 10000)
    return () => clearTimeout(t)
  }, [dmRoll, characterId])

  useEffect(() => {
    if (!myTurnActive || !combatActive) return
    setTurnPromptVisible(true)
    const t = setTimeout(() => setTurnPromptVisible(false), 2200)
    return () => clearTimeout(t)
  }, [myTurnActive, combatActive, combatRound])

  const showDmRoll = dmRoll && (dmRoll.targetId === 'all' || dmRoll.targetId === characterId)

  const resolveIncomingSavePrompt = (isManual = false, manualTotal = null) => {
    if (!dmRoll?.savePrompt) return
    const saveAbility = String(dmRoll.savePrompt.saveAbility || '').toUpperCase()
    const saveEntry = (char.savingThrows || []).find(s => String(s.name || '').toUpperCase() === saveAbility)
    const mod = parseModNum(saveEntry?.mod || 0)
    const d20 = Math.floor(Math.random() * 20) + 1
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + mod, rollType: 'save' })
    const total = isManual ? (parseInt(manualTotal, 10) || 0) : modded.total
    const success = total >= (dmRoll.savePrompt.saveDc || 10)
    setRollResult({ type: 'save', name: `${saveAbility} vs ${dmRoll.savePrompt.actionName}`, d20, mod, total, crit: d20 === 20, fumble: d20 === 1 })
    pushRoll(`${dmRoll.savePrompt.actionName}: ${saveAbility} save total ${total} vs DC ${dmRoll.savePrompt.saveDc} → ${success ? 'SUCCESS' : 'FAIL'}`, char.name)
    clearDmRoll()
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>

      {/* ── DM Roll notification ── */}
      {showDmRoll && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#141814',
          border: '2px solid var(--warning)',
          borderRadius: 12,
          padding: '14px 20px',
          zIndex: 300,
          minWidth: 240, maxWidth: 340,
          boxShadow: '0 4px 24px rgba(196,160,64,0.4)',
          textAlign: 'center'
        }}>
          <button onClick={clearDmRoll} style={{
            position: 'absolute', top: 6, right: 10,
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 16
          }}>×</button>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
            {dmRoll.kind === 'save-prompt' ? 'DM Save Prompt' : 'DM Roll'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{dmRoll.text}</div>
          {dmRoll.kind === 'save-prompt' && dmRoll.savePrompt && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => resolveIncomingSavePrompt(false)}
                style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Roll Save
              </button>
              <button
                onClick={() => {
                  const raw = window.prompt('Enter your save total')
                  if (raw == null) return
                  resolveIncomingSavePrompt(true, raw)
                }}
                style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: `${char.colour}20`, border: `1px solid ${char.colour}70`, borderRadius: 'var(--radius)', color: char.colour, cursor: 'pointer' }}
              >
                Enter Total
              </button>
            </div>
          )}
        </div>
      )}

      {turnPromptVisible && (
        <div style={{
          position: 'fixed',
          top: 76,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 260,
          background: '#141814',
          border: `1px solid ${char.colour}88`,
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: `0 4px 24px ${char.colour}40`,
          minWidth: 220,
          textAlign: 'center'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: char.colour, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Your Turn
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            A:{myEconomy.actionAvailable ? 'ready' : 'used'} · BA:{myEconomy.bonusActionAvailable ? 'ready' : 'used'} · R:{myEconomy.reactionAvailable ? 'ready' : 'used'}
          </div>
        </div>
      )}

      {combatActive && (
        <div style={{ margin: '10px 0 12px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: myTurnActive ? `${char.colour}12` : 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: myTurnActive ? char.colour : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {myTurnActive ? 'Your Turn' : `Active: ${combatCombatants[combatActiveCombatantIndex]?.name || '—'}`}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              Next: {nextCombatant?.name || '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: myEconomy.actionAvailable ? 'var(--green-bright)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Action {myEconomy.actionAvailable ? 'ready' : 'used'}</span>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: myEconomy.bonusActionAvailable ? 'var(--green-bright)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Bonus {myEconomy.bonusActionAvailable ? 'ready' : 'used'}</span>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: myEconomy.reactionAvailable ? 'var(--green-bright)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Reaction {myEconomy.reactionAvailable ? 'ready' : 'used'}</span>
          </div>
        </div>
      )}

      {/* ── Large Portrait ── */}
      <div style={{
        width: '100%',
        height: 320,
        position: 'relative',
        overflow: 'hidden',
        borderBottom: `3px solid ${char.colour}`,
        marginBottom: 0
      }}>
        <img
          src={`characters/${char.image}`}
          alt={char.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          onError={e => { e.target.style.display = 'none' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(8,10,8,0.95) 100%)'
        }} />
        {/* Character info overlaid on portrait */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', letterSpacing: '0.04em', lineHeight: 1.1 }}>
              {char.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              {char.species} · {char.class} {char.level} · {char.subclass}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>
              {char.background}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, color: hpColour, lineHeight: 1, fontWeight: 600 }}>
              {curHp}
              {tempHp > 0 && <span style={{ fontSize: 16, color: 'var(--info)' }}>+{tempHp}</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>/ {char.stats.maxHp} HP</div>
            {concentration && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                Concentrating
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ height: 5, background: 'var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${hpPct}%`, background: hpColour, transition: 'width 0.5s ease, background 0.5s ease' }} />
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'AC', value: char.stats.ac },
            { label: 'Speed', value: char.stats.speed + ' ft.' },
            { label: 'Init', value: char.stats.initiative },
            { label: 'Prof', value: char.stats.proficiencyBonus },
            { label: 'Save DC', value: char.stats.spellSaveDC }
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '10px 6px', textAlign: 'center'
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Buffs indicator */}
        {myBuffs.length > 0 && (
          <div style={{
            padding: '8px 12px', marginBottom: 12,
            background: '#9070a015', border: '1px solid #9070a040',
            borderRadius: 'var(--radius-lg)', display: 'flex', gap: 8, alignItems: 'center'
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#b090c0' }}>
              {myBuffs.map(b => b.type === 'bardic' ? 'Bardic Inspiration (1d6)' : b.type).join(', ')} available
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>— use when rolling</span>
          </div>
        )}

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: tab === t ? char.colour + '20' : 'transparent',
              border: `1px solid ${tab === t ? char.colour + '60' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}>
              {t === 'actions' ? '⚔ Actions' : t}
            </button>
          ))}
        </div>

        {/* ════ STATS TAB ════ */}
        {tab === 'stats' && (
          <>
            {/* Ability scores */}
            <Section title="Ability Scores">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {Object.entries(char.abilityScores).map(([stat, val]) => (
                  <div key={stat} style={{
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '10px 4px', textAlign: 'center'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-primary)', fontWeight: 500 }}>{val.mod}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{stat}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{val.score}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Saving throws */}
            <Section title="Saving Throws">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {char.savingThrows.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: s.proficient ? char.colour : 'var(--border)',
                      border: `1px solid ${s.proficient ? char.colour : 'var(--border-bright)'}`
                    }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: s.proficient ? 'var(--green-bright)' : 'var(--text-secondary)', minWidth: 28 }}>
                      {s.mod}
                    </span>
                    <span style={{ fontSize: 13, color: s.proficient ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>
                      {s.name}
                    </span>
                    <RollBtn colour={char.colour} small onClick={() => rollSave(s)} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Skills — all 18 */}
            <Section title="Skills">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {char.skills.map(s => (
                  <div key={s.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                    opacity: s.proficient ? 1 : 0.65
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: s.expertise ? char.colour : s.proficient ? 'var(--green-mid)' : 'transparent',
                      border: `1px solid ${s.expertise ? char.colour : s.proficient ? 'var(--green-mid)' : 'var(--border-bright)'}`
                    }} />
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: s.expertise ? char.colour : s.proficient ? 'var(--green-bright)' : 'var(--text-secondary)',
                      minWidth: 28
                    }}>
                      {s.mod}
                    </span>
                    <span style={{ fontSize: 13, color: s.proficient ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>
                      {s.name}
                    </span>
                    {s.expertise && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: char.colour, textTransform: 'uppercase', letterSpacing: '0.08em' }}>exp</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{s.ability}</span>
                    <RollBtn colour={s.proficient ? char.colour : 'var(--text-muted)'} small onClick={() => rollSkill(s)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                <span>● Proficient</span>
                <span style={{ color: char.colour }}>● Expertise</span>
              </div>
            </Section>

            {/* Passive scores */}
            <Section title="Passive Scores">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Object.entries(char.passiveScores).map(([k, v]) => (
                  <div key={k} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{k}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Weapons */}
            <Section title="Weapons & Attacks">
              {char.weapons.map(w => (
                <div key={w.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '6px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{w.name}</div>
                    {w.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{w.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green-bright)' }}>{w.hit}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{w.damage}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Spell Attack: {char.stats.spellAttack} · Save DC: {char.stats.spellSaveDC}
              </div>
            </Section>

            {/* Sorcery Points */}
            {char.sorceryPoints && (
              <Section title="Sorcery Points">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {Array.from({ length: char.sorceryPoints.max }).map((_, i) => (
                    <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--green-mid)', border: '1px solid var(--green-dim)' }} />
                  ))}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                    {char.sorceryPoints.max} / Long Rest
                  </span>
                </div>
              </Section>
            )}
          </>
        )}

        {/* ════ SPELLS TAB ════ */}
        {tab === 'spells' && (
          <>
            <Section title="Spell Slots (Live)">
              {Object.entries(spellSlots).map(([level, slot]) => {
                const remaining = slot.max - slot.used
                return (
                  <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', width: 50, textTransform: 'uppercase' }}>
                      Level {level}
                    </span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {Array.from({ length: slot.max }).map((_, i) => (
                        <div key={i} style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: i < remaining ? 'var(--green-mid)' : 'transparent',
                          border: '1px solid var(--green-dim)', transition: 'background 0.3s'
                        }} />
                      ))}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: remaining === 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {remaining}/{slot.max}
                    </span>
                  </div>
                )
              })}
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Spell Attack: {char.stats.spellAttack} · Save DC: {char.stats.spellSaveDC} · Ability: {char.stats.spellcastingAbility}
              </div>
            </Section>

            {/* Active spell panel */}
            {activeSpell && (() => {
              const spell = activeSpell
              const needsEnemyTarget = combatActive && (spell.target === 'enemy' || spell.target === 'any')
              const isAreaOrMulti = spell.targetMode === 'area_all' || spell.targetMode === 'area_selective' || spell.targetMode === 'area' || spell.targetMode === 'multi_select'
              const needsAllyTarget = spell.target === 'ally'
              const isCantrip = spell.level === 0
              const slotLvl = spellSlotLevel ?? spell.minSlot
              const slotsForLvl = slotLvl ? (spellSlots[slotLvl] || { max: 0, used: 0 }) : null
              const noSlotLeft = !isCantrip && slotsForLvl && slotsForLvl.used >= slotsForLvl.max
              const enemyTargetReady = isAreaOrMulti ? spellTargets.length > 0 : !!spellTarget
              const canCast = !noSlotLeft && (!needsEnemyTarget || enemyTargetReady) && (!needsAllyTarget || spellTarget)

              return (
                <div style={{
                  background: `${char.colour}12`, border: `1px solid ${char.colour}40`,
                  borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>{spell.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                        {spell.castingTime} · {spell.range}
                        {spell.concentration ? ' · Concentration' : ''}
                        {spell.aoe ? ` · ${spell.aoe}` : ''}
                      </div>
                    </div>
                    <button onClick={closeSpell} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                    {spell.description}
                  </div>

                  {/* Mechanic badge */}
                  <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: spell.actionType === 'bonus_action' ? 'rgba(196,160,64,0.2)' : spell.actionType === 'reaction' ? 'rgba(120,140,220,0.2)' : 'rgba(122,184,106,0.12)', border: '1px solid var(--border)', borderRadius: 4, color: spell.actionType === 'bonus_action' ? 'var(--warning)' : spell.actionType === 'reaction' ? '#a6b5ff' : 'var(--green-bright)' }}>
                      {spell.actionType === 'bonus_action' ? 'Bonus Action' : spell.actionType === 'reaction' ? 'Reaction' : spell.actionType === 'action' ? 'Action' : spell.castingTime}
                    </span>
                    {spell.mechanic === 'attack' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(180,80,80,0.15)', border: '1px solid rgba(180,80,80,0.3)', borderRadius: 4, color: 'var(--danger)' }}>
                        Attack +{spell.toHit} · {spell.damage ? `${spell.damage.count}d${spell.damage.sides}${spell.damage.mod ? `+${spell.damage.mod}` : ''} ${spell.damage.type}` : 'on hit effect'}
                      </span>
                    )}
                    {spell.mechanic === 'save' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(180,120,40,0.15)', border: '1px solid rgba(180,120,40,0.3)', borderRadius: 4, color: 'var(--warning)' }}>
                        {spell.saveType} DC {spell.saveDC}
                        {spell.damage ? ` · ${spell.damage.count}d${spell.damage.sides} ${spell.damage.type}` : ''}
                      </span>
                    )}
                    {spell.mechanic === 'auto' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(100,100,220,0.15)', border: '1px solid rgba(100,100,220,0.3)', borderRadius: 4, color: '#a0a0ff' }}>
                        Auto-hit · {spell.missiles} missiles · {spell.damage.count}d{spell.damage.sides}+{spell.damage.mod} {spell.damage.type} each
                      </span>
                    )}
                    {spell.mechanic === 'heal' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(50,160,80,0.15)', border: '1px solid rgba(50,160,80,0.3)', borderRadius: 4, color: 'var(--green-bright)' }}>
                        Heal {spell.healDice ? `${spell.healDice.count}d${spell.healDice.sides}+${spell.healDice.mod}` : ''}
                      </span>
                    )}
                    {spell.mechanic === 'utility' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(120,120,120,0.15)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)' }}>
                        Utility
                      </span>
                    )}
                    {(spell.combatProfile?.rules?.needs_manual_resolution || spell.targetMode === 'special') && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(176,144,48,0.15)', border: '1px solid rgba(176,144,48,0.3)', borderRadius: 4, color: 'var(--warning)' }}>
                        Manual Resolution
                      </span>
                    )}
                  </div>

                  {/* Slot level picker */}
                  {!isCantrip && spell.upcast && spell.minSlot && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Slot Level</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {Object.keys(spellSlots).filter(l => parseInt(l) >= spell.minSlot).map(lvl => {
                          const sl = spellSlots[lvl]
                          const empty = sl.used >= sl.max
                          return (
                            <button key={lvl} onClick={() => setSpellSlotLevel(parseInt(lvl))} disabled={empty} style={{
                              padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
                              background: spellSlotLevel === parseInt(lvl) ? `${char.colour}30` : 'transparent',
                              border: `1px solid ${spellSlotLevel === parseInt(lvl) ? char.colour : 'var(--border)'}`,
                              borderRadius: 'var(--radius)', color: empty ? 'var(--text-muted)' : spellSlotLevel === parseInt(lvl) ? char.colour : 'var(--text-secondary)',
                              cursor: empty ? 'not-allowed' : 'pointer', opacity: empty ? 0.4 : 1
                            }}>
                              L{lvl} ({sl.max - sl.used})
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Target selector */}
                  {needsEnemyTarget && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Target</div>
                      {enemies.length === 0
                        ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>No living enemies in combat</div>
                        : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {!isAreaOrMulti && <button onClick={() => setSpellTarget(null)} style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: !spellTarget ? 'var(--bg-raised)' : 'transparent', border: `1px solid ${!spellTarget ? 'var(--border-bright)' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: !spellTarget ? 'var(--text-secondary)' : 'var(--text-muted)', cursor: 'pointer' }}>Free Roll</button>}
                            {enemies.map(e => (
                              <button
                                key={e.id}
                                onClick={() => {
                                  if (isAreaOrMulti) {
                                    setSpellTargets(prev => (
                                      prev.some(t => t.id === e.id)
                                        ? prev.filter(t => t.id !== e.id)
                                        : [...prev, e]
                                    ))
                                  } else {
                                    setSpellTarget(e)
                                  }
                                }}
                                style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: (isAreaOrMulti ? spellTargets.some(t => t.id === e.id) : spellTarget?.id === e.id) ? `${char.colour}20` : 'transparent', border: `1px solid ${(isAreaOrMulti ? spellTargets.some(t => t.id === e.id) : spellTarget?.id === e.id) ? char.colour + '60' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: (isAreaOrMulti ? spellTargets.some(t => t.id === e.id) : spellTarget?.id === e.id) ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                {e.name} ({e.curHp}/{e.maxHp} HP)
                              </button>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  )}

                  {needsAllyTarget && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Target</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setSpellTarget({ id: characterId, name: char.name })} style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: spellTarget?.id === characterId ? `${char.colour}20` : 'transparent', border: `1px solid ${spellTarget?.id === characterId ? char.colour + '60' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: spellTarget?.id === characterId ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>{char.name} (self)</button>
                        {partyChars.map(pc => {
                          const sc = playerCharacters[pc.id]
                          return (
                            <button key={pc.id} onClick={() => setSpellTarget({ id: pc.id, name: sc?.name || pc.id })} style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: spellTarget?.id === pc.id ? `${char.colour}20` : 'transparent', border: `1px solid ${spellTarget?.id === pc.id ? char.colour + '60' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: spellTarget?.id === pc.id ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>{sc?.name || pc.id}</button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {noSlotLeft && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', marginBottom: 8 }}>No L{slotLvl} slots remaining</div>
                  )}

                  <button
                    onClick={() => canCast && castSpell(spell, spellSlotLevel ?? spell.minSlot, spellTarget, spellTargets)}
                    disabled={!canCast}
                    style={{
                      width: '100%', padding: '10px',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      background: canCast ? `${char.colour}25` : 'transparent',
                      border: `1px solid ${canCast ? char.colour + '70' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', color: canCast ? char.colour : 'var(--text-muted)',
                      cursor: canCast ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {spell.mechanic === 'attack' ? 'Roll Attack' :
                     spell.mechanic === 'save' ? `Cast — ${spell.saveType} DC ${spell.saveDC}` :
                     spell.mechanic === 'auto' ? 'Roll Missiles' :
                     spell.mechanic === 'heal' ? 'Roll Healing' :
                     'Cast Spell'}
                  </button>
                </div>
              )
            })()}

            {Object.entries(char.spells).map(([level, spells]) => (
              <Section key={level} title={level === 'cantrips' ? 'Cantrips' : `Level ${level} Spells`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {spells.map(spell => {
                    const displaySpell = resolveSpellForCasting(spell)
                    const isActive = activeSpell?.name === displaySpell.name
                    const slotKey = displaySpell.minSlot || (displaySpell.level > 0 ? displaySpell.level : null)
                    const slot = slotKey ? (spellSlots[slotKey] || { max: 0, used: 0 }) : null
                    const noSlots = !!(slot && slot.used >= slot.max)
                    const isCantrip = displaySpell.level === 0
                    const mechColour = displaySpell.mechanic === 'attack' ? 'var(--danger)'
                      : displaySpell.mechanic === 'save' ? 'var(--warning)'
                      : displaySpell.mechanic === 'auto' ? '#a0a0ff'
                      : displaySpell.mechanic === 'heal' ? 'var(--green-bright)'
                      : 'var(--text-muted)'

                    return (
                      <div key={displaySpell.name} style={{
                        background: isActive ? `${char.colour}15` : 'var(--bg-raised)',
                        border: `1px solid ${isActive ? char.colour + '50' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)', padding: '10px 12px',
                        opacity: noSlots && !isCantrip ? 0.5 : 1,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{displaySpell.name}</span>
                              {displaySpell.concentration && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--warning)', border: '1px solid rgba(196,160,64,0.3)', borderRadius: 3, padding: '1px 4px' }}>CONC</span>}
                              {displaySpell.limitedUse && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px' }}>{displaySpell.limitedUse}</span>}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: mechColour, marginTop: 2 }}>
                              {displaySpell.mechanic === 'attack' ? `+${displaySpell.toHit} to hit · ${displaySpell.damage?.count}d${displaySpell.damage?.sides} ${displaySpell.damage?.type}`
                               : displaySpell.mechanic === 'save' ? `${displaySpell.saveType} DC ${displaySpell.saveDC}${displaySpell.damage ? ` · ${displaySpell.damage.count}d${displaySpell.damage.sides} ${displaySpell.damage.type}` : ''}`
                               : displaySpell.mechanic === 'auto' ? `${displaySpell.missiles} missiles · ${displaySpell.damage?.count}d${displaySpell.damage?.sides}+${displaySpell.damage?.mod} ${displaySpell.damage?.type}`
                               : displaySpell.mechanic === 'heal' ? `${displaySpell.healDice?.count}d${displaySpell.healDice?.sides}+${displaySpell.healDice?.mod} HP`
                               : displaySpell.castingTime}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: displaySpell.actionType === 'bonus_action' ? 'var(--warning)' : displaySpell.actionType === 'reaction' ? '#a6b5ff' : 'var(--text-muted)', marginTop: 2 }}>
                              {displaySpell.actionType === 'bonus_action' ? 'Bonus Action' : displaySpell.actionType === 'reaction' ? 'Reaction' : displaySpell.actionType === 'action' ? 'Action' : displaySpell.castingTime}
                            </div>
                          </div>
                          <button
                            onClick={() => isActive ? closeSpell() : openSpell(displaySpell)}
                            style={{
                              padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              background: isActive ? `${char.colour}30` : 'transparent',
                              border: `1px solid ${isActive ? char.colour : 'var(--border)'}`,
                              borderRadius: 'var(--radius)',
                              color: isActive ? char.colour : 'var(--text-secondary)',
                              cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            {isActive ? 'Cancel' : 'Cast'}
                          </button>
                        </div>
                        {displaySpell.description && (
                          <div style={{
                            marginTop: 7, paddingTop: 7,
                            borderTop: '1px solid var(--border)',
                            fontSize: 12, color: 'var(--text-muted)',
                            fontStyle: 'italic', lineHeight: 1.55,
                          }}>
                            {displaySpell.description}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>
            ))}
          </>
        )}

        {/* ════ ACTIONS TAB ════ */}
        {tab === 'actions' && (
          <>
            {/* Attack section */}
            <Section title="⚔ Attack">
              {/* Target selector */}
              {combatActive && enemies.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Select Target
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedTarget(null)}
                      style={{
                        padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                        background: !selectedTarget ? 'var(--bg-raised)' : 'transparent',
                        border: `1px solid ${!selectedTarget ? 'var(--border-bright)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)', color: !selectedTarget ? 'var(--text-secondary)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Free Roll
                    </button>
                    {enemies.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedTarget(e)}
                        style={{
                          padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                          background: selectedTarget?.id === e.id ? `${char.colour}20` : 'transparent',
                          border: `1px solid ${selectedTarget?.id === e.id ? char.colour + '60' : 'var(--border)'}`,
                          borderRadius: 'var(--radius)',
                          color: selectedTarget?.id === e.id ? 'var(--text-primary)' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {e.name} ({e.curHp}/{e.maxHp} HP, AC {e.ac})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!combatActive && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
                  No active combat — rolls won't be applied to enemies
                </div>
              )}

              {combatActive && enemies.length === 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
                  No living enemies in combat
                </div>
              )}

              {/* Weapon cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {char.weapons.map(w => (
                  <div key={w.name} style={{
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{w.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {w.hit} · {w.damage}
                      </div>
                      {w.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{w.notes}</div>}
                    </div>
                    <button
                      onClick={() => rollAttack(w, selectedTarget)}
                      style={{
                        padding: '8px 16px',
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: `${char.colour}20`, border: `1px solid ${char.colour}60`,
                        borderRadius: 'var(--radius)', color: char.colour, cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {isAttackRoll(w.hit) ? 'Roll Attack' : 'Roll Dmg'}
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            {/* Heal section */}
            {char.healingActions && char.healingActions.length > 0 && (
              <Section title="💚 Heal">
                {/* Target selector */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Heal Target
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setHealTarget(characterId)}
                      style={{
                        padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                        background: healTarget === characterId ? `${char.colour}20` : 'transparent',
                        border: `1px solid ${healTarget === characterId ? char.colour + '60' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        color: healTarget === characterId ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {char.name} (self)
                    </button>
                    {partyChars.map(pc => {
                      const sc = playerCharacters[pc.id]
                      return (
                        <button
                          key={pc.id}
                          onClick={() => setHealTarget(pc.id)}
                          style={{
                            padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                            background: healTarget === pc.id ? `${char.colour}20` : 'transparent',
                            border: `1px solid ${healTarget === pc.id ? char.colour + '60' : 'var(--border)'}`,
                            borderRadius: 'var(--radius)',
                            color: healTarget === pc.id ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {sc?.name || pc.id}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {char.healingActions.map(ha => (
                  <div key={ha.name} style={{
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                    marginBottom: 8
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{ha.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {ha.note || (ha.baseDice
                            ? `${ha.baseDice.count}d${ha.baseDice.sides}+${ha.baseDice.modifier}`
                            : ha.dice ? `${ha.dice.count}d${ha.dice.sides}+${ha.dice.modifier}` : ''
                          )}
                          {ha.action ? ` · ${ha.action}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Slot level picker if applicable */}
                    {ha.slotLevel && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {Array.from({ length: (ha.maxSlotLevel || ha.slotLevel) - ha.slotLevel + 1 }).map((_, i) => {
                          const lvl = ha.slotLevel + i
                          return (
                            <button
                              key={lvl}
                              onClick={() => setHealSlot(lvl)}
                              style={{
                                padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
                                background: healSlot === lvl ? 'var(--green-dim)' : 'transparent',
                                border: `1px solid ${healSlot === lvl ? 'var(--green-mid)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius)',
                                color: healSlot === lvl ? 'var(--green-bright)' : 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              L{lvl}
                            </button>
                          )
                        })}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                          {ha.baseDice && healSlot > ha.slotLevel
                            ? `${ha.baseDice.count + (healSlot - ha.slotLevel)}d${ha.baseDice.sides}+${ha.baseDice.modifier}`
                            : ha.baseDice ? `${ha.baseDice.count}d${ha.baseDice.sides}+${ha.baseDice.modifier}` : ''
                          }
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => rollHeal(ha, healSlot, healTarget || characterId)}
                      disabled={!healTarget && ha.target === 'ally'}
                      style={{
                        width: '100%', padding: '9px',
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
                        borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer'
                      }}
                    >
                      Roll Healing{healTarget ? ` → ${playerCharacters[healTarget]?.name || 'Self'}` : ''}
                    </button>
                  </div>
                ))}
              </Section>
            )}

            {/* Buff section — Bardic Inspiration (Dorothea only) */}
            {char.buffActions && char.buffActions.length > 0 && (
              <Section title="✨ Buffs">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: char.colour, marginBottom: 10 }}>
                  {bardicInspirationUses} / {char.buffActions[0]?.maxUses} uses remaining
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Give Inspiration To
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {partyChars.map(pc => {
                      const sc = playerCharacters[pc.id]
                      const alreadyHas = (activeBuffs[pc.id] || []).some(b => b.type === 'bardic')
                      return (
                        <button
                          key={pc.id}
                          onClick={() => setBardicTarget(bardicTarget === pc.id ? null : pc.id)}
                          style={{
                            padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                            background: bardicTarget === pc.id ? `${char.colour}20` : 'transparent',
                            border: `1px solid ${bardicTarget === pc.id ? char.colour + '60' : 'var(--border)'}`,
                            borderRadius: 'var(--radius)',
                            color: alreadyHas ? 'var(--text-muted)' : bardicTarget === pc.id ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            opacity: alreadyHas ? 0.5 : 1
                          }}
                        >
                          {sc?.name || pc.id}{alreadyHas ? ' ✓' : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {char.buffActions.map(ba => (
                  <div key={ba.name} style={{
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px'
                  }}>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{ba.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                      1d{ba.die} · {ba.action} · {ba.range}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{ba.description}</div>
                    <button
                      onClick={() => bardicTarget && grantBardic(bardicTarget)}
                      disabled={!bardicTarget || bardicInspirationUses <= 0}
                      style={{
                        width: '100%', padding: '9px',
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: bardicTarget && bardicInspirationUses > 0 ? `${char.colour}20` : 'var(--bg-raised)',
                        border: `1px solid ${bardicTarget && bardicInspirationUses > 0 ? char.colour + '60' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        color: bardicTarget && bardicInspirationUses > 0 ? char.colour : 'var(--text-muted)',
                        cursor: bardicTarget && bardicInspirationUses > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Grant Inspiration{bardicTarget ? ` → ${playerCharacters[bardicTarget]?.name || ''}` : ''}
                    </button>
                  </div>
                ))}
              </Section>
            )}
          </>
        )}

        {/* ════ FEATURES TAB ════ */}
        {tab === 'features' && (
          <>
            {char.features.map(f => (
              <Section key={f.name} title={f.name}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: char.colour || 'var(--green-bright)', marginBottom: 8 }}>{f.uses}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.description}</div>
              </Section>
            ))}

            {char.magicItems && char.magicItems.length > 0 && char.magicItems.map(item => (
              <Section key={item.name} title={`✦ ${item.name}`}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.description}</div>
              </Section>
            ))}

            <Section title="Background">
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>{char.backstory}</div>
            </Section>

            <Section title="Senses & Languages">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}><strong>Senses:</strong> {char.senses}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Languages:</strong> {char.languages}</div>
            </Section>
          </>
        )}

        {/* ════ EQUIPMENT TAB ════ */}
        {tab === 'equipment' && (
          <Section title="Equipment">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {char.equipment.map(item => (
                <span key={item} style={{
                  padding: '4px 10px',
                  background: item.includes('Attuned') ? `${char.colour}18` : 'var(--bg-raised)',
                  border: `1px solid ${item.includes('Attuned') ? char.colour + '40' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  fontSize: 12,
                  color: item.includes('Attuned') ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  {item}
                </span>
              ))}
            </div>
          </Section>
        )}

      </div>

      {/* ── Roll Result Panel (floating) ── */}
      <RollResultPanel
        result={rollResult}
        charColour={char.colour}
        onRollDamage={pendingSpellDmg ? rollSpellDamage : rollDamageFromPending}
        onUseBardicInspiration={useBardicInspiration}
        hasBardic={hasBardic}
        onDismiss={dismissRoll}
      />

      {/* ── Initiative Phase Prompt ── */}
      {initiativePhase && combatActive && (() => {
        const myCombatant = combatCombatants.find(c => c.id === characterId)
        if (!myCombatant || myCombatant.initiativeSet) return null
        const iniBonus = parseModNum(char?.stats?.initiative || '+0')
        const rollInitiative = () => {
          const d20 = Math.floor(Math.random() * 20) + 1
          const total = d20 + iniBonus
          submitInitiative(characterId, total)
          pushRoll(`Initiative: d20(${d20}) + ${iniBonus >= 0 ? '+' : ''}${iniBonus} = ${total}`, char.name)
        }
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              background: 'var(--bg-surface)',
              border: `2px solid ${char.colour}80`,
              borderRadius: 16, padding: '32px 36px', textAlign: 'center',
              boxShadow: `0 8px 40px ${char.colour}30, 0 2px 8px rgba(0,0,0,0.8)`,
              maxWidth: 320
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                Combat Begins
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: char.colour, marginBottom: 6 }}>
                Roll for Initiative
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                d20 {iniBonus >= 0 ? `+${iniBonus}` : iniBonus} (Initiative)
              </div>
              <button
                onClick={rollInitiative}
                style={{
                  padding: '12px 32px',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  background: `${char.colour}25`,
                  border: `2px solid ${char.colour}80`,
                  borderRadius: 'var(--radius-lg)',
                  color: char.colour, cursor: 'pointer'
                }}
              >
                Roll
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
