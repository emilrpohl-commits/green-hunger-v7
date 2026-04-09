# 5e Engine Rollout And Rollback

This project now supports a self-hosted 5e engine path with feature flags and fallback behavior.

## Feature Flags

- `VITE_USE_5E_ENGINE` (default `true`)
- `VITE_ENGINE_READ_ONLY_CATALOG` (default `true`)
- `VITE_ENGINE_SPELLS` (default `true`)
- `VITE_ENGINE_MONSTERS` (default `true`)
- `VITE_ENGINE_CONDITIONS` (default `true`)

## Runtime Data Sources

1. Canonical engine data from `rules_entities` (2024 primary).
2. Campaign-authored data from `spells`, `stat_blocks`, `characters`, and content tables.
3. Legacy/static content fallback in shared content and existing store behavior.

Apply `supabase/schema.sql` (includes `characters`, `combat_feed.metadata`, `combat_resolution_events`), then seed PCs with `node tools/seedCharactersFromBundle.mjs --write-db`. Spell merge order: [SPELL_MERGE_ORDER.md](./SPELL_MERGE_ORDER.md).

`node tools/engineSmokeCheck.mjs` checks `rules_entities` and reports `characters` (set `GH_REQUIRE_CHARACTERS=1` to fail the run if the `characters` check does not succeed).

## Safe Rollout Order

1. Enable `VITE_USE_5E_ENGINE=true` in non-production.
2. Run `node tools/syncRulesEntities.mjs --ruleset=2024 --write-db`.
3. Run `node tools/syncRulesEntities.mjs --ruleset=2014 --write-db`.
4. Validate with `node tools/engineSmokeCheck.mjs`.
5. Enable flags by domain:
   - `VITE_ENGINE_SPELLS=true`
   - `VITE_ENGINE_MONSTERS=true`
   - `VITE_ENGINE_CONDITIONS=true`
6. Validate player spell casting, DM encounters, and condition application.

## Rollback

For immediate rollback, set:

- `VITE_USE_5E_ENGINE=false`

This keeps all legacy data paths active and bypasses engine-backed reads.

For partial rollback, disable domain flags individually:

- `VITE_ENGINE_SPELLS=false`
- `VITE_ENGINE_MONSTERS=false`
- `VITE_ENGINE_CONDITIONS=false`

## Notes

- `rules_entities` stores canonical source payloads with provenance fields.
- App stores are intentionally written with non-throwing fallbacks to preserve session continuity.
