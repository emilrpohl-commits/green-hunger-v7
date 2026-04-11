/**
 * Shared SRD-aligned rules layer (pure data + helpers). Safe for DM and Player bundles.
 */
export {
  CONDITIONS,
  CONDITION_COLOUR,
  CONDITION_DESC,
  CONDITIONS_REFERENCE,
  normalizeConditionName,
  isCanonicalConditionName,
} from './conditionCatalog.js'
export { DC_STANDARD_LADDER, DC_TABLE, findNearestDcRow } from './dcTable.js'
export {
  applyDamageWithTraits,
  normalizeDamageTypeId,
  primaryDamageTypeFromAction,
  coerceDamageTypeForPipeline,
  DAMAGE_TYPE_PIPELINE_IDS,
  DAMAGE_TYPE_SELECT_OPTIONS,
} from './damagePipeline.js'
export { rollD20Test, rerollOneD20 } from './d20Test.js'
export {
  restRulesCatalog,
  applyLongRestHpOnly,
  applyLongRestExhaustion,
  longRestHitDiceRestore,
} from './restOrchestrator.js'
export { spellcastingRulesCatalog, concentrationSaveDc } from './spellcastingRules.js'
export { SKILLS_LIST, lookupSkill, skillsForAbility } from './skillsIndex.js'
export { flattenRulesGlossary } from './glossaryFromDataRules.js'
export {
  getGlossaryFlatIndex,
  searchRulesGlossary,
  lookupGlossaryForCondition,
  getRulesGlossaryMeta,
} from './glossaryService.js'
export { dcWithLabel, formatDcWithLabel } from './dcDisplay.js'
export {
  attackRollModifiersFromConditions,
  abilityCheckModifiersFromConditions,
  cancelAdvDis,
  exhaustionPenaltyOnD20,
  resolvePlayerD20Modifiers,
  savingThrowModifiersFromConditions,
} from './conditionRollModifiers.js'
export {
  normalizeConditionsArray,
  normalizeCombatantConditions,
  normalizeCombatantsList,
} from './conditionHydration.js'
