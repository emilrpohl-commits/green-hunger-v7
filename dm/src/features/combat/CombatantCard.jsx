/**
 * CombatantCard — public entry point.
 *
 * This module wraps the new CompactCard component and re-exports all the
 * constants that other files in the project import from here.
 *
 * The props API is unchanged so all existing call-sites continue to work.
 */

export {
  CONDITIONS,
  HOSTILE_SPELL_EFFECTS,
  PC_BUFF_SPELL_EFFECTS,
  HP_COLOUR,
  parseDamageFromStatblock,
} from './cards/constants.js'

import CompactCard from './cards/CompactCard.jsx'
export default CompactCard
