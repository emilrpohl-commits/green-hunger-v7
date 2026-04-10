# Schema migration checklist (Stages 2–7)

Use this as a living checklist when authoring `supabase/migrations/*.sql`. Do not apply blindly; order migrations to match rollout stages.

---

## Stage 2 — Seedless platform (minimal DDL)

- [ ] **Optional:** `campaigns` — no strict schema change; ensure app handles **zero rows** (already supported by seedless loader).
- [ ] **Optional:** index on `campaigns(created_at)` if listing many campaigns becomes hot.

---

## Stage 3 — Internal reference library

- [x] **`reference_spells`** — migration `20260411120000_reference_library_srd.sql` + `supabase/schema.sql`; normalized columns + `raw_json`; ETL: `dm/scripts/reference-import.mjs` (2014 spells).
- [x] **`reference_monsters`** — summary columns + full `raw_json` (2014 monsters).
- [x] **`reference_conditions`** — 2014 + 2024 JSON packs.
- [ ] **Expand as needed:** `reference_classes`, `reference_subclasses`, `reference_backgrounds`, `reference_species` / `reference_races`, `reference_features`, `reference_equipment`, `reference_feats`, `reference_traits`.
- [x] **Indexes:** btree on `(ruleset, lower(name))`, level+name for spells; gin `to_tsvector` on spells + monsters (migration).
- [x] **RLS:** open `allow_all_*` policies (dev parity with rest of schema — tighten later).
- [ ] **Data migration:** move or copy existing `spells` where `campaign_id is null` into `reference_spells` if desired; then fix `spells` unique strategy (below).

### Spells table fix (campaign vs reference)

- [ ] Drop global unique on `spells(spell_id)` **after** backfill plan is approved.
- [ ] Add **`UNIQUE (campaign_id, spell_id)`** (nullable `campaign_id` requires PostgreSQL partial unique indexes, e.g. one partial for `campaign_id IS NOT NULL` and one for global homebrew if you keep null campaign spells).
- [ ] Or: **campaign spells only** in `spells` and **all SRD** in `reference_spells` only (simplest uniqueness story).

---

## Stage 4 — PDF import

- [ ] **`character_import_jobs`** (optional) — `id`, `campaign_id`, `status`, `storage_path`, `extracted_json` jsonb, `error`, timestamps.
- [x] Reuse client parse + direct persist for v1 (no jobs table yet).
- [x] **`characters`** provenance path used in importer (`homebrew_json` + `srd_refs` + mapped `stats`).

---

## Stage 5 — Manual character creator

- [ ] Usually **no** new tables if editor writes existing `characters` + `character_spells`.
- [ ] Optional: `character_drafts` for autosave.

---

## Stage 6 — Encounters / stat blocks

- [ ] **`stat_blocks`:** add `cloned_from_reference_id` uuid nullable FK to `reference_monsters.id` (or text `reference_index` + `ruleset`).
- [ ] **`encounters`:** already supports `participants` jsonb; no change required for library UX beyond UI.

---

## Stage 7 — Portraits

- [ ] **Storage bucket** `portraits` (private or public per threat model).
- [ ] **`characters`:** `portrait_original_storage_path`, `portrait_crop` jsonb, `portrait_thumb_storage_path` (optional).
- [ ] **`stat_blocks`:** same triplet (mirror columns).
- [ ] **`npcs`:** already has `portrait_url`; migrate to storage + crop columns for consistency.

### Suggested `portrait_crop` shape (example)

```json
{
  "unit": "relative",
  "x": 0.12,
  "y": 0.08,
  "width": 0.76,
  "height": 0.84,
  "zoom": 1.0
}
```

---

## Verification

After each migration: `supabase db reset` or apply to staging, run DM + player `npm run build`, smoke-test session load and combat start.
