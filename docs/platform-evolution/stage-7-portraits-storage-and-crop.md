# Stage 7 — Portrait storage and crop metadata

## Goal

Move portrait handling from ad-hoc URLs/files toward Supabase Storage-backed assets with normalized crop metadata, while keeping existing portrait fields compatible during transition.

## What shipped

### DDL + storage

- Migration `supabase/migrations/20260412123000_stage7_portraits_storage_and_columns.sql`:
  - adds `portrait_original_storage_path`, `portrait_crop`, `portrait_thumb_storage_path` to:
    - `characters`
    - `stat_blocks`
    - `npcs`
  - creates/updates storage bucket `portraits` (public in dev), 10 MB file limit, image MIME allow-list
  - adds permissive `storage.objects` policies for `portraits` in dev parity mode
- `supabase/schema.sql` mirrors the new portrait columns.

### Shared utilities

- `shared/lib/portraitStorage.js`:
  - path normalization
  - crop normalization/defaults
  - public URL generation from storage path
  - upload helper for portrait files to `portraits/{campaign}/{entityType}/{entityId}/...`

### DM app

- New reusable control: `dm/src/components/PortraitUploadField.jsx`
  - upload portrait to Supabase Storage
  - preview
  - crop metadata editor (`x`, `y`, `width`, `height`, `zoom`)
  - reset/clear controls
- Integrated into:
  - `CharacterEditor.jsx` (Stage 5 editor)
  - `StatBlockEditor.jsx` (replaces old inline portrait upload flow)
  - `NpcLibrary.jsx`
- `StatBlockView.jsx` now resolves portrait from storage path when URL is not set.
- Combat launchers/cards accept URL-style `combatant.image` for player/enemy portraits (backward compatible with legacy filename behavior).

### Player app compatibility

- `players/src/stores/playerStore/dataSlice.js` maps character portrait storage fields and computes `portraitUrl`.
- `players/src/components/PortraitHeader.jsx` prefers DB-backed portrait URLs and falls back to legacy `characters/{image}`.

## Verify

1. Apply migration `20260412123000_stage7_portraits_storage_and_columns.sql`.
2. Builder:
   - Characters → edit one character → upload portrait → save.
   - Stat Blocks → edit one stat block → upload portrait → save.
   - NPCs → edit one NPC → upload portrait → save.
3. Confirm rows have `portrait_original_storage_path` + `portrait_crop`.
4. Run mode combat card and player portrait header show uploaded images when available.
