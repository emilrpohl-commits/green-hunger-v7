/**
 * Campaign Engine — Domain Type Definitions (JSDoc)
 *
 * These mirror the Supabase schema. All IDs are UUIDs from the DB.
 * Used throughout the app for consistent data shapes.
 */

// ---------------------------------------------------------------------------
// CAMPAIGN STRUCTURE
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Campaign
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [premise]
 * @property {string[]} [themes]
 * @property {string} [tone]
 * @property {string} [setting]
 * @property {'2024'|'2014'|'custom'} [rules_edition]
 * @property {string} [house_rules]
 * @property {Object} [party_profile]
 * @property {string} [notes]
 * @property {string[]} [tags]
 * @property {Arc[]} [arcs]        - populated when fetched with children
 */

/**
 * @typedef {Object} Arc
 * @property {string} id
 * @property {string} campaign_id
 * @property {number} order
 * @property {string} title
 * @property {string} [premise]
 * @property {string} [objective]
 * @property {string} [antagonist]
 * @property {string[]} [themes]
 * @property {string} [notes]
 * @property {Adventure[]} [adventures]
 */

/**
 * @typedef {Object} Adventure
 * @property {string} id
 * @property {string} arc_id
 * @property {number} order
 * @property {string} title
 * @property {string} [hook]
 * @property {string[]} [objectives]
 * @property {string} [stakes]
 * @property {string} [structure_type]   - 'linear' | 'sandbox' | 'heist'
 * @property {string[]} [completion_conditions]
 * @property {string[]} [failure_conditions]
 * @property {string} [notes]
 * @property {Session[]} [sessions]
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} adventure_id
 * @property {number} order
 * @property {number} [session_number]
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [estimated_duration]
 * @property {string} [recap]
 * @property {string[]} [objectives]
 * @property {string} [contingency_notes]
 * @property {string} [post_session_notes]
 * @property {string} [notes]
 * @property {Scene[]} [scenes]
 */

/**
 * @typedef {Object} Scene
 * @property {string} id
 * @property {string} session_id
 * @property {number} order
 * @property {string} [slug]              - stable identifier e.g. 's2-fork'
 * @property {string} title
 * @property {string} [subtitle]
 * @property {'narrative'|'combat'|'exploration'|'social'|'puzzle'|'transition'} [scene_type]
 * @property {string} [subtype]
 * @property {string} [purpose]
 * @property {string} [summary]
 * @property {string} [player_description]   - sent to player app
 * @property {string} [dm_notes]
 * @property {string} [entry_conditions]
 * @property {string} [environment]
 * @property {string} [map_asset_id]
 * @property {string} [estimated_time]
 * @property {SceneOutcome[]} [outcomes]
 * @property {string} [fallback_notes]
 * @property {string} [fail_forward_notes]
 * @property {string} [scaling_notes]
 * @property {boolean} [is_published]
 * @property {Beat[]} [beats]
 * @property {SceneBranch[]} [branches]
 */

/**
 * @typedef {Object} SceneOutcome
 * @property {string} label
 * @property {string[]} consequence_ids
 */

/**
 * @typedef {Object} SceneBranch
 * @property {string} id
 * @property {string} scene_id
 * @property {number} order
 * @property {string} label
 * @property {string} [description]
 * @property {string} [condition_text]
 * @property {'explicit'|'implicit'|'conditional'} [condition_type]
 * @property {string} [target_scene_id]
 * @property {string} [target_slug]
 * @property {boolean} [is_dm_only]
 * @property {Consequence[]} [consequences]
 */

/**
 * @typedef {Object} Consequence
 * @property {string} id
 * @property {string} branch_id
 * @property {number} order
 * @property {'npc_attitude'|'scene_unlock'|'scene_block'|'clock_advance'|'encounter_modify'|'reveal'|'custom'} type
 * @property {string} [description]
 * @property {string} [target_id]
 * @property {string} [target_type]
 * @property {Object} [data]
 * @property {boolean} [is_player_visible]
 */

/**
 * @typedef {Object} Beat
 * @property {string} id
 * @property {string} scene_id
 * @property {number} order
 * @property {string} [slug]
 * @property {string} title
 * @property {string} [trigger_text]
 * @property {'narrative'|'prompt'|'check'|'decision'|'combat'|'reveal'|'transition'} type
 * @property {string} [content]
 * @property {string} [player_text]
 * @property {string} [dm_notes]
 * @property {string} [mechanical_effect]
 * @property {string} [stat_block_id]
 * @property {string} [encounter_id]
 * @property {string[]} [asset_ids]
 */

// ---------------------------------------------------------------------------
// LIBRARIES
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} StatBlock
 * @property {string} id
 * @property {string} [campaign_id]
 * @property {string} [slug]
 * @property {string} name
 * @property {string} [source]
 * @property {string} [creature_type]
 * @property {'Tiny'|'Small'|'Medium'|'Large'|'Huge'|'Gargantuan'} [size]
 * @property {string} [alignment]
 * @property {string} [cr]
 * @property {number} [proficiency_bonus]
 * @property {number} ac
 * @property {string} [ac_note]
 * @property {number} max_hp
 * @property {string} [hit_dice]
 * @property {string} [speed]
 * @property {AbilityScores} ability_scores
 * @property {SaveEntry[]} [saving_throws]
 * @property {SkillEntry[]} [skills]
 * @property {string[]} [resistances]
 * @property {{ damage: string[], condition: string[] }} immunities
 * @property {string[]} [vulnerabilities]
 * @property {string} [senses]
 * @property {string} [languages]
 * @property {Trait[]} traits
 * @property {Action[]} actions
 * @property {Action[]} [bonus_actions]
 * @property {Action[]} [reactions]
 * @property {Action[]} [legendary_actions]
 * @property {CombatPrompt[]} [combat_prompts]
 * @property {string[]} [dm_notes]
 * @property {string} [portrait_url]
 * @property {string[]} [tags]
 */

/**
 * @typedef {{ STR: number, DEX: number, CON: number, INT: number, WIS: number, CHA: number }} AbilityScores
 * @typedef {{ name: string, mod: number }} SaveEntry
 * @typedef {{ name: string, mod: number }} SkillEntry
 * @typedef {{ name: string, desc: string }} Trait
 * @typedef {{ name: string, type: string, toHit?: number, reach?: string, range?: string, damage?: string, effect?: string, desc?: string }} Action
 * @typedef {{ trigger: string, text: string }} CombatPrompt
 */

/**
 * @typedef {Object} Spell
 * @property {string} id
 * @property {string} [campaign_id]
 * @property {string} name
 * @property {number} level                  - 0 = cantrip
 * @property {string} [school]
 * @property {string} [casting_time]
 * @property {string} [range]
 * @property {{ V: boolean, S: boolean, M: string|null }} [components]
 * @property {string} [duration]
 * @property {boolean} [ritual]
 * @property {boolean} [concentration]
 * @property {string} [description]
 * @property {string} [higher_level_effect]
 * @property {string} [damage_dice]
 * @property {string} [damage_type]
 * @property {string} [healing_dice]
 * @property {string} [save_type]
 * @property {string} [attack_type]
 * @property {string[]} [tags]
 * @property {string} [source]
 * @property {string[]} [classes]
 * @property {string} [notes]
 * @property {'2024'|'2014'|'custom'} [ruleset]
 * @property {'canonical'|'overlay'|'campaign'} [source_of_truth]
 */

/**
 * @typedef {Object} NPC
 * @property {string} id
 * @property {string} campaign_id
 * @property {string} name
 * @property {string} [role]
 * @property {string} [affiliation]
 * @property {string} [description]
 * @property {string} [personality]
 * @property {string} [motivation]
 * @property {string} [secret]              - DM only
 * @property {string} [stat_block_id]
 * @property {string} [portrait_url]
 * @property {string} [faction_id]
 * @property {string[]} [tags]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} Encounter
 * @property {string} id
 * @property {string} campaign_id
 * @property {string} title
 * @property {string} [type]
 * @property {string} [difficulty]
 * @property {{ stat_block_id: string, count: number, role: string }[]} [participants]
 * @property {string[]} [terrain_features]
 * @property {string[]} [hazards]
 * @property {string[]} [objectives]
 * @property {string} [tactics]
 * @property {Object[]} [scaling_options]
 * @property {Object} [rewards]
 * @property {string} [fail_conditions]
 * @property {string} [escape_conditions]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} Asset
 * @property {string} id
 * @property {string} campaign_id
 * @property {string} title
 * @property {'battle-map'|'regional-map'|'portrait'|'handout'|'letter'|'item-image'|'audio'} type
 * @property {string} [file_url]
 * @property {string} [thumbnail_url]
 * @property {'dm'|'public'|'revealable'} visibility
 * @property {string} [reveal_condition]
 * @property {string} [notes]
 */

// ---------------------------------------------------------------------------
// RUNTIME
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} LiveSessionState
 * @property {string} id                     - legacy id fallback
 * @property {string} [session_run_id]
 * @property {string} [campaign_id]
 * @property {string} [active_session_uuid]
 * @property {string} [active_scene_uuid]
 * @property {string} [active_beat_uuid]
 * @property {'run'|'build'} [mode]
 * @property {string[]} [revealed_asset_ids]
 * @property {number} [current_scene_index]  - legacy compat
 * @property {number} [current_beat_index]   - legacy compat
 * @property {'2024'|'2014'|'custom'} [active_ruleset]
 * @property {boolean} [fallback_allowed]
 * @property {'canonical'|'overlay'|'campaign'|'manual'} [source_of_truth]
 */

/**
 * @typedef {Object} HomebrewOverlay
 * @property {string} id
 * @property {string} campaign_id
 * @property {'spell'|'item'|'monster'|'condition'|'mechanic'} entity_type
 * @property {string|null} canonical_ref
 * @property {Object} overlay_payload
 * @property {boolean} is_active
 */

export {}
