/**
 * Normalizes DB + character_states + optional combatant overlay into a tactical view model.
 */

/** @typedef {'pips' | 'counter' | 'toggle'} ResourceDisplayType */

/**
 * @typedef {Object} ClassResource
 * @property {string} label
 * @property {number} current
 * @property {number} max
 * @property {string} [resetType]
 * @property {ResourceDisplayType} [displayType]
 */

/**
 * @typedef {Object} TacticalJson
 * @property {string} [concentrationSpell]
 * @property {boolean} [inspiration]
 * @property {ClassResource[]} [classResources]
 * @property {{ action?: boolean, bonusAction?: boolean, reaction?: boolean }} [actionEconomy]
 */

/**
 * @param {unknown} raw
 * @returns {TacticalJson}
 */
export function parseTacticalJson(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      concentrationSpell: undefined,
      inspiration: undefined,
      classResources: [],
      actionEconomy: {},
    }
  }
  const o = /** @type {Record<string, unknown>} */ (raw)
  const classResources = Array.isArray(o.classResources)
    ? o.classResources
      .filter((r) => r && typeof r === 'object')
      .map((r) => normalizeResource(/** @type {Record<string, unknown>} */ (r)))
      .filter(Boolean)
    : []
  const ae = o.actionEconomy && typeof o.actionEconomy === 'object'
    ? /** @type {Record<string, unknown>} */ (o.actionEconomy)
    : {}
  return {
    concentrationSpell: typeof o.concentrationSpell === 'string' ? o.concentrationSpell : undefined,
    inspiration: typeof o.inspiration === 'boolean' ? o.inspiration : undefined,
    classResources: classResources.length ? classResources : [],
    actionEconomy: {
      action: typeof ae.action === 'boolean' ? ae.action : undefined,
      bonusAction: typeof ae.bonusAction === 'boolean' ? ae.bonusAction : undefined,
      reaction: typeof ae.reaction === 'boolean' ? ae.reaction : undefined,
    },
  }
}

/**
 * @param {Record<string, unknown>} r
 * @returns {ClassResource | null}
 */
function normalizeResource(r) {
  const label = typeof r.label === 'string' ? r.label : ''
  if (!label.trim()) return null
  const max = Math.max(0, Number(r.max) || 0)
  const current = Math.min(max, Math.max(0, Number(r.current) ?? max))
  const displayType = r.displayType === 'counter' || r.displayType === 'toggle' ? r.displayType : 'pips'
  return {
    label,
    current,
    max: max || 1,
    resetType: typeof r.resetType === 'string' ? r.resetType : '',
    displayType,
  }
}

/**
 * Merge tactical_json from DB row (snake_case tactical_json from PostgREST).
 * @param {Record<string, unknown>} [row]
 * @returns {TacticalJson}
 */
export function tacticalJsonFromCharacterStateRow(row) {
  if (!row) return parseTacticalJson({})
  const tj = row.tactical_json ?? row.tacticalJson
  return parseTacticalJson(tj)
}

/**
 * Build payload for character_states upsert (tactical_json only — hot fields stay columns).
 * @param {TacticalJson} tactical
 * @returns {Record<string, unknown>}
 */
export function tacticalJsonToDbPayload(tactical) {
  const t = parseTacticalJson(tactical)
  return {
    concentrationSpell: t.concentrationSpell ?? null,
    inspiration: t.inspiration ?? false,
    classResources: t.classResources || [],
    actionEconomy: {
      action: t.actionEconomy?.action ?? true,
      bonusAction: t.actionEconomy?.bonusAction ?? true,
      reaction: t.actionEconomy?.reaction ?? true,
    },
  }
}

/**
 * @param {Object} opts
 * @param {Record<string, unknown>} [opts.dbCharacter]
 * @param {Record<string, unknown>} [opts.stateRow] character_states row
 * @param {Record<string, unknown>} [opts.fallback] session1-style character
 * @param {Record<string, unknown>} [opts.combatant] optional combat overlay
 */
export function buildTacticalViewModel({
  dbCharacter = {},
  stateRow = {},
  fallback = {},
  combatant = null,
} = {}) {
  const stats = /** @type {Record<string, unknown>} */ (dbCharacter.stats || {})
  const tactical = tacticalJsonFromCharacterStateRow(stateRow)

  const maxHp = Number(stats.maxHp ?? fallback.maxHp ?? 10) || 10
  const curHp = Number(stateRow.cur_hp ?? stateRow.curHp ?? fallback.curHp ?? maxHp) || 0
  const tempHp = Number(stateRow.temp_hp ?? stateRow.tempHp ?? fallback.tempHp ?? 0) || 0
  const ac = Number(stats.ac ?? fallback.ac ?? 10) || 10
  const speed = Number(stats.speed ?? fallback.speed ?? 30) || 30
  const initiative = stats.initiative != null ? String(stats.initiative) : (fallback.initiative != null ? String(fallback.initiative) : '+0')
  const spellSaveDC = stats.spellSaveDC != null ? stats.spellSaveDC : stats.spell_save_dc

  const concentration = !!(stateRow.concentration ?? fallback.concentration)
  const conditions = Array.isArray(stateRow.conditions) ? stateRow.conditions : (fallback.conditions || [])
  const deathSaves = stateRow.death_saves || stateRow.deathSaves || fallback.deathSaves || { successes: 0, failures: 0 }
  const spellSlots = stateRow.spell_slots || stateRow.spellSlots || dbCharacter.spell_slots || fallback.spellSlots || {}

  let effectiveAc = ac
  let economy = tactical.actionEconomy
  if (combatant && typeof combatant === 'object') {
    const c = /** @type {Record<string, unknown>} */ (combatant)
    if (c.effectiveAc != null) effectiveAc = Number(c.effectiveAc) || effectiveAc
    else if (c.ac != null) effectiveAc = Number(c.ac) || effectiveAc
    const ae = c.actionEconomy && typeof c.actionEconomy === 'object' ? /** @type {Record<string, unknown>} */ (c.actionEconomy) : {}
    economy = {
      action: typeof ae.actionAvailable === 'boolean' ? ae.actionAvailable : economy?.action,
      bonusAction: typeof ae.bonusActionAvailable === 'boolean' ? ae.bonusActionAvailable : economy?.bonusAction,
      reaction: typeof ae.reactionAvailable === 'boolean' ? ae.reactionAvailable : economy?.reaction,
    }
  }

  const bloodied = maxHp > 0 && curHp > 0 && curHp <= maxHp * 0.5
  const downed = curHp === 0

  return {
    id: String(dbCharacter.id || fallback.id || ''),
    name: String(dbCharacter.name || fallback.name || ''),
    isNPC: !!(dbCharacter.is_npc ?? fallback.isNPC),
    assignedPcId: dbCharacter.assigned_pc_id != null ? String(dbCharacter.assigned_pc_id) : (fallback.assignedPcId ?? null),
    maxHp,
    curHp,
    tempHp,
    ac: effectiveAc,
    speed,
    initiative,
    spellSaveDC: spellSaveDC != null ? Number(spellSaveDC) : null,
    concentration,
    concentrationSpell: tactical.concentrationSpell || null,
    inspiration: tactical.inspiration ?? false,
    conditions: conditions.map(String),
    deathSaves: {
      successes: Math.min(3, Math.max(0, Number(deathSaves.successes) || 0)),
      failures: Math.min(3, Math.max(0, Number(deathSaves.failures) || 0)),
    },
    spellSlots,
    classResources: tactical.classResources || [],
    actionEconomy: {
      actionAvailable: economy?.action !== false,
      bonusActionAvailable: economy?.bonusAction !== false,
      reactionAvailable: economy?.reaction !== false,
    },
    bloodied,
    downed,
    species: dbCharacter.species || fallback.species || '',
    class: dbCharacter.class || fallback.class || '',
    subclass: dbCharacter.subclass || fallback.subclass || '',
    level: Number(dbCharacter.level || fallback.level || 1) || 1,
    image: dbCharacter.image || fallback.image || null,
    portrait_thumb_storage_path: dbCharacter.portrait_thumb_storage_path || null,
    portrait_original_storage_path: dbCharacter.portrait_original_storage_path || null,
    colour: dbCharacter.colour || fallback.colour || '#6f9b7a',
  }
}
