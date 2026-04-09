# Stat block action JSON (Green Hunger)

Actions live in `stat_blocks.actions`, `bonus_actions`, and `reactions` (JSON arrays). The DM app maps them to combat `actionOptions` in [`dm/src/stores/combatStore.js`](dm/src/stores/combatStore.js). Shared helpers: [`shared/lib/statBlockActions.js`](../shared/lib/statBlockActions.js).

## Recommended shape

```json
{
  "name": "Breath Weapon",
  "type": "action",
  "desc": "Optional full text",
  "resolution": {
    "kind": "save",
    "save_ability": "DEX",
    "dc": 14,
    "on_save": "half_damage",
    "tags": ["area", "fire"]
  },
  "damage": [{ "dice": "4d6", "type": "fire" }],
  "recharge": { "kind": "d6", "min": 5 },
  "range": { "type": "cone", "feet": 30 }
}
```

- **resolution.kind**: `save` | `attack` | `other` (inferred from `saveType` / `toHit` if omitted).
- **recharge**: `{ "kind": "d6", "min": 5 }` or `{ "kind": "rest", "length": "short" }` (convention only until the combat loop enforces it).

## Legacy / loose fields

Editors may still use `toHit`, `saveType`, `damage` as a string, etc. `normalizeStatBlockAction` folds these into `resolution` and `damage[]` for consistent combat cards.

## Import

Use [`tools/importStatBlockJson.mjs`](../tools/importStatBlockJson.mjs) to upsert a JSON file into `stat_blocks` (requires `slug` and `name`).
