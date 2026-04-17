import { useState, useEffect, useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { parseCastingTimeMeta, ensureActionEconomy, applyDeterministicRollModifiers, getAcWithEffects } from '@shared/lib/combatRules.js'
import { inferHalfOnSuccess, makeSavePromptPayload, resolveSpellPath } from '@shared/lib/domain/spellResolution.js'
import { applySpellConcentrationAfterCast } from '@shared/lib/combat/spellCombatResolver.js'
import { rollD20Test } from '@shared/lib/rules/d20Test.js'
import {
  resolvePlayerD20Modifiers,
} from '@shared/lib/rules/conditionRollModifiers.js'
import { shouldForceCriticalOnHit } from '@shared/lib/rules/criticalConditionRules.js'
import { formatDcWithLabel } from '@shared/lib/rules/dcDisplay.js'
import { rollDie, rollDice, parseModNum, isAttackRoll, parseDiceNotation } from '../lib/diceHelpers'
import { playSfx } from '@shared/lib/sfxEngine.js'

export default function useCharacterActions(characterId) {
  const characters = usePlayerStore(s => s.characters)
  const combatActive = usePlayerStore(s => s.combatActive)
  const combatRound = usePlayerStore(s => s.combatRound)
  const combatCombatants = usePlayerStore(s => s.combatCombatants)
  const activeBuffs = usePlayerStore(s => s.activeBuffs)
  const bardicInspirationUses = usePlayerStore(s => s.bardicInspirationUses)
  const applyDamageToEnemy = usePlayerStore(s => s.applyDamageToEnemy)
  const applyHealingToCharacter = usePlayerStore(s => s.applyHealingToCharacter)
  const applyDamageToCharacter = usePlayerStore(s => s.applyDamageToCharacter)
  const grantBardicInspiration = usePlayerStore(s => s.grantBardicInspiration)
  const consumeBuff = usePlayerStore(s => s.consumeBuff)
  const pushRoll = usePlayerStore(s => s.pushRoll)
  const pushSavePrompt = usePlayerStore(s => s.pushSavePrompt)
  const useSpellSlot = usePlayerStore(s => s.useSpellSlot)
  const dmRoll = usePlayerStore(s => s.dmRoll)
  const qaHoldSavePromptUntilDismissed = usePlayerStore(s => s.qaHoldSavePromptUntilDismissed)
  const clearDmRoll = usePlayerStore(s => s.clearDmRoll)
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const companionSpellSlots = usePlayerStore(s => s.companionSpellSlots)
  const initiativePhase = usePlayerStore(s => s.initiativePhase)
  const combatActiveCombatantIndex = usePlayerStore(s => s.combatActiveCombatantIndex)
  const submitInitiative = usePlayerStore(s => s.submitInitiative)
  const tryUseCombatActionType = usePlayerStore(s => s.tryUseCombatActionType)
  const getCombatantActionEconomy = usePlayerStore(s => s.getCombatantActionEconomy)
  const toggleMyActionEconomyField = usePlayerStore(s => s.toggleMyActionEconomyField)
  const ilyaAssignedTo = usePlayerStore(s => s.ilyaAssignedTo)
  const canEditCharacterState = usePlayerStore(s => s.canEditCharacterState)
  const updateMyCharacterHp = usePlayerStore(s => s.updateMyCharacterHp)
  const updateMyCharacterTempHp = usePlayerStore(s => s.updateMyCharacterTempHp)
  const setMyCharacterConcentration = usePlayerStore(s => s.setMyCharacterConcentration)
  const patchMyCharacterTacticalJson = usePlayerStore(s => s.patchMyCharacterTacticalJson)
  const setMyCharacterConditions = usePlayerStore(s => s.setMyCharacterConditions)
  const markMyCharacterDeathSave = usePlayerStore(s => s.markMyCharacterDeathSave)
  const rollMyDeathSave = usePlayerStore(s => s.rollMyDeathSave)
  const saveMyCharacterSheet = usePlayerStore(s => s.saveMyCharacterSheet)

  const char = playerCharacters[characterId]
  const liveChar = characters.find(c => c.id === characterId)

  const [rollResult, setRollResult] = useState(null)
  const [pendingAttack, setPendingAttack] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [healTarget, setHealTarget] = useState(null)
  const [healSlot, setHealSlot] = useState(1)
  const [bardicTarget, setBardicTarget] = useState(null)
  const [activeSpell, setActiveSpell] = useState(null)
  const [spellSlotLevel, setSpellSlotLevel] = useState(null)
  const [spellTarget, setSpellTarget] = useState(null)
  const [spellTargets, setSpellTargets] = useState([])
  const [pendingSpellDmg, setPendingSpellDmg] = useState(null)
  const [turnPromptVisible, setTurnPromptVisible] = useState(false)
  const [manualSaveTotal, setManualSaveTotal] = useState('')

  const combatRowForPlayer = combatCombatants.find((c) => c.id === characterId)
  const liveSource = combatActive && combatRowForPlayer ? combatRowForPlayer : liveChar
  const curHp = liveSource?.curHp ?? char?.stats?.maxHp ?? 0
  const tempHp = liveSource?.tempHp ?? 0
  const spellSlots = liveChar?.spellSlots ?? companionSpellSlots[characterId] ?? char?.spellSlots ?? {}
  const concentration = liveSource?.concentration ?? false
  const concentrationSpell = liveSource?.concentrationSpell ?? liveSource?.tacticalJson?.concentrationSpell ?? ''
  const deathSaves = liveChar?.deathSaves ?? { successes: 0, failures: 0 }
  const exhaustionLevel = Math.max(0, Math.min(6, Number(liveSource?.exhaustionLevel ?? liveSource?.tacticalJson?.exhaustionLevel) || 0))
  const conditionsLive = liveSource?.conditions ?? []
  const inspiration = !!(liveSource?.inspiration ?? liveSource?.tacticalJson?.inspiration)
  const classResources = liveSource?.classResources ?? liveSource?.tacticalJson?.classResources ?? []
  const canEditState = canEditCharacterState(characterId)
  const maxHp = char?.stats?.maxHp ?? 0
  const hpPct = maxHp > 0 ? (curHp / maxHp) * 100 : 0
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

  const actorExhaustionLevel = () => {
    let n = Math.max(0, Math.min(6, Number(myCombatant?.exhaustionLevel) || 0))
    if (n === 0 && (conditionsLive || []).some((c) => String(c).toLowerCase() === 'exhaustion')) n = 1
    return n
  }

  const saveAbilityFromSaveRow = (save) => {
    const raw = String(save?.name || '').toLowerCase()
    if (raw.startsWith('str')) return 'str'
    if (raw.startsWith('dex')) return 'dex'
    if (raw.startsWith('con')) return 'con'
    if (raw.startsWith('int')) return 'int'
    if (raw.startsWith('wis')) return 'wis'
    if (raw.startsWith('cha')) return 'cha'
    return raw.slice(0, 3)
  }

  const inferAttackRange = (weaponOrSpell) => {
    const r = String(weaponOrSpell?.range || '')
    const n = String(weaponOrSpell?.name || '')
    if (/ranged|range\s*\(|\d+\/\d+\s*ft/i.test(r)) return 'ranged'
    if (/\bbow\b|\bcrossbow\b|\bdart\b|\bsling\b|\bjavelin\b|\bneedle\b|\bbolt\b/i.test(n)) return 'ranged'
    return 'melee'
  }

  const resolveSpellForCasting = (spell) => {
    const next = { ...spell }
    const st = char?.stats && typeof char.stats === 'object' && !Array.isArray(char.stats) ? char.stats : {}
    if (!next.mechanic) next.mechanic = next.combatProfile?.resolutionType || 'utility'
    if (!next.targetMode) next.targetMode = next.combatProfile?.targetMode || 'single'
    const castingMeta = parseCastingTimeMeta(next.castingTime)
    next.actionType = next.actionType || castingMeta.actionType
    next.isBonusAction = next.isBonusAction ?? castingMeta.isBonusAction
    next.isReaction = next.isReaction ?? castingMeta.isReaction
    const tm = next.targetMode
    if (!next.target) {
      if (tm === 'self') next.target = 'self'
      else if (tm === 'single' || tm === 'multi_select' || (typeof tm === 'string' && tm.startsWith('area'))) {
        next.target = 'enemy'
      }
    }
    if (!next.saveType) next.saveType = next.combatProfile?.saveAbility || null
    if (!next.saveDC && next.saveType) next.saveDC = st.spellSaveDC
    if (!next.toHit && next.mechanic === 'attack') {
      const parsed = parseInt(String(st.spellAttack || '').replace('+', ''), 10)
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

  const rollSkill = (skill, opts = {}) => {
    const mods = resolvePlayerD20Modifiers({
      rollKind: 'check',
      actorConditions: conditionsLive,
      exhaustionLevel: actorExhaustionLevel(),
    })
    const test = rollD20Test(rollDie, { advantage: mods.advantage, disadvantage: mods.disadvantage })
    const d20 = test.value
    const mod = parseModNum(skill.mod)
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + mod, rollType: 'check', includeGuidance: true })
    const total = modded.total - mods.exhaustionPenalty
    const contextLabel = opts.contextLabel || `${skill.name} check`
    const diceStr = test.rolls.length > 1 ? test.rolls.join('/') : String(d20)
    setRollResult({
      type: 'skill',
      name: skill.name,
      contextLabel,
      d20,
      mod,
      total,
      crit: test.rolls.includes(20),
      fumble: d20 === 1,
    })
    setPendingAttack(null)
    const label = test.rolls.includes(20) ? ` NAT 20!` : d20 === 1 ? ` nat 1` : ''
    const advNote = test.mode !== 'normal' ? ` [${test.mode}]` : ''
    const exNote = mods.exhaustionPenalty ? ` −${mods.exhaustionPenalty} (exhaustion)` : ''
    pushRoll(`${skill.name} check: d20(${diceStr}) + ${mod} = ${total}${exNote}${advNote}${label}`, char.name)
  }

  const rollSave = (save, opts = {}) => {
    const mods = resolvePlayerD20Modifiers({
      rollKind: 'save',
      actorConditions: conditionsLive,
      exhaustionLevel: actorExhaustionLevel(),
      saveAbility: saveAbilityFromSaveRow(save),
    })
    const test = rollD20Test(rollDie, { advantage: mods.advantage, disadvantage: mods.disadvantage })
    const d20 = test.value
    const mod = parseModNum(save.mod)
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + mod, rollType: 'save' })
    const total = mods.autoFail ? -999 : (modded.total - mods.exhaustionPenalty)
    const contextLabel = opts.contextLabel || `${save.name} save`
    const diceStr = test.rolls.length > 1 ? test.rolls.join('/') : String(d20)
    setRollResult({
      type: 'save',
      name: save.name,
      contextLabel,
      d20,
      mod,
      total,
      crit: test.rolls.includes(20),
      fumble: d20 === 1,
    })
    setPendingAttack(null)
    const label = mods.autoFail ? ' AUTO-FAIL' : test.rolls.includes(20) ? ` NAT 20!` : d20 === 1 ? ` nat 1` : ''
    const advNote = test.mode !== 'normal' ? ` [${test.mode}]` : ''
    const exNote = mods.exhaustionPenalty ? ` −${mods.exhaustionPenalty} (exhaustion)` : ''
    pushRoll(`${save.name} save: d20(${diceStr}) + ${mod} = ${total}${exNote}${advNote}${label}`, char.name)
  }

  const rollAttack = async (weapon, target) => {
    const actionType = parseCastingTimeMeta(weapon.action || 'Action').actionType
    const canUse = await canSpendActionType(actionType, weapon.name)
    if (!canUse) return
    if (!isAttackRoll(weapon.hit)) {
      setRollResult({ type: 'save-spell', weaponName: weapon.name, saveStr: weapon.save || weapon.hit, weapon, target })
      setPendingAttack({ weapon, target, crit: false })
      pushRoll(`${weapon.name}: forced save — ${weapon.save || weapon.hit}`, char.name)
      return
    }
    const atkMods = resolvePlayerD20Modifiers({
      rollKind: 'attack',
      actorConditions: conditionsLive,
      exhaustionLevel: actorExhaustionLevel(),
      targetConditions: target?.conditions || [],
      options: { attackRange: inferAttackRange(weapon) },
    })
    const test = rollD20Test(rollDie, { advantage: atkMods.advantage, disadvantage: atkMods.disadvantage })
    const d20 = test.value
    const bonus = weapon.attackBonus || 0
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + bonus, rollType: 'attack' })
    const total = modded.total - atkMods.exhaustionPenalty
    const forcedCrit = shouldForceCriticalOnHit({
      attackRange: inferAttackRange(weapon),
      targetConditions: target?.conditions || [],
    })
    const crit = test.rolls.includes(20) || forcedCrit
    const hit = target ? (forcedCrit || crit || total >= getAcWithEffects(target)) : null
    const diceStr = test.rolls.length > 1 ? test.rolls.join('/') : String(d20)
    const advNote = test.mode !== 'normal' ? ` [${test.mode}]` : ''
    const exNote = atkMods.exhaustionPenalty ? ` −${atkMods.exhaustionPenalty} (exhaustion)` : ''

    if (hit && target && weapon.damageDice) {
      const dd = weapon.damageDice
      const diceCount = crit ? dd.count * 2 : dd.count
      const rolls = rollDice(Math.max(diceCount, 0), dd.sides)
      const dmgTotal = rolls.reduce((a, b) => a + b, 0) + dd.modifier
      setRollResult({ type: 'attack-damage', weaponName: weapon.name, d20, bonus, total, crit, target, rolls, modifier: dd.modifier, dmgTotal, damageType: dd.type })
      setPendingAttack(null)
      applyDamageToEnemy(target.id, dmgTotal, char.name, weapon.name, dd.type || null)
      const critStr = crit ? ' CRIT!' : ''
      pushRoll(`${weapon.name} attack: d20(${diceStr}) + ${bonus} = ${total}${exNote}${advNote} vs ${target.name} AC ${getAcWithEffects(target)} → HIT${critStr}`, char.name)
      pushRoll(`${weapon.name} damage${crit ? ' (crit)' : ''}: [${rolls.join('+')}]${dd.modifier ? `+${dd.modifier}` : ''} = ${dmgTotal} ${dd.type} → ${target.name}`, char.name)
      return
    }

    setRollResult({ type: 'attack', weaponName: weapon.name, d20, bonus, total, hit, target, crit })
    if (hit !== false) {
      setPendingAttack({ weapon, target, crit })
    } else {
      setPendingAttack(null)
    }
    const hitStr = hit === null ? '' : hit ? ` → HIT` : ` → MISS`
    const critStr = forcedCrit ? ` AUTO-CRIT!` : crit ? ` CRITICAL!` : ''
    const targetStr = target ? ` vs ${target.name} AC ${getAcWithEffects(target)}` : ''
    pushRoll(`${weapon.name} attack: d20(${diceStr}) + ${bonus} = ${total}${exNote}${advNote}${targetStr}${hitStr}${critStr}`, char.name)
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
      applyDamageToEnemy(target.id, total, char.name, weapon.name, weapon.damageDice?.type || null)
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
    if (!canUse) return false
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
      return false
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
    return true
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
    if (
      spell?.concentration
      && canEditState
      && concentration
      && concentrationSpell
      && String(concentrationSpell).trim() !== String(spell.name || '').trim()
    ) {
      const ok = window.confirm(`You are concentrating on "${concentrationSpell}". Cast "${spell.name}" and end the previous spell?`)
      if (!ok) return
    }
    const sfx = spell.soundEffectUrl || spell.sound_effect_url
    if (sfx) playSfx(sfx)
    const slotLvl = slotLevel ?? spell.minSlot ?? null
    if (slotLvl) {
      const ok = await useSpellSlot(characterId, slotLvl)
      if (!ok) return
    }
    const extraLevels = slotLvl && spell.minSlot ? slotLvl - spell.minSlot : 0
    const targetName = target?.name ?? (spell.target === 'self' ? char.name : null)
    const selectedTargets = targets.length > 0 ? targets : (target ? [target] : [])

    const spellPath = resolveSpellPath(spell)
    const concCtx = {
      spell,
      characterId,
      canEditState,
      concentration,
      concentrationSpell,
      charName: char.name,
      setMyCharacterConcentration,
      pushRoll,
      confirmReplaceConcentration: (prev, next) => window.confirm(`Replace concentration on "${prev}" with "${next}"?`),
    }
    if (spellPath === 'attack') {
      const atkMods = resolvePlayerD20Modifiers({
        rollKind: 'attack',
        actorConditions: conditionsLive,
        exhaustionLevel: actorExhaustionLevel(),
        targetConditions: target?.conditions || [],
        options: { attackRange: inferAttackRange(spell) },
      })
      const test = rollD20Test(rollDie, { advantage: atkMods.advantage, disadvantage: atkMods.disadvantage })
      const d20 = test.value
      const bonus = spell.toHit || 0
      const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + bonus, rollType: 'attack' })
      const total = modded.total - atkMods.exhaustionPenalty
      const forcedCrit = shouldForceCriticalOnHit({
        attackRange: inferAttackRange(spell),
        targetConditions: target?.conditions || [],
      })
      const crit = test.rolls.includes(20) || forcedCrit
      const hit = target ? (forcedCrit || crit || total >= getAcWithEffects(target)) : null
      const diceStr = test.rolls.length > 1 ? test.rolls.join('/') : String(d20)
      const advNote = test.mode !== 'normal' ? ` [${test.mode}]` : ''
      const exNote = atkMods.exhaustionPenalty ? ` −${atkMods.exhaustionPenalty} (exhaustion)` : ''
      setRollResult({ type: 'attack', weaponName: spell.name, d20, bonus, total, hit, target, crit })
      if (hit !== false) {
        setPendingSpellDmg({ spell, target, slotLevel: slotLvl, crit, extraLevels })
      } else {
        setPendingSpellDmg(null)
      }
      const hitStr = hit === null ? '' : hit ? ' → HIT' : ' → MISS'
      const critStr = forcedCrit ? ' AUTO-CRIT!' : crit ? ' CRITICAL!' : ''
      const rangeStr = target ? ` vs ${target.name} AC ${getAcWithEffects(target)}` : ''
      pushRoll(`${spell.name} attack: d20(${diceStr}) + ${bonus} = ${total}${exNote}${advNote}${rangeStr}${hitStr}${critStr}`, char.name)
      const conc = await applySpellConcentrationAfterCast(concCtx)
      if (conc?.cancelled) return

    } else if (spellPath === 'save') {
      const dd = spell.damage
      const halfOnSuccess = inferHalfOnSuccess(spell)
      if (dd) {
        const extraDice = spell.perLevel ? extraLevels * spell.perLevel.count : 0
        const totalDice = dd.count + extraDice
        const rolls = rollDice(totalDice, spell.damageIfHurt?.sides || dd.sides)
        const total = rolls.reduce((a, b) => a + b, 0) + dd.mod
        const primaryTarget = selectedTargets[0] || target || null
        setRollResult({ type: 'save-spell', weaponName: spell.name, saveStr: `${spell.saveType} ${formatDcWithLabel(spell.saveDC) || `DC ${spell.saveDC}`}`, weapon: spell, target: primaryTarget, rolls, modifier: dd.mod, damageTotal: total, damageType: dd.type })
        setPendingSpellDmg(null)
        const targetStr = selectedTargets.length > 1
          ? ` → ${selectedTargets.map(t => t.name).join(', ')}`
          : primaryTarget ? ` → ${primaryTarget.name}` : ''
        pushRoll(`${spell.name} (${spell.saveType} ${formatDcWithLabel(spell.saveDC) || `DC ${spell.saveDC}`}): [${rolls.join('+')}]${dd.mod ? `+${dd.mod}` : ''} = ${total} ${dd.type}${targetStr}`, char.name)
        const targetsPayload = (selectedTargets.length > 0 ? selectedTargets : primaryTarget ? [primaryTarget] : []).map(t => ({ id: t.id, name: t.name }))
        const payload = makeSavePromptPayload({
          promptId: `${Date.now()}-${characterId}-${spell.name}`,
          spell,
          casterId: characterId,
          casterName: char.name,
          targets: targetsPayload,
          damage: dd ? { amount: total, type: dd.type, halfOnSuccess } : null,
          raw: { targetStr },
        })
        if (payload.dcFallback) {
          pushRoll(`[System] ${spell.name}: save DC missing, fallback to DC 10`, char.name)
        }
        pushSavePrompt(payload)
        const conc = await applySpellConcentrationAfterCast(concCtx)
        if (conc?.cancelled) return
        closeSpellPanel()
      } else {
        const primaryTarget = selectedTargets[0] || target || null
        setRollResult({ type: 'save-spell', weaponName: spell.name, saveStr: `${spell.saveType} ${formatDcWithLabel(spell.saveDC) || `DC ${spell.saveDC}`}`, weapon: spell, target: primaryTarget })
        const targetStr = selectedTargets.length > 1
          ? ` → ${selectedTargets.map(t => t.name).join(', ')}`
          : primaryTarget ? ` → ${primaryTarget.name}` : ''
        pushRoll(`${spell.name}: ${spell.saveType} ${formatDcWithLabel(spell.saveDC) || `DC ${spell.saveDC}`}${targetStr}`, char.name)
        const targetsPayload = (selectedTargets.length > 0 ? selectedTargets : primaryTarget ? [primaryTarget] : []).map(t => ({ id: t.id, name: t.name }))
        const payload = makeSavePromptPayload({
          promptId: `${Date.now()}-${characterId}-${spell.name}`,
          spell,
          casterId: characterId,
          casterName: char.name,
          targets: targetsPayload,
          damage: null,
          raw: { targetStr },
        })
        if (payload.dcFallback) {
          pushRoll(`[System] ${spell.name}: save DC missing, fallback to DC 10`, char.name)
        }
        pushSavePrompt(payload)
        const conc = await applySpellConcentrationAfterCast(concCtx)
        if (conc?.cancelled) return
        closeSpell()
      }

    } else if (spellPath === 'auto') {
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
      if (target) applyDamageToEnemy(target.id, totalDmg, char.name, spell.name, dd.type || null)
      const conc = await applySpellConcentrationAfterCast(concCtx)
      if (conc?.cancelled) return
      closeSpell()

    } else if (spellPath === 'heal') {
      const healActionProxy = {
        name: spell.name,
        slotLevel: spell.minSlot || 1,
        maxSlotLevel: slotLvl,
        baseDice: spell.healDice ? { count: spell.healDice.count, sides: spell.healDice.sides, modifier: spell.healDice.mod } : null,
        perLevelBonus: spell.perLevelHeal || null,
        action: spell.castingTime,
      }
      const healed = await rollHeal(healActionProxy, slotLvl || 1, target?.id || characterId)
      if (healed) {
        const conc = await applySpellConcentrationAfterCast(concCtx)
        if (conc?.cancelled) return
      }
      closeSpell()

    } else {
      const targetStr = targetName ? ` → ${targetName}` : ''
      setRollResult({ type: 'utility', spellName: spell.name, targetName })
      pushRoll(`${spell.name} cast${targetStr}`, char.name)
      const conc = await applySpellConcentrationAfterCast(concCtx)
      if (conc?.cancelled) return
      closeSpell()
    }
  }

  const rollSpellDamage = () => {
    if (!pendingSpellDmg) return
    const { spell, target, targets, crit, extraLevels, precomputedDamage } = pendingSpellDmg
    const damageTargets = targets?.length ? targets : (target ? [target] : [])
    if (precomputedDamage != null) {
      if (damageTargets.length > 0) {
        for (const t of damageTargets) applyDamageToEnemy(t.id, precomputedDamage, char.name, spell.name, spell.damage?.type || null)
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
      for (const t of damageTargets) applyDamageToEnemy(t.id, total, char.name, spell.name, dd.type || null)
    }
    const critStr = crit ? ' (crit)' : ''
    const targetStr = damageTargets.length > 0 ? ` → ${damageTargets.map(t => t.name).join(', ')}` : ''
    pushRoll(`${spell.name} damage${critStr}: [${rolls.join('+')}]${dd.mod ? `+${dd.mod}` : ''} = ${total} ${dd.type}${targetStr}`, char.name)
    closeSpell()
  }

  const dismissRoll = useCallback(() => setRollResult(null), [])

  const resolveIncomingSavePrompt = async (isManual = false, manualTotal = null) => {
    if (!dmRoll?.savePrompt) return
    const bumpCombatRealtimeCounter = (counterKey) => {
      usePlayerStore.setState((state) => {
        const cur = state.combatRealtimeDiagnostics || {}
        return {
          combatRealtimeDiagnostics: {
            ...cur,
            [counterKey]: (cur[counterKey] || 0) + 1,
          },
        }
      })
    }
    const saveAbility = String(dmRoll.savePrompt.saveAbility || '').toUpperCase()
    const saveEntry = (char.savingThrows || []).find(s => String(s.name || '').toUpperCase() === saveAbility)
    const mod = parseModNum(saveEntry?.mod || 0)
    const saveAbilityKey = saveAbility.slice(0, 3).toLowerCase()
    const mods = resolvePlayerD20Modifiers({
      rollKind: 'save',
      actorConditions: conditionsLive,
      exhaustionLevel: actorExhaustionLevel(),
      saveAbility: saveAbilityKey,
    })
    const test = rollD20Test(rollDie, { advantage: mods.advantage, disadvantage: mods.disadvantage })
    const d20 = test.value
    const modded = applyDeterministicRollModifiers({ combatant: myCombatant, baseRoll: d20 + mod, rollType: 'save' })
    const total = isManual
      ? (parseInt(manualTotal, 10) || 0)
      : (mods.autoFail ? -999 : (modded.total - mods.exhaustionPenalty))
    const success = total >= (dmRoll.savePrompt.saveDc || 10)
    const meta = dmRoll.savePrompt.damageMeta
    const fallbackDamage = Math.max(0, Math.floor(Number(dmRoll.savePrompt.damage?.amount) || 0))
    const fallbackHalfOnSuccess = !!dmRoll.savePrompt.damage?.halfOnSuccess
    const fallbackDamageType = dmRoll.savePrompt.damage?.type || null
    const curForDice = liveChar?.curHp ?? maxHp
    let hpDmg = 0
    let missingDamageDetails = false
    if (meta) {
      let diceSpec = meta.diceOnFail
      if (meta.variant === 'toll-the-dead' && meta.diceWhenHurt && meta.diceWhenFullHp) {
        diceSpec = curForDice < maxHp ? meta.diceWhenHurt : meta.diceWhenFullHp
      }
      if (diceSpec) {
        const rolls = rollDice(diceSpec.count, diceSpec.sides)
        const rawTotal = rolls.reduce((a, b) => a + b, 0)
        hpDmg = success
          ? (meta.halfOnSuccess ? Math.floor(rawTotal / 2) : 0)
          : rawTotal
      }
    } else if (fallbackDamage > 0) {
      hpDmg = success
        ? (fallbackHalfOnSuccess ? Math.floor(fallbackDamage / 2) : 0)
        : fallbackDamage
    } else {
      missingDamageDetails = true
    }
    setRollResult({ type: 'save', name: `${saveAbility} vs ${dmRoll.savePrompt.actionName}`, d20, mod, total, crit: test.rolls.includes(20), fumble: d20 === 1 })
    const dcPrompt = formatDcWithLabel(dmRoll.savePrompt.saveDc) || `DC ${dmRoll.savePrompt.saveDc}`
    const exNote = !isManual && mods.exhaustionPenalty ? ` −${mods.exhaustionPenalty} (exhaustion)` : ''
    pushRoll(
      `${dmRoll.savePrompt.actionName}: ${saveAbility} save ${mods.autoFail ? 'AUTO-FAIL' : `total ${total}`}${exNote} vs ${dcPrompt} → ${success ? 'SUCCESS' : 'FAIL'}`,
      char.name
    )
    if (missingDamageDetails) {
      pushRoll(`[System] ${dmRoll.savePrompt.actionName}: no damage metadata found; HP unchanged.`, char.name)
      bumpCombatRealtimeCounter('savePromptResolvedZeroMissingMeta')
    }
    if (hpDmg > 0) {
      bumpCombatRealtimeCounter('savePromptResolvedWithDamage')
      await applyDamageToCharacter(
        characterId,
        hpDmg,
        dmRoll.savePrompt.sourceName,
        dmRoll.savePrompt.actionName,
        meta?.damageType || fallbackDamageType
      )
    }
    clearDmRoll()
  }

  // Auto-dismiss DM roll after 10s
  useEffect(() => {
    if (!dmRoll) return
    const relevant = !dmRoll.targetId || dmRoll.targetId === 'all' || dmRoll.targetId === characterId
    if (!relevant) return
    if (
      import.meta.env.DEV
      && qaHoldSavePromptUntilDismissed
      && dmRoll.kind === 'save-prompt'
    ) {
      return undefined
    }
    const t = setTimeout(clearDmRoll, 10000)
    return () => clearTimeout(t)
  }, [dmRoll, characterId, qaHoldSavePromptUntilDismissed])

  useEffect(() => {
    if (!myTurnActive || !combatActive) return
    setTurnPromptVisible(true)
    const t = setTimeout(() => setTurnPromptVisible(false), 2200)
    return () => clearTimeout(t)
  }, [myTurnActive, combatActive, combatRound])

  const showDmRoll = dmRoll && (!dmRoll.targetId || dmRoll.targetId === 'all' || dmRoll.targetId === characterId)

  return {
    char, liveChar, curHp, tempHp, spellSlots, concentration,
    concentrationSpell, conditionsLive, inspiration, classResources, deathSaves, exhaustionLevel,
    canEditState,
    hpPct, hpColour, myBuffs, hasBardic,
    enemies, partyChars, myCombatant, myTurnActive, myEconomy,
    combatActive, combatRound, combatCombatants, combatActiveCombatantIndex,
    activeBuffs, bardicInspirationUses, playerCharacters, ilyaAssignedTo,
    initiativePhase, submitInitiative, pushRoll,

    updateMyCharacterHp, updateMyCharacterTempHp,
    setMyCharacterConcentration, patchMyCharacterTacticalJson, setMyCharacterConditions,
    markMyCharacterDeathSave, rollMyDeathSave,
    saveMyCharacterSheet,
    toggleMyActionEconomyField, useSpellSlot,

    rollResult, pendingAttack, pendingSpellDmg,
    selectedTarget, setSelectedTarget,
    healTarget, setHealTarget,
    healSlot, setHealSlot,
    bardicTarget, setBardicTarget,
    activeSpell, spellSlotLevel, setSpellSlotLevel,
    spellTarget, setSpellTarget,
    spellTargets, setSpellTargets,
    turnPromptVisible,
    manualSaveTotal, setManualSaveTotal,

    rollSkill, rollSave, rollAttack, rollDamageFromPending,
    useBardicInspiration, rollHeal, grantBardic,
    openSpell, closeSpell, castSpell, rollSpellDamage,
    dismissRoll, resolveIncomingSavePrompt, resolveSpellForCasting,

    dmRoll, showDmRoll, clearDmRoll,
  }
}
