import { SKILLS_LIST } from '../rules/skillsIndex.js'
import { CLASS_HIT_DICE } from '../rules/catalog/classHitDice.js'

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export function getProficiencyBonus(level) {
  const safeLevel = Math.max(1, Number(level) || 1)
  return Math.ceil(safeLevel / 4) + 1
}

export function getAbilityModifier(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2)
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function normalizeAbilityKey(ability) {
  const raw = String(ability || '').trim()
  if (!raw) return null
  return raw.slice(0, 3).toUpperCase()
}

function indexSkillProficiencies(skillProficiencies) {
  const index = {}
  const list = Array.isArray(skillProficiencies) ? skillProficiencies : []
  for (const s of list) {
    const name = String(s?.name || '').trim()
    if (!name) continue
    index[name.toLowerCase()] = {
      proficient: !!s?.proficient,
      expertise: !!s?.expertise,
    }
  }
  return index
}

function buildAbilityModifiers(abilityScores) {
  const scores = abilityScores && typeof abilityScores === 'object' ? abilityScores : {}
  const mods = {}
  for (const ability of ABILITIES) {
    const value = scores[ability]
    const score = value && typeof value === 'object' ? value.score : value
    mods[ability] = getAbilityModifier(score)
  }
  return mods
}

export function computeCharacterSheet(raw) {
  const safeRaw = raw && typeof raw === 'object' ? raw : {}
  const level = Math.max(1, Number(safeRaw.level) || 1)
  const profBonusNum = getProficiencyBonus(level)
  const abilityModifiers = buildAbilityModifiers(safeRaw.abilityScores)

  const saveProficiencies = safeRaw.savingThrowProficiencies && typeof safeRaw.savingThrowProficiencies === 'object'
    ? safeRaw.savingThrowProficiencies
    : {}
  const savingThrows = ABILITIES.map((ability) => {
    const proficient = !!saveProficiencies[ability]
    return {
      name: ability,
      ability,
      mod: abilityModifiers[ability] + (proficient ? profBonusNum : 0),
      proficient,
    }
  })

  const skillIndex = indexSkillProficiencies(safeRaw.skillProficiencies)
  const skills = SKILLS_LIST.map((s) => {
    const ability = normalizeAbilityKey(s.ability) || 'DEX'
    const prof = skillIndex[s.name.toLowerCase()] || { proficient: false, expertise: false }
    const profContribution = prof.expertise ? profBonusNum * 2 : prof.proficient ? profBonusNum : 0
    return {
      name: s.name,
      ability,
      mod: (abilityModifiers[ability] ?? 0) + profContribution,
      proficient: prof.proficient,
      expertise: prof.expertise,
    }
  })

  const skillModByName = Object.fromEntries(skills.map((s) => [s.name.toLowerCase(), s.mod]))
  const passiveScores = {
    perception: 10 + (skillModByName.perception ?? 0),
    insight: 10 + (skillModByName.insight ?? 0),
    investigation: 10 + (skillModByName.investigation ?? 0),
  }

  const spellcastingAbility = normalizeAbilityKey(safeRaw.spellcastingAbility)
  const spellMod = spellcastingAbility ? (abilityModifiers[spellcastingAbility] ?? 0) : 0
  const spellAttack = spellcastingAbility ? formatModifier(spellMod + profBonusNum) : null
  const spellSaveDC = spellcastingAbility ? (8 + spellMod + profBonusNum) : null

  const acConfig = {
    base: 10,
    addDex: true,
    maxDex: null,
    shield: false,
    magicBonus: 0,
    ...(safeRaw.acConfig && typeof safeRaw.acConfig === 'object' ? safeRaw.acConfig : {}),
  }
  const dexMod = abilityModifiers.DEX ?? 0
  const dexContribution = acConfig.addDex
    ? (acConfig.maxDex != null ? Math.min(dexMod, Number(acConfig.maxDex) || 0) : dexMod)
    : 0
  const ac = (Number(acConfig.base) || 10)
    + dexContribution
    + (acConfig.shield ? 2 : 0)
    + (Number(acConfig.magicBonus) || 0)

  const hitDice = CLASS_HIT_DICE[String(safeRaw.class || '').toLowerCase()] || 'd8'
  const proficiencyBonus = formatModifier(profBonusNum)

  return {
    ...safeRaw,
    level,
    proficiencyBonus,
    abilityModifiers,
    savingThrows,
    skills,
    passiveScores,
    spellAttack,
    spellSaveDC,
    ac,
    hitDice,
    spellcastingAbility,
    stats: {
      ...(safeRaw.stats && typeof safeRaw.stats === 'object' ? safeRaw.stats : {}),
      proficiencyBonus,
      spellAttack,
      spellSaveDC,
      spellcastingAbility,
      ac,
    },
  }
}
