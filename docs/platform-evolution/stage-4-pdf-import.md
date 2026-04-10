# Stage 4 — PDF character import (implemented)

## What shipped

- New DM Builder section: **Character Import** (`dm/src/features/characters/CharacterPdfImport.jsx`).
- Upload any local PDF character sheet, parse client-side with `pdfjs-dist`, produce an intermediate draft JSON, and require explicit **Confirm & Save to DB**.
- Spell matching runs against internal `reference_spells` rows (ruleset-selectable), with:
  - matched list + confidence label (`high` on exact normalized name match),
  - unresolved spell names surfaced to the DM (no silent invent).
- Persist path writes to:
  - `characters` (`homebrew_json` + `srd_refs` importer provenance),
  - `spells` (campaign copies cloned from reference rows when missing),
  - `character_spells` (slot/order rows linked via deterministic `spell_id`).

## Workflow

1. Builder → **Character Import**
2. Choose ruleset + upload PDF
3. **Parse PDF**
4. Review:
   - mapped character fields,
   - matched/unresolved spells,
   - extracted text sample
5. **Confirm & Save to DB**

## Notes and limitations

- Parsing is heuristic and optimized for v1 robustness, not strict form-template extraction.
- The importer does not require a hard-coded specimen filename; any PDF can be uploaded.
- `character_import_jobs` table is intentionally deferred (v1 uses immediate client parse + direct persist).
- If spell matches are sparse, unresolved names are still preserved in `characters.homebrew_json`.

## Files

- `dm/src/features/characters/CharacterPdfImport.jsx`
- `dm/src/features/builder/BuilderLayout.jsx` (new nav item)
- `dm/package.json` (`pdfjs-dist`)

