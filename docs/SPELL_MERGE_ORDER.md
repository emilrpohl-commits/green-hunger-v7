# Spell data merge order (player compendium)

When the player app builds the in-memory spell compendium (`playerStore.loadCharacters`), sources are combined in this order (later layers win where fields overlap):

1. **`rules_entities`** (`entity_type = 'spells'`) — frozen SRD snapshot from vendored JSON via `tools/syncRulesEntities.mjs`. Used only when no normalized `spells` row exists for that `spellId`.
2. **`spells` table** — normalized mechanics (`resolution_type`, `save_ability`, `rules_json`, etc.). Overrides the engine row for the same `spell_id`.
3. **`homebrew_overlays`** (`entity_type = 'spell'`, `campaign_id` from `session_state`) — `overlay_payload` is shallow-merged onto the compendium entry for matching `canonical_ref` (`spells.source_index` or normalized `spell_id`).
4. **`character_spells.overrides_json`** — per-character tuning (DC bumps, custom text). Applied last when assembling each prepared spell on the sheet.

Runtime must not call public HTTP APIs for 5e data; compendium rows always come from Supabase + bundled fallbacks.
