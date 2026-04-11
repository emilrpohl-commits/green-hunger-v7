# Spell compendium (canonical dataset)

The full spell list lives in Postgres table **`public.spell_compendium`**, not in the per-campaign `spells` rows with `campaign_id IS NULL`.

- **Compendium** (`spell_compendium`): imported from `DnD_5e_Spells_with_Targeting.xlsx` (or compatible columns). Stable key: **`spell_id`** = slug derived from name + level + source.
- **Campaign / homebrew** (`spells` with `campaign_id` set): overrides and custom spells. Shown on the DM **Campaign** tab.
- **Legacy global** (`spells` with `campaign_id IS NULL`): still loaded only if no compendium row exists for the same `spell_id` (transitional).

## Apply schema

Run the migration that creates `spell_compendium` (see `supabase/migrations/20260420120000_spell_compendium.sql`) on your Supabase project.

## Import XLSX

1. Copy `DnD_5e_Spells_with_Targeting.xlsx` to **`data/DnD_5e_Spells_with_Targeting.xlsx`** (repo root), or pass `--xlsx /absolute/path.xlsx`.
2. Install tool deps once:

```bash
cd tools && npm install
```

3. Dry run (no DB writes):

```bash
node importSpellCompendium.mjs --dry-run
```

4. Upsert into Supabase (set **`SUPABASE_SERVICE_ROLE_KEY`** or a key allowed to insert):

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
node importSpellCompendium.mjs --write-db
```

Optional: `--batch my-label` stores a label in `import_batch` for auditing.

Re-running the import updates existing rows on **`spell_id`** (idempotent).

## DM app

After import, open **Spells → Compendium** and click **Reload compendium**. Use the browser for search, filters, detail panel, bulk assign, and **Create override** (still opens the campaign spell editor).

## Player app

`loadCharacters` merges **`spell_compendium` first**, then legacy global `spells`, then campaign `spells` for the active session campaign, then `rules_entities` gaps — see `docs/SPELL_MERGE_ORDER.md`.
