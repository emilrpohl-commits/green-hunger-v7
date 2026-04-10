/**
 * Phase 2E: single import path for boundary normalizers (DB / engine → runtime).
 * Prefer these re-exports in new code instead of ad-hoc transforms in slices.
 */

export {
  runtimeRowFromSessionCharacter,
  runtimeRowFromDbCharacter,
  buildPlayerRuntimeCharacters,
} from '../partyRoster.js'

export { normalizeStatBlockAction } from '../statBlockActions.js'

export { mapApiSpellToCharacterSpell, mapApiMonsterToCombatant } from '../engine/mappers.js'
