# Stage 5 — Manual character creator / editor

## Goal

Let the DM create and edit PCs in the Builder using the same `characters` row shape as PDF import and the player app, without new tables for v1.

## What shipped

- **`shared/lib/characterSheetShape.js`** — defaults, normalization, `blankDbCharacter`, `dbRowToEditorForm`, shared constants used by import + editor.
- **Campaign store** — `characters` loaded with `loadCampaign`, `saveCharacter` / `deleteCharacter` in `entityCrudSlice.js` (column whitelist + insert vs update keyed off whether the id is already in local `characters`).
- **DM UI** — Builder nav **Characters** → `CharacterEditor.jsx`: list, new (4-step quick setup + full form), edit, delete; SRD race/background names from `docs/5e-database-main` JSON as datalist hints.

## Verify

1. Open Builder → **Characters** for a loaded campaign.
2. **New character** — complete quick setup, then **Save**; confirm row in Supabase `characters`.
3. Reload campaign — character appears in list; edit and save again.
4. Player app — character shows with correct stats/abilities (same as after PDF import).
