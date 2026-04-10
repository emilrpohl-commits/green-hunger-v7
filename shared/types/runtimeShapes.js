/**
 * Phase 2E: documented runtime shapes (JSDoc only — no TS migration).
 *
 * Pipeline: PostgREST row → normalizers (see shared/lib/normalizers) → Zustand → UI.
 */

/**
 * @typedef {'db'|'static'|'merged'} ContentSource
 */

/**
 * @typedef {Object} RuntimeCharacterRow
 * @property {string} id
 * @property {string} name
 * @property {number} maxHp
 * @property {number} curHp
 * @property {ContentSource} [contentSource]
 */

/**
 * @typedef {Object} RuntimeCombatant
 * @property {string} id
 * @property {string} name
 * @property {string} [type]
 * @property {string} [kind]
 * @property {number} ac
 * @property {number} maxHp
 * @property {number} curHp
 */

/**
 * @typedef {Object} CharacterSpellRuntime
 * @property {string} spellId
 * @property {string} name
 * @property {string} [mechanic]
 */

export {}
