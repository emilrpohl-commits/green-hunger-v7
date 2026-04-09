# Import Safety Checklist

Use this checklist before running markdown/session imports in DM builder.

## 1) Backup snapshot (one-time or before risky changes)

We created a DB snapshot schema:

- `backup_20260409.characters`
- `backup_20260409.character_states`
- `backup_20260409.npcs`
- `backup_20260409.stat_blocks`
- `backup_20260409.sessions`
- `backup_20260409.scenes`
- `backup_20260409.beats`
- `backup_20260409.scene_branches`

Restore strategy:

- To restore one table, copy rows back from the `backup_20260409` schema into `public`.
- Prefer restoring specific rows by `id` over full-table replacement.

## 2) Import overwrite policy

- Do not use overwrite import mode unless you explicitly want replacement.
- The markdown importer is configured to pass `p_overwrite_session_id = null`.

## 3) Destructive action policy

- Treat all delete/archive buttons as destructive.
- For now, session/stat block "delete" flows are switched to archive semantics (`archived_at`).
- If archive columns are missing in a new environment, run:
  - `supabase/add_archive_columns.sql`

## 4) Post-import verification

After each import:

1. Confirm session appears in builder outliner.
2. Confirm scenes and beats exist and are navigable.
3. Confirm related stat blocks are present.
4. Confirm player-critical entities still exist:
   - Dorothea, Kanan, Danil, Ilya
   - Damir / Corrupted Wolf / Rotting Bloom stat blocks

