# Combat Authority Contract

## Purpose
Keep DM and player combat UI consistent by enforcing one source of truth during active combat.

## Authority Rules
- During `combatActive=true`, combat-critical fields are authoritative from `combat_state.combatants`:
  - `curHp`
  - `tempHp`
  - `conditions`
  - `concentration`
  - `deathSaves`
- `character_states` is treated as profile persistence and non-combat state.
- Runtime merges from `character_states` must not overwrite the fields above while combat is active.

## Write Path Rules
- Primary path for combat damage is `apply_combat_damage` RPC.
- If RPC fails, client must perform deterministic fallback:
  - insert combat feed damage event,
  - upsert `combat_state`,
  - update local sync watermark.
- Damage metadata should include:
  - `kind=damage`
  - `target_id`
  - `combat_action_id`

## Realtime Rules
- `combat_state` events are applied with stale protection (`updated_at` watermark).
- Feed events are deduped by `id` and ordered by:
  1. `timestamp desc`
  2. `id desc` (tie-breaker)

## Operational Checks
- No HP divergence between DM and player surfaces for 10 consecutive rounds.
- No missing feed event for successful combat actions.
- No unresolved save prompt after resolution event.
