/**
 * Shared combat domain shapes (JSDoc). Used by DM/Player stores and resolvers.
 *
 * @typedef {'player'|'enemy'|'npc'|'companion'} CombatantEntityType
 *
 * @typedef {Object} CombatantSnapshot
 * @property {string} id
 * @property {CombatantEntityType|string} type
 * @property {string} name
 * @property {number} [curHp]
 * @property {number} [maxHp]
 * @property {number} [tempHp]
 * @property {number} [ac]
 * @property {number} [initiative]
 * @property {string[]} [conditions]
 * @property {Object[]} [effects]
 * @property {boolean} [concentration]
 * @property {number} [exhaustionLevel]
 * @property {string[]} [resistances]
 * @property {string[]} [vulnerabilities]
 * @property {string[]} [immunities]
 * @property {Object} [actionEconomy]
 *
 * @typedef {'attack'|'save'|'special'|'trait'|'other'} MonsterActionKind
 *
 * @typedef {Object} CombatAction
 * @property {string} [id]
 * @property {MonsterActionKind} actionKind
 * @property {string} name
 * @property {string} [desc]
 * @property {'action'|'bonus_action'|'reaction'} [actionType]
 * @property {number|null} [toHit]
 * @property {string|null} [saveType]
 * @property {number|null} [saveDC]
 * @property {Object[]} [damage] - { dice?, type? }[]
 * @property {unknown} [raw] - original action option
 *
 * @typedef {Object} DamageComponentLine
 * @property {number} raw
 * @property {string|null} typeId
 * @property {number} final
 * @property {{ kind: string, detail?: string }[]} factors
 *
 * @typedef {Object} DamageBundleResult
 * @property {number} totalFinal
 * @property {DamageComponentLine[]} lines
 *
 * @typedef {Object} CombatFeedDamageMeta
 * @property {'damage'} kind
 * @property {DamageBundleResult} [bundle]
 * @property {string} [sourceLabel]
 */

export {}
