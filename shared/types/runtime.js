/**
 * Runtime / client state shapes (JSDoc). Complements shared/types/campaign.js (domain + DB).
 */

/**
 * @typedef {'2024'|'2014'|'custom'} RulesetId
 */

/**
 * @typedef {'canonical'|'overlay'|'campaign'|'manual'} RulesSourceOfTruth
 */

/**
 * @typedef {'dm_only'|'player_visible'|'targeted'} VisibilityLevel
 */

/**
 * @typedef {Object} RulesetContext
 * @property {RulesetId} active_ruleset
 * @property {boolean} fallback_allowed
 * @property {RulesSourceOfTruth} source_of_truth
 */

/**
 * @typedef {Object} SessionRunContext
 * @property {string} session_run_id
 * @property {string} [campaign_id]
 * @property {string} [session_id]
 * @property {RulesetContext} [ruleset_context]
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
 * @property {string} id                   - legacy id
 * @property {string} [session_run_id]
 * @property {boolean} [active]
 * @property {number} [round]
 * @property {number} [active_combatant_index]
 * @property {Object[]} [combatants]
 * @property {string|null} [ilya_assigned_to]
 * @property {boolean} [initiative_phase]
 * @property {RulesetContext} [ruleset_context]
 */

/**
 * @typedef {Object} RevealState
 * @property {string} id
 * @property {string} [session_run_id]
 * @property {string} [category]
 * @property {string} title
 * @property {string} content
 * @property {string} [tone]
 * @property {VisibilityLevel} [visibility]
 * @property {string|null} [target_id]
 */

/**
 * @typedef {Object} RevealCard
 * @property {string} id
 * @property {string} [session_run_id]
 * @property {string} [category]
 * @property {string} title
 * @property {string} content
 * @property {string} [tone]
 * @property {VisibilityLevel} [visibility]
 * @property {string|null} [target_id]
 */

/**
 * @typedef {'pending'|'awaiting_roll'|'resolved'|'dismissed_manual'} SavePromptStatus
 */

/**
 * @typedef {Object} SavePromptEvent
 * @property {string} prompt_id
 * @property {string} session_run_id
 * @property {SavePromptStatus} status
 * @property {string} save_ability
 * @property {number} save_dc
 * @property {VisibilityLevel} visibility
 * @property {string|null} [target_id]
 */

export {}
