# SRD reference import — single pipeline contract

## Canonical pipeline

- **CLI entry:** [`dm/scripts/reference-import.mjs`](../dm/scripts/reference-import.mjs) (`npm run reference:import` from `dm/`).
- **Row mappers:** [`shared/lib/reference/srdReferenceRows.js`](../shared/lib/reference/srdReferenceRows.js) (spells, monsters, conditions) and [`shared/lib/reference/srdReferenceMoreRows.js`](../shared/lib/reference/srdReferenceMoreRows.js) (all other `reference_*` categories).
- **Source data:** JSON under [`docs/5e-database-main/src/{ruleset}/`](../docs/5e-database-main/) (2014 + partial 2024).

Do **not** add a second production import path (e.g. duplicate PostgREST scripts writing the same tables). Extend this pipeline only.

## CLI arguments

| Flag | Meaning |
|------|---------|
| `--category=<name>` | Import one category (see table below). Default: `all` (legacy spell/monster/condition sets + any new categories registered). |
| `--ruleset=2014` \| `2024` | Dataset folder under `docs/5e-database-main/src/`. Some categories exist only for one ruleset. |
| `--dry-run` | Validate and count rows; **no** `upsert` to Supabase. |
| `--no-log` | Skip writing a row to `srd_import_log` (default: log when not dry-run). |

Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY` / `SUPABASE_KEY`).

## Categories

| Category | Table(s) | JSON file(s) |
|----------|-----------|--------------|
| `spells` | `reference_spells` | `5e-SRD-Spells.json` (2014 only in repo) |
| `monsters` | `reference_monsters` | `5e-SRD-Monsters.json` (2014 only) |
| `conditions` | `reference_conditions` | `5e-SRD-Conditions.json` |
| `classes` | `reference_classes` | `5e-SRD-Classes.json` |
| `class-features` | `reference_class_features` | `5e-SRD-Features.json` (+ 2024 subclass flatten) |
| `subclasses` | `reference_subclasses` | `5e-SRD-Subclasses.json` |
| `races` | `reference_races` | `5e-SRD-Races.json` (2014) / `5e-SRD-Species.json` (2024) |
| `traits` | `reference_traits` | `5e-SRD-Traits.json` |
| `equipment` | `reference_equipment` | `5e-SRD-Equipment.json` |
| `magic-items` | `reference_magic_items` | `5e-SRD-Magic-Items.json` |
| `backgrounds` | `reference_backgrounds` | `5e-SRD-Backgrounds.json` |
| `proficiencies` | `reference_proficiencies` | `5e-SRD-Proficiencies.json` |
| `languages` | `reference_languages` | `5e-SRD-Languages.json` |
| `skills` | `reference_skills` | `5e-SRD-Skills.json` |
| `damage-types` | `reference_damage_types` | `5e-SRD-Damage-Types.json` |

## Row shape rules

1. Every reference row includes `ruleset`, `source_index` (SRD `index`), `raw_json` (full source object), `imported_at` (DB default).
2. Upsert conflict target is always **`ruleset, source_index`** unless a migration defines otherwise.
3. Mappers must be **pure** (no Supabase); the CLI handles I/O and logging.

## Import audit

Successful CLI runs (non–dry-run) insert a summary row into **`srd_import_log`** unless `--no-log` is set.
