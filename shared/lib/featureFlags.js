const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}

function asBool(value, fallback = false) {
  if (value == null) return fallback
  const v = String(value).trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export const featureFlags = {
  // Engine integration defaults to on, with legacy fallback always retained.
  use5eEngine: asBool(env.VITE_USE_5E_ENGINE, true),
  engineReadOnlyCatalog: asBool(env.VITE_ENGINE_READ_ONLY_CATALOG, true),
  engineSpells: asBool(env.VITE_ENGINE_SPELLS, true),
  engineMonsters: asBool(env.VITE_ENGINE_MONSTERS, true),
  engineConditions: asBool(env.VITE_ENGINE_CONDITIONS, true),
}

export function isFeatureEnabled(flagName) {
  return !!featureFlags[flagName]
}
