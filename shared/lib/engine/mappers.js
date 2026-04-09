function parseMod(value) {
  const n = parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}

function parseDiceNotation(notation) {
  if (!notation || typeof notation !== 'string') return null
  const m = notation.trim().match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i)
  if (!m) return null
  const mod = m[4] ? Number(m[4]) * (m[3] === '-' ? -1 : 1) : 0
  return { count: Number(m[1]), sides: Number(m[2]), mod }
}

export function mapApiSpellToCharacterSpell(apiSpell, charStats = {}) {
  const parsedDamageDice =
    parseDiceNotation(apiSpell.damage_dice)
    || parseDiceNotation(apiSpell?.damage?.damage_at_slot_level && Object.values(apiSpell.damage.damage_at_slot_level)[0])
  const parsedHealingDice =
    parseDiceNotation(apiSpell.healing_dice)
    || parseDiceNotation(apiSpell?.heal_at_slot_level && Object.values(apiSpell.heal_at_slot_level)[0])

  const mechanic = apiSpell.resolution_type
    || (apiSpell.attack_type ? 'attack' : apiSpell.save_type ? 'save' : parsedHealingDice ? 'heal' : 'utility')

  const spellAttack = parseMod(String(charStats.spellAttack || '').replace('+', ''))
  return {
    spellId: apiSpell.spell_id || apiSpell.index || String(apiSpell.name || '').toLowerCase().replace(/\s+/g, '_'),
    name: apiSpell.name,
    level: Number(apiSpell.level || 0),
    school: apiSpell.school || null,
    description: apiSpell.description || '',
    castingTime: apiSpell.casting_time || apiSpell.castingTime || 'Action',
    range: apiSpell.range || '',
    duration: apiSpell.duration || '',
    concentration: !!apiSpell.concentration,
    ritual: !!apiSpell.ritual,
    mechanic,
    targetMode: apiSpell.target_mode || 'special',
    target: apiSpell.target || null,
    saveType: apiSpell.save_type || apiSpell.save_ability || null,
    saveDC: charStats.spellSaveDC || null,
    toHit: spellAttack,
    damage: parsedDamageDice ? { ...parsedDamageDice, type: apiSpell.damage_type || 'Force' } : null,
    healDice: parsedHealingDice || null,
    combatProfile: {
      resolutionType: mechanic,
      targetMode: apiSpell.target_mode || 'special',
      saveAbility: apiSpell.save_ability || apiSpell.save_type || null,
      area: apiSpell.area || {},
      rules: apiSpell.rules_json || {},
    },
    source: apiSpell.source || null,
    ruleset: apiSpell.ruleset || null,
    source_index: apiSpell.source_index || apiSpell.index || null,
    source_url: apiSpell.source_url || apiSpell.url || null,
  }
}

export function mapApiMonsterToCombatant(apiMonster, ordinal = 1) {
  const ac = Number(apiMonster.ac || apiMonster.armor_class?.[0]?.value || apiMonster.armor_class || 10)
  const maxHp = Number(apiMonster.max_hp || apiMonster.hit_points || 1)
  const actions = Array.isArray(apiMonster.actions) ? apiMonster.actions : []
  const bonusActions = Array.isArray(apiMonster.bonus_actions) ? apiMonster.bonus_actions : []
  const reactions = Array.isArray(apiMonster.reactions) ? apiMonster.reactions : []

  const toActionOption = (a, actionType) => ({
    name: a.name || 'Action',
    desc: a.desc || '',
    actionType,
    attackBonus: parseMod(a.toHit ?? a.attack_bonus),
    save: a.saveType && a.saveDC ? `${a.saveType} DC ${a.saveDC}` : null,
    damage: a.damage || null,
  })

  return {
    id: `${apiMonster.slug || apiMonster.index || 'monster'}-${ordinal}`,
    name: ordinal > 1 ? `${apiMonster.name} ${ordinal}` : apiMonster.name,
    type: 'enemy',
    ac,
    maxHp,
    curHp: maxHp,
    tempHp: 0,
    initiative: 0,
    initiativeSet: false,
    conditions: [],
    effects: [],
    concentration: false,
    image: apiMonster.portrait_url || apiMonster.image || null,
    abilityScores: apiMonster.ability_scores || {},
    savingThrows: apiMonster.saving_throws || [],
    actionOptions: [
      ...actions.map((a) => toActionOption(a, 'action')),
      ...bonusActions.map((a) => toActionOption(a, 'bonus_action')),
      ...reactions.map((a) => toActionOption(a, 'reaction')),
    ],
  }
}

export function mapApiCondition(condition) {
  return {
    index: condition.index,
    name: condition.name,
    desc: Array.isArray(condition.desc) ? condition.desc.join('\n\n') : (condition.desc || ''),
    source_url: condition.url || null,
  }
}
