/**
 * Runtime / client state shapes (JSDoc). Complements shared/types/campaign.js (domain + DB).
 */

/**
 * @typedef {Object} PlayerState
 * @property {string} [loggedInAs]           - character id or 'party'
 * @property {boolean} [connected]         - realtime subscription status
 * @property {number} currentSceneIndex
 * @property {number} currentBeatIndex
 * @property {Object[]} characters         - live combat/runtime character rows
 * @property {boolean} combatActive
 * @property {number} combatRound
 * @property {Object[]} combatCombatants
 * @property {string|null} [ilyaAssignedTo]
 * @property {boolean} [initiativePhase]
 */

/**
 * @typedef {Object} CombatStateRow
 * @property {string} id                   - e.g. 'session-1'
 * @property {boolean} [active]
 * @property {number} [round]
 * @property {number} [active_combatant_index]
 * @property {Object[]} [combatants]
 * @property {string|null} [ilya_assigned_to]
 * @property {boolean} [initiative_phase]
 */

/**
 * @typedef {Object} RevealState
 * @property {string} id
 * @property {string} [category]
 * @property {string} title
 * @property {string} content
 * @property {string} [tone]
 */

/**
 * @typedef {Object} RevealCard
 * @property {string} id
 * @property {string} [category]
 * @property {string} title
 * @property {string} content
 * @property {string} [tone]
 */

export {}
