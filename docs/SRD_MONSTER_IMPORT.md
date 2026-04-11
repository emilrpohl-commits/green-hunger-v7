# SRD 5.2.1 monsters → stat blocks import

This pipeline imports [`src/data/monsters/monsters-srd-5.2.1.json`](../src/data/monsters/monsters-srd-5.2.1.json) into the `stat_blocks` table for a **specific campaign**. The DM app loads stat blocks with `campaign_id` equal to the active campaign only (global `campaign_id` null rows are not shown in the library today).

## Prerequisites

1. Apply the migration that adds `stat_blocks.import_metadata` (see `supabase/migrations/20260421120000_stat_blocks_import_metadata.sql`).
2. A valid campaign UUID from your `campaigns` table.
3. `SUPABASE_URL` and a key with insert/update rights on `stat_blocks` (typically the **service role** key for CLI import).

## Reserved slugs

Imported monsters use slugs:

`srd521-<json-id>`

Example: `srd521-aboleth`.

Do not use this prefix for homebrew stat blocks. The importer only **updates** existing rows if they already include the tag `srd-import`. If the same slug exists without that tag, the row is **skipped** (collision).

## Tags and source

Each imported row gets:

- `tags`: `srd-import`, `srd-5.2.1`, `parse-quality-{high|medium|low}`
- `source`: `SRD 5.2.1`
- `import_metadata.srd`: `monster_id`, `parse_quality`, `warnings`, `xp`, `passive_perception`, full original `raw_block`, and `dataset` filename

## Commands

Dry run (no DB writes; writes JSON + Markdown reports under `tools/reports/`):

```bash
node tools/importSrdMonsters.mjs --dry-run
```

Custom JSON path:

```bash
node tools/importSrdMonsters.mjs --dry-run --json path/to/monsters.json
```

Import into a campaign:

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
node tools/importSrdMonsters.mjs --write-db --campaign-id YOUR_CAMPAIGN_UUID
```

Optional: `--report-dir /path/to/reports`, `--batch-size 20` (chunk size for “existing slug” lookups).

## Review report

Each run produces timestamped files in `tools/reports/`:

- `srd-monster-import-report-<iso>.json` — full per-monster status
- `srd-monster-import-report-<iso>.md` — table of **medium/low** quality and any row with warnings

## Implementation reference

- Cleanup + mapping: [`shared/lib/srdMonsters/cleanAndMap.js`](../shared/lib/srdMonsters/cleanAndMap.js)
- CLI: [`tools/importSrdMonsters.mjs`](../tools/importSrdMonsters.mjs)
