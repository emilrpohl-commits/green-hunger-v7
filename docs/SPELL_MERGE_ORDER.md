# Spell data merge order (player compendium)

When the player app builds the in-memory spell compendium (`playerStore.loadCharacters`), sources are combined in this order (later layers win where fields overlap for the same `spellId`):

1. **`spell_compendium`** — canonical full dataset (spreadsheet import). Base layer for matching `spell_id`.
2. **`spells` where `campaign_id` IS NULL** — legacy global rows. **Skipped** if a `spell_compendium` row already exists for that `spell_id`.
3. **`spells` where `campaign_id` matches the active session campaign** — campaign/homebrew overrides for the same `spell_id`.
4. **`rules_entities`** (`entity_type = 'spells'`) — frozen SRD snapshot from vendored JSON via `tools/syncRulesEntities.mjs`. Used only when no row exists yet for that `spellId`.
5. **`homebrew_overlays`** (`entity_type = 'spell'`, `campaign_id` from `session_state`) — `overlay_payload` is shallow-merged onto the compendium entry for matching `canonical_ref` (`spells.source_index` or normalized `spell_id`).
6. **`character_spells.overrides_json`** — per-character tuning (DC bumps, custom text). Applied last when assembling each prepared spell on the sheet.

Runtime must not call public HTTP APIs for 5e data; compendium rows always come from Supabase + bundled fallbacks.

See also **`docs/SPELL_COMPENDIUM.md`**.
