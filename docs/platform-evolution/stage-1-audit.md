# Stage 1 audit — static content and 5e integration

This document inventories bundled Green Hunger / static runtime dependencies and external 5e API usage. Each item is classified for later removal, gating, or replacement.

**Classifications**

| Label | Meaning |
|-------|---------|
| **remove** | Delete from runtime paths once DB/UI parity exists |
| **gate** | Keep only when `VITE_DEMO_CAMPAIGN` (or similar) is on |
| **migrate-only** | OK in `supabase/migrate.js` / one-off tools, not in app boot |
| **replace** | Swap to DB / internal reference library / explicit empty state |
| **authoring** | OK for DM authoring prefill; must not be combat/runtime truth |

---

## 1. Bundled content files (`shared/content/`)

| File | Role | Classification |
|------|------|----------------|
| [`session1.js`](../../shared/content/session1.js) | `SESSION_1`, `CHARACTERS`, narrative scaffolding | **gate** / **migrate-only** (already used by migrate) |
| [`session2.js`](../../shared/content/session2.js) | Session 2 narrative, `SESSION_2_ENEMIES` | **gate** / **migrate-only** |
| [`session3.js`](../../shared/content/session3.js) | Session 3 narrative | **gate** / **migrate-only** |
| [`playerCharacters.js`](../../shared/content/playerCharacters.js) | `PLAYER_CHARACTERS` full sheets | **remove** from runtime (replace with DB + empty states) |
| [`statblocks.js`](../../shared/content/statblocks.js) | `STAT_BLOCKS` static monsters | **remove** from runtime (replace with `stat_blocks` + reference library) |
| [`rules-glossary.json`](../../shared/content/rules-glossary.json) | Glossary data | **review** — may become reference library or stay as static helper |

---

## 2. Import graph (who pulls `shared/content`)

| Consumer | Imports | Classification |
|----------|---------|----------------|
| [`dm/src/stores/sessionStore.js`](../../dm/src/stores/sessionStore.js) | `CHARACTERS` from session1 | **replace** with DB roster |
| [`dm/src/stores/combatStore/encountersSlice.js`](../../dm/src/stores/combatStore/encountersSlice.js) | `SESSION_2_ENEMIES` | **remove** / **gate** — DB encounters path exists behind flags |
| [`dm/src/features/statblocks/StatBlockView.jsx`](../../dm/src/features/statblocks/StatBlockView.jsx) | `STAT_BLOCKS` fallback | **replace** — DB-only + optional reference clone |
| [`dm/src/features/spells/SpellLibrary.jsx`](../../dm/src/features/spells/SpellLibrary.jsx) | `PLAYER_CHARACTERS` (bulk assign UI) | **replace** with campaign character list from DB |
| [`players/src/stores/playerStore/index.js`](../../players/src/stores/playerStore/index.js) | `CHARACTERS`, `PLAYER_CHARACTERS` | **replace** — initial state should be empty + DB hydrate |
| [`players/src/stores/playerStore/dataSlice.js`](../../players/src/stores/playerStore/dataSlice.js) | `CHARACTERS` for `PLAYER_RUNTIME_CHARACTERS` merge | **replace** — no fake party default |
| [`shared/lib/partyRoster.js`](../../shared/lib/partyRoster.js) | `CHARACTERS` fallback merge | **replace** — explicit errors / empty roster |
| [`supabase/migrate.js`](../../supabase/migrate.js) | sessions, CHARACTERS, STAT_BLOCKS | **migrate-only** (keep for seeding demos) |

---

## 3. Default campaign and session run context

| Location | Issue | Classification |
|----------|-------|----------------|
| [`dm/src/stores/campaignStore/dataSlice.js`](../../dm/src/stores/campaignStore/dataSlice.js) `loadCampaign(slug?)` — legacy implicit `green-hunger` unless `VITE_SEEDLESS_PLATFORM` | Implicit GH campaign | **done (Stage 2)** — `campaignChoices` + empty/pick UX; `VITE_DEMO_CAMPAIGN` restores GH |
| [`shared/lib/runtimeContext.js`](../../shared/lib/runtimeContext.js) `DEFAULT_SESSION_RUN_ID = 'session-1'` | Player run id default | **replace** — derive from auth / assignment / env without GH id |
| [`dm/src/features/runtime/RightRail.jsx`](../../dm/src/features/runtime/RightRail.jsx) | Static encounter keys `session-1` / `session-2` | **remove** when DB encounters are default |

---

## 4. Lore and narrative branding

| Location | Issue | Classification |
|----------|-------|----------------|
| [`dm/src/stores/revealStore.js`](../../dm/src/stores/revealStore.js) `LORE_CARDS` + fallback on DB error | Bundled lore | **replace** — DB `lore_cards` + empty catalog message |
| [`dm/src/App.jsx`](../../dm/src/App.jsx), [`TopBar.jsx`](../../dm/src/features/runtime/TopBar.jsx), [`players/src/App.jsx`](../../players/src/App.jsx), [`LoginScreen.jsx`](../../players/src/components/LoginScreen.jsx) | "The Green Hunger" copy | **replace** with `VITE_APP_TITLE` or campaign name |

---

## 5. Tools and docs tied to GH

| Location | Issue | Classification |
|----------|-------|----------------|
| [`dm/src/features/builder/SessionImportModal.jsx`](../../dm/src/features/builder/SessionImportModal.jsx) `TEMPLATE_URL` | Points at GH repo raw URL | **replace** with in-repo template path or configurable URL |
| [`shared/lib/parseSessionMarkdown.js`](../../shared/lib/parseSessionMarkdown.js) | Comment references Green Hunger | **cosmetic** / generalize description |

---

## 6. Player app static fallbacks (runtime)

| Location | Issue | Classification |
|----------|-------|----------------|
| [`players/src/stores/playerStore/combatSlice.js`](../../players/src/stores/playerStore/combatSlice.js) | Uses `playerCharacters` static sheet when DB row missing | **replace** — show error / block action when seedless |
| [`players/src/hooks/useCharacterActions.js`](../../players/src/hooks/useCharacterActions.js) | Static target names | **replace** — DB-backed targets only |

---

## 7. External 5e API integration (`shared/lib/engine/`)

| Module | Role | Classification |
|--------|------|----------------|
| [`config.js`](../../shared/lib/engine/config.js) | `VITE_DND5E_API_BASE` (default dnd5eapi.co) | **authoring** only after internal library ships |
| [`dnd5eClient.js`](../../shared/lib/engine/dnd5eClient.js) | HTTP GET + cache | **authoring** |
| [`http.js`](../../shared/lib/engine/http.js) | Timeouts/retries | **authoring** |
| [`rulesService.js`](../../shared/lib/engine/rulesService.js) | `hydrateSpellByIndex`, `getMonsterCombatant`, `listConditions`, spell name list | **authoring** + **runtime risk** |

### Call sites

| File | API usage | Notes |
|------|-----------|-------|
| [`dm/src/features/spells/SpellLibrary.jsx`](../../dm/src/features/spells/SpellLibrary.jsx) | `hydrateSpellByIndex` | Prefill form — OK as optional |
| [`dm/src/features/statblocks/StatBlockEditor.jsx`](../../dm/src/features/statblocks/StatBlockEditor.jsx) | `getResource('monsters', …)` | Prefill form — OK as optional |
| [`dm/src/stores/combatStore/encountersSlice.js`](../../dm/src/stores/combatStore/encountersSlice.js) | `getMonsterCombatant` | **Runtime** combat path when stat block missing — **replace** with DB stat block + internal reference clone |

### Feature flags (existing)

[`shared/lib/featureFlags.js`](../../shared/lib/featureFlags.js): `use5eEngine`, `engineSpells`, `engineMonsters`, etc. — keep; narrow runtime usage per Stage 3.

---

## 8. Database “compendium-like” usage (today)

| Table | Pattern | Notes |
|-------|---------|-------|
| `spells` | `campaign_id is null` treated as compendium in [`dataSlice.js`](../../dm/src/stores/campaignStore/dataSlice.js) | Global unique on `spell_id` — conflicts with per-campaign custom ids (see architecture doc) |
| `spells_raw` | Legacy import stash | Reference pipeline may supersede or feed ETL |
| `stat_blocks` | `campaign_id` set per campaign | Nullable global possible — align with reference vs campaign split |

---

## 9. PDF specimen (Stage 4)

**Danil Character Sheet.pdf** — not present in repository as of this audit. Add under `docs/specimens/` (gitignored if large) or document env path for local dev.

---

## 10. Summary counts

- **shared/content** files: 6  
- **Direct `@shared/content` imports in app code**: 9 files (excluding migrate)  
- **Engine HTTP runtime-critical path**: `getMonsterCombatant` in encounters slice (high priority to retire)  
- **Implicit default campaign**: `loadCampaign` default slug + migrate script  

Stage 2+ should address items marked **remove** / **replace** in dependency order: default campaign → player defaults → combat engine fallback → static stat blocks → lore fallback.
