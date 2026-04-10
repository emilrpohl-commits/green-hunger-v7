# Stage 3 — Internal SRD reference library (shipped)

## What you get

- **`reference_spells`**, **`reference_monsters`**, **`reference_conditions`** tables (see migration `supabase/migrations/20260411120000_reference_library_srd.sql` and `supabase/schema.sql`).
- **ETL:** `dm/scripts/reference-import.mjs` — run as **`npm run reference:import`** from **`dm/`** with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **DM Builder → SRD Reference:** browse/search (name filter), view details, **Copy spell to campaign** (inserts into `spells` with a unique `spell_id`), **Copy to stat block** for monsters, **Copy text** for conditions. The reference section is available even when no campaign is loaded (copy actions require a loaded campaign).

## Source data

- Spells & monsters: `docs/5e-database-main/src/2014/` (`5e-SRD-Spells.json`, `5e-SRD-Monsters.json`).
- Conditions: 2014 + `docs/5e-database-main/src/2024/5e-SRD-Conditions.json`.

## Campaign copy semantics

- **Spells:** `spell_id` is `cpy_{campaignShort}_{ruleset}_{source_index}` to satisfy the global `spells_spell_id_unique` constraint until a composite unique is adopted (see schema checklist).
- **Monsters:** `shared/lib/reference/srdMonsterToStatBlock.js` maps SRD JSON into the existing `stat_blocks` shape; review in Stat Block editor after copy.

## Build / verify

- `cd dm && npm run build`
- After migration + import: open Builder → **SRD Reference** and spot-check search + copy.

## Limitations / next steps

- 2024 spells/monsters are not in the bundled JSON set; UI locks ruleset to **2014** for those tabs until ETL sources exist.
- External `dnd5eapi.co` prefill in Stat Block editor remains optional (`VITE_USE_5E_ENGINE`); internal DB reference is preferred for new workflows.
