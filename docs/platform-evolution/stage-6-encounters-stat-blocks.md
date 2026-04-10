# Stage 6 — Encounters & stat block provenance

## Goal

Tie campaign creatures to the internal reference library where they were cloned from, and give the DM a first-class place in **Builder** to author encounter rows (same shape as Play → Encounters / `launchEncounterFromDbRow`).

## What shipped

### DDL

- **`stat_blocks.cloned_from_reference_id`** — nullable UUID FK to `reference_monsters(id)` `ON DELETE SET NULL`, partial index for non-null values. Migration: `supabase/migrations/20260412120000_stat_blocks_cloned_from_reference.sql`. Consolidated `schema.sql` adds the column on `stat_blocks` and attaches the FK after `reference_monsters` exists.

### App behavior

- **SRD Reference → Monsters → Copy to campaign** — passes `cloned_from_reference_id` into `saveStatBlock` so provenance is stored.
- **Stat block duplicate** — clears `cloned_from_reference_id` (copy is no longer the same reference row).
- **Stat Blocks list** — shows a short “Reference clone (SRD monster)” line when the column is set.
- **Builder → Encounters** — list/search, create/edit with title, type, difficulty, notes, and multiple `{ stat_block_id, count, initiative? }` participant rows backed by `saveEncounter` / `deleteEncounter`.

## Verify

1. Apply the new migration on Supabase (or `supabase db reset` on a dev project).
2. Builder → **SRD Reference** → **Monsters** → copy one creature → **Stat Blocks** shows reference clone hint.
3. Builder → **Encounters** → new encounter with two stat block rows → save → Play → Encounters (with DB encounters enabled) can launch it.
