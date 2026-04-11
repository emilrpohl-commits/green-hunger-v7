const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}

function asBool(value, fallback = false) {
  if (value == null) return fallback
  const v = String(value).trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

const rawTitle = env.VITE_APP_TITLE != null ? String(env.VITE_APP_TITLE).trim() : ''
export const featureFlags = {
  /** Product label for DM/player chrome (replaces hard-coded campaign name in headers). */
  appTitle: rawTitle || 'Campaign Console',
  /**
   * When true (and demo is off), DM boot lists campaigns from Supabase instead of assuming `green-hunger`.
   * Player app starts without bundled static party sheets until DB load succeeds.
   */
  seedlessPlatform: asBool(env.VITE_SEEDLESS_PLATFORM, false),
  /** Restores legacy implicit `green-hunger` + bundled demo content for showcases. */
  demoCampaign: asBool(env.VITE_DEMO_CAMPAIGN, false),
  // Engine integration defaults to on, with legacy fallback always retained.
  use5eEngine: asBool(env.VITE_USE_5E_ENGINE, true),
  engineReadOnlyCatalog: asBool(env.VITE_ENGINE_READ_ONLY_CATALOG, true),
  engineSpells: asBool(env.VITE_ENGINE_SPELLS, true),
  engineMonsters: asBool(env.VITE_ENGINE_MONSTERS, true),
  engineConditions: asBool(env.VITE_ENGINE_CONDITIONS, true),
  // Stabilization rollout flags (default off for safe incremental adoption).
  ownershipConstraintsEnforced: asBool(env.VITE_OWNERSHIP_CONSTRAINTS_ENFORCED, false),
  rulesetContextEnforced: asBool(env.VITE_RULESET_CONTEXT_ENFORCED, false),
  rulesetProvenanceVisible: asBool(env.VITE_RULESET_PROVENANCE_VISIBLE, false),
  sessionRunRuntime: asBool(env.VITE_SESSION_RUN_RUNTIME, false),
  engineCatalogRead: asBool(env.VITE_ENGINE_CATALOG_READ, false),
  engineSpellResolution: asBool(env.VITE_ENGINE_SPELL_RESOLUTION, false),
  unifiedSavePrompts: asBool(env.VITE_UNIFIED_SAVE_PROMPTS, false),
  unifiedEffectResolution: asBool(env.VITE_UNIFIED_EFFECT_RESOLUTION, false),
  monsterActionCatalog: asBool(env.VITE_MONSTER_ACTION_CATALOG, false),
  visibilityContractEnforced: asBool(env.VITE_VISIBILITY_CONTRACT_ENFORCED, false),
  homebrewOverlayRead: asBool(env.VITE_HOMEBREW_OVERLAY_READ, false),
  homebrewOverlayWrite: asBool(env.VITE_HOMEBREW_OVERLAY_WRITE, false),
  uiCombatClarity: asBool(env.VITE_UI_COMBAT_CLARITY, false),
  uiPromptStateBadges: asBool(env.VITE_UI_PROMPT_STATE_BADGES, false),
  shadowCompareMode: asBool(env.VITE_SHADOW_COMPARE_MODE, false),
  /** Phase 2C: use encounters + stat_blocks from DB for quick-launch (see kill switch for rollback). */
  encountersDbOnly: asBool(env.VITE_ENCOUNTERS_DB_ONLY, false),
  encountersDbOnlyKillSwitch: asBool(env.VITE_ENCOUNTERS_DB_ONLY_KILL_SWITCH, false),
  /** Apply resistance/vulnerability/immunity when applying typed damage (combat). */
  rulesDamagePipeline: asBool(env.VITE_RULES_DAMAGE_PIPELINE, false),
}

export function isFeatureEnabled(flagName) {
  return !!featureFlags[flagName]
}
