# spells.rules_json conventions

Normalized spells in the `spells` table carry parser output and **combat classification** in `rules_json`. The player compendium exposes this as `combatProfile.rules` and top-level `rules_json` on merged spell objects.

## Fields used by resolution / cards

| Field | Purpose |
|--------|--------|
| `effect_kinds` | Array: `damage`, `heal`, `buff`, `debuff`, `control`, `utility`, `ongoing` |
| `ongoing` | `{ "duration_rounds": number, "concentration": boolean }` |
| `card.short_effect` | One-line summary for DM/player cards |
| `card.mechanic` | Alternative to `short_effect` for `buildSpellEffectMetadata` |
| `card.deterministic` | Affects deterministic roll helpers |
| `card.control` | Short control label (e.g. `hinder_movement`) |
| `inferred_mechanic` | Legacy bridge to `mechanic` / `resolution_type` |

[`buildSpellEffectMetadata`](../shared/lib/combatRules.js) prefers `card.*` + `effect_kinds`, then falls back to a small spell-id map for unmigrated rows.
