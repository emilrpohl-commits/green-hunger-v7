# Green Hunger — Long-Term Roadmap
## Full app vision: DM console + player app

This document covers everything beyond `docs/Claude Brief 1.md`. That brief handles the immediate build (session outliner, DOCX import, run-mode refactor). This roadmap covers what comes after — the full set of features needed to make both apps fully workable at the table and robust enough to carry the full campaign.

Items are grouped by area, then ordered within each area by priority. Each item notes which app it affects, what's already in place, and what work remains.

---

## Housekeeping (do first)

### Delete `docs/MASTER-BRIEF.md`
The file `docs/Claude Brief 1.md` (uploaded by hand) and `docs/MASTER-BRIEF.md` (committed by script) are identical. Delete `MASTER-BRIEF.md` to avoid confusion. Keep `Claude Brief 1.md` as the canonical brief name.

### Remove `.DS_Store` from repo
`.DS_Store` is committed to the root of `greenhunger-dm`. Add a `.gitignore` with at minimum `**/.DS_Store` and remove the existing one.

---

## 1. Session management

### 1.1 Session writing guide integration
**Status:** Guide written (`session-writing-guide.md`), not yet committed to repo.
**Work:** Commit `session-writing-guide.md` to `docs/` in `greenhunger-dm` so Claude Code can reference it when helping write or validate session content.

### 1.2 Prep mode — make it functional
**Status:** `session_state.mode` field exists in Supabase. `PREP / LIVE` toggle is built in the DM console topbar but not yet wired to behaviour.
**Work:**
- In `PREP` mode: DM can navigate beats freely without advancing `current_scene_index` / `current_beat_index` in Supabase. Player view freezes on last live state — no Realtime updates pushed.
- In `LIVE` mode: all beat advances push to `session_state` as normal.
- Topbar indicator: amber `PREP` pill vs green `LIVE` pill.
- Write `mode` to `session_state` on toggle.

### 1.3 Multi-session architecture
**Status:** `session_state.active_session_uuid` column exists but is `null`. The run-mode store currently hard-codes to the first session in the array.
**Work:** Wire `session_state.active_session_uuid` to the actual session UUID when the DM switches sessions in the outliner. Run mode reads from this field to know which session is live.

### 1.4 Post-session notes
**Status:** `sessions.post_session_notes` column exists on all sessions, always empty.
**Work:** In the outliner session metadata panel, the `Post-Session Notes` textarea already exists — it just needs auto-appending the roll log from `gh_shared.data.rolls` when "Close Session" is triggered. A simple "Copy roll log" button in the field would also work. Save to `sessions.post_session_notes`.

---

## 2. Combat & real-time

### 2.1 HP sync between `combat_state` and `character_states`
**Status:** HP exists in both `combat_state.combatants` (JSONB) and `character_states` (relational rows). Currently maintained separately — drift is possible.
**Work:** Choose one source of truth (recommend `character_states`) and have the combat tracker read/write HP from there. Remove duplicate HP from `combat_state.combatants` or write a trigger to keep them in sync. This is important before session 2.

### 2.2 Active turn indicator — player app
**Status:** `combat_state.active_combatant_index` is subscribed to in real time. No visual signal exists when it's a player's turn.
**Work:** When the active combatant ID matches the logged-in player's character ID, show a pulsing green glow on the HP bar or character name (`box-shadow: 0 0 12px var(--green-bright)`, animated pulse). Show a toast: "Your turn" — auto-dismissing after 4 seconds.

### 2.3 Combat portraits on combatant cards — DM console
**Status:** `stat_blocks.portrait_url` exists. `combat_state.combatants` JSONB does not currently carry portrait URLs.
**Work:** When a stat block is loaded into combat, carry its `portrait_url` through onto the combatant JSONB. On the combat tracker card, show a 32×32px circular portrait left of the name. Active combatant: `var(--green-bright)` border. No portrait: monogram fallback.

### 2.4 Initiative tracker improvements
**Status:** Initiative is set manually per combatant. No auto-roll, no tiebreaker, no "hold" state.
**Work (in priority order):**
- Show round number prominently in the topbar during combat
- "Hold" button per combatant (moves them to end of order for this round)
- Auto-end-of-round detection (when all combatants have acted, auto-advance round counter)
- "Legendary Actions" reminder at end of round for relevant stat blocks

---

## 3. Green Marks & campaign state

### 3.1 Green Mark display — player app
**Status:** `character_states.green_marks` column added (integer, default 0). Not yet displayed in player app.
**Work:** On each character sheet, show Green Mark count as filled/unfilled pip circles (`var(--green-bright)` / `var(--border-dim)`). Label: "GREEN MARKS" in mono uppercase. Read-only on player side — subscribe to `character_states` Realtime. DM writes via character roster panel.

### 3.2 Green Mark tracker — DM console
**Status:** Column exists, no UI to modify it.
**Work:** In the character roster panel (see §5.1), show Green Mark count with `+` / `−` buttons per character. Write to `character_states.green_marks`.

### 3.3 Campaign state / tension clocks
**Status:** `campaign_state` table seeded with `id = 'green-hunger'`. Contains `weald_corruption` (currently 2/10), `talona_foothold` (true), `active_clocks` (two clocks: Weald Corruption 2/10, Birna's Strength 3/6), `session_flags`, `faction_attitudes`.
**Work:** Add a **Campaign** panel to the DM console (tab or collapsible section):
- Render each clock in `active_clocks` as a pie-segment style clock (Blades in the Dark style). `+` / `−` segment controls.
- `weald_corruption` as a progress bar with `+` / `−`.
- `talona_foothold` as a boolean toggle.
- `session_flags` as a key/value list (add/remove).
- All writes via Supabase client to `campaign_state`.
- "Add Clock" button to push new clock objects to `active_clocks` array.

### 3.4 Named marks
**Status:** `campaign_state.named_marks` JSONB field exists (`{ "kanan": null, "danil": null, ... }`). Not surfaced anywhere.
**Work:** In the campaign panel, show a small field per character for a named mark (e.g. "The Marked"). DM can type a title — this is the narrative name for a character's corruption threshold. Display in the character roster alongside the pip count.

---

## 4. Audio

### 4.1 Music player — DM console
**Status:** `music_tracks` table exists (created in QOL migration). No UI built.
**Work:** A persistent collapsible audio panel in the DM console — docked to bottom or sidebar. DM's machine only — no sync to players.

**Two source modes:**
- **Upload:** MP3/OGG → Supabase Storage `assets/music/{filename}`. Gets public URL, saves row to `music_tracks`. Browse and select from library.
- **URL:** Paste any direct MP3 URL. Saved to `music_tracks` with `source_type: 'url'`.

**Controls:** Play/Pause, volume slider, loop toggle, track name, fade-out button (3-second fade to 0 then pause), "Cue next" slot for crossfade.

**Scene-linked audio:** When DM advances to a scene with `atmosphere.music_url` set, show a toast: "Cue: [music_label] →" with a one-click Play button. Do not auto-play.

### 4.2 Scene atmosphere panel
**Status:** `scenes.atmosphere` JSONB column exists (added in QOL migration). No UI built.
**Work:** Collapsible panel in the scene header of the outliner (or beat view in run mode). Fields: `music_label`, `music_url` (or pick from library), `lighting`, `weather`, `ambient_notes`. Saves to `scenes.atmosphere`. In run mode, surfaces as a persistent DM reference strip at the top of the beat panel.

---

## 5. Character management

### 5.1 Character roster panel — DM console
**Status:** `character_states` Realtime subscription exists in run mode. No DM-facing roster view.
**Work:** Add a **Roster** panel to the DM console right sidebar or as a collapsible section. Shows all four characters (Dorothea, Kanan, Danil, Ilya) with:
- Portrait (28px circular)
- Name, class, level
- Current HP / max HP — inline `+` / `−` (writes to `character_states.cur_hp`)
- Green Marks — pip display with `+` / `−` (writes to `character_states.green_marks`)
- Conditions — badge list
- `is_active` toggle — Ilya only (controls player select screen visibility, writes to `characters.is_active`)
- `player_name` text input — Ilya only (writes to `characters.player_name`)
Subscribes to `character_states` Realtime so HP changes from player app are immediately visible.

### 5.2 PDF upload / level-up tool
**Status:** Architecture designed. `characters` and `character_spells` tables built and seeded. Character data loads from Supabase in player app.
**Work:** Add "Import from D&D Beyond PDF" button in a Characters panel in the DM console. Client-side PDF parsing using `PDF.js` or `pdf-parse`:
1. Parse D&D Beyond PDF export (consistent format — level, ability scores, saving throws, skills, spell slots, features, weapons).
2. Show diff view: "Level 4 → 5. Changes: HP 26→32, new spell slot L3×2, new feature: [X], new spell: [Y]."
3. On confirm: `UPDATE characters SET level = $1, ... WHERE id = $2` + upsert changed spells in `character_spells`.
4. Warn about spells with no description: "3 new spells added — descriptions need to be filled in."

Note: spell descriptions are NOT in D&D Beyond PDF exports. New spells need descriptions added manually or from a reference table.

### 5.3 Ilya character sheet — player app
**Status:** Ilya seeded in `characters` and `character_states`. `is_active = false`. Sheet structure likely built but needs verification.
**Work:** Verify Ilya's full character sheet renders correctly in the player app when `is_active = true`. Confirm spell slots, spells, features, and backstory match the campaign spec. The player-facing backstory should omit his Talona connection.

---

## 6. Lore & reveal system

### 6.1 Lore reveal — end-to-end wiring
**Status:** `reveals` table exists. `revealed_content` table exists. `revealIn` animation in player app exists. `gh_shared.data.unlocked.loreCards` tracks which cards are unlocked. System is built in fragments but not wired end-to-end.
**Work:**

**DM console — Reveals panel:**
- Grid of all available lore cards for the campaign (from `gh_shared.unlocked.loreCards` and/or a hardcoded card registry)
- Each card: ID, title, brief description, locked/revealed status
- "Reveal to players" button → INSERT into `reveals`: `{ session_id, card_id, category, title, content, tone }`
- Once revealed: card shows timestamp and "Revealed" state

**Player app — Reveal display:**
- Subscribe to `reveals` via Realtime
- On new row: animate card in using existing `revealIn` animation
- Display as overlay card: title, content, tone-appropriate styling
- Player can dismiss (stays accessible in Lore tab)
- Lore tab: all previously revealed cards ordered by `revealed_at`

### 6.2 Asset reveal system
**Status:** `assets` table fully modelled (type, file_url, thumbnail, visibility, reveal_condition, linked entity) — 0 rows.
**Work:** A DM panel for uploading and managing assets (maps, handouts, item images). Push button reveals asset to player view. Player view renders it as a card with `revealIn` animation. Integrates with the lore reveal system — assets and lore cards use the same reveal mechanism.

---

## 7. NPC management

### 7.1 NPC quick-reference panel — DM console
**Status:** `npcs` table fully designed — 0 rows.
**Work:** Add a lightweight NPC panel to the DM console builder:
- List of NPCs for the current arc (filtered by `campaign_id`)
- Each card: portrait (upload or URL), name, role, one-line motivation, secret (collapsed behind `[reveal]` toggle)
- Inline "Add NPC" form
- Does not need to sync to the player view

### 7.2 NPC linkage to scenes
**Status:** `arcs.key_npc_ids` array exists. Not surfaced.
**Work:** When viewing a scene in run mode or the outliner, show a small NPC chip strip for any NPCs linked to the current arc. Clicking a chip opens their card in a popover. This replaces having to remember who's relevant.

---

## 8. Rules reference & glossary

### 8.0 Rules glossary — what it is and what it enables
**Status:** Parsed and committed. `src/data/rules-glossary.json` in `greenhunger-dm` contains 155 entries from the 2024 D&D rules glossary — all core rules terms, all 14 conditions, all action types, all area-of-effect shapes, all hazard types, damage types, and creature types. Each entry has a `term` and `definition` field. Entries are tagged where relevant (e.g. `Blinded [Condition]`, `Dash [Action]`, `Burning [Hazard]`) to allow category filtering.

**Data file:** `src/data/rules-glossary.json`
```json
[
  { "term": "Blinded [Condition]", "definition": "A Blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have Advantage, and the creature's attack rolls have Disadvantage." },
  { "term": "Concentration", "definition": "Some spells and other effects require Concentration to remain active..." },
  ...
]
```

**Import in components:**
```js
import glossary from '../data/rules-glossary.json';

// Get all conditions
const conditions = glossary.filter(e => e.term.includes('[Condition]'));

// Lookup a specific term
const entry = glossary.find(e => e.term.toLowerCase().startsWith('concentration'));

// Search
const results = glossary.filter(e =>
  e.term.toLowerCase().includes(query.toLowerCase()) ||
  e.definition.toLowerCase().includes(query.toLowerCase())
);
```

---

### 8.1 DM rules lookup panel — DM console
**Status:** Data ready. No UI built.
**What it does:** A floating search panel in the DM console topbar (keyboard shortcut `?` or a `[?]` button). Type any rules term and the matching glossary entry surfaces instantly — without leaving the app. Critical for mid-session rulings on grappling, conditions, cover, opportunity attacks, etc.

**Implementation:**
- Import `src/data/rules-glossary.json`
- A `<RulesLookup>` component: a small modal or slide-in panel triggered by `?` keydown or button click
- Text input with live filtering against both `term` and `definition` fields
- Results list: term as heading, definition as body text. Max 5 results shown.
- Category filter chips: All / Conditions / Actions / Areas of Effect / Hazards (filter by tag in `[brackets]`)
- Close on Escape or click-outside
- No database calls — purely client-side, instant

**Suggested placement:** Top-right of the DM console topbar, next to the PREP/LIVE toggle. A small `[?]` button that opens the panel.

### 8.2 Condition tooltips — player app
**Status:** Data ready. Conditions display as badges with no descriptions.
**What it does:** When a player taps a condition badge on their character sheet (e.g. "Poisoned", "Grappled"), a popover appears with the full mechanical definition from the glossary. Eliminates "what does Restrained actually do?" questions mid-combat.

**Implementation:**
- Import `src/data/rules-glossary.json` in the player app (`greenhunger-players`)
- When rendering a condition badge, look up the matching entry:
  ```js
  const entry = glossary.find(e => e.term.toLowerCase().startsWith(conditionName.toLowerCase()));
  ```
- On tap/click: show a small popover anchored to the badge with `entry.definition`
- Popover dismisses on tap-outside or second tap
- All 14 conditions are in the glossary: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious
- Style to match existing badge colours — popover background `var(--bg-surface)`, border `var(--border-bright)`, text `var(--text-primary)`

### 8.3 Stat block condition cross-references — DM console
**Status:** Data ready. Stat block descriptions reference conditions by name (e.g. "target is Poisoned") as plain text.
**What it does:** In the combat tracker and stat block viewer, condition names mentioned in ability descriptions become tappable — clicking one opens the same glossary popover as §8.2. Keeps the DM from having to context-switch when a new status effect is applied.

**Implementation:**
- A `<GlossaryLink>` component that wraps condition/action names in stat block text
- Use a regex to detect known glossary terms in any string of stat block text:
  ```js
  const CONDITION_NAMES = glossary
    .filter(e => e.term.includes('[Condition]'))
    .map(e => e.term.replace(' [Condition]', ''));
  // Regex: match any condition name as a word boundary
  ```
- Replace matched terms with tappable `<GlossaryLink term={name}>` spans
- Shares the same popover component as §8.2

---

## 9. Player app improvements

### 9.0 Skill check table rendering — DM console run mode
**Status:** Partially done. Hardcoded sessions (Sessions 1–3 in the bundle) already render skill check beats as styled cards with a mono uppercase trigger label and amber italic result text — this looks correct. However, Supabase-backed beats (anything imported via the DOCX import tool or edited in the outliner) store `mechanical_effect` as a JSON string and the run-mode beat panel has no code to parse and display it as a table — it would render raw JSON.

**Root cause:** Two separate content paths exist in the run-mode panel. The hardcoded sessions use explicit `trigger`/`text` fields per check. The Supabase path stores checks as a JSONB array in `mechanical_effect` and the panel does not parse it.

**Work (small — contained to one component):**
- In the run-mode beat panel, when rendering a `check` or `prompt` beat loaded from Supabase:
  1. Attempt `JSON.parse(beat.mechanical_effect)`
  2. If it parses as an array of `{ trigger, skill, dc, result }` objects, render using the **existing** combat prompt card style already in the bundle — mono uppercase trigger label, skill + DC inline in `var(--text-muted)`, result text in `#d4a080` italic
  3. If `JSON.parse` fails (legacy plain text value), fall back to rendering the raw string as before
- No new visual style needed — reuse the existing `combatPrompts` card pattern exactly
- The beat editor skill check table (Part 1 of the master brief) writes the correct JSONB format — once both are built, the full round-trip works

**Impact:** Without this, every DOCX-imported skill check beat will show raw JSON in run mode. With it, they render as clean, readable cards matching the existing hardcoded session style.

**Priority:** Do this as part of the Part 1 outliner build (master brief), not as a separate task — the beat editor and the run-mode display are built together.

---

### 9.1 Party view
**Status:** Party view was removed from the login screen. Unclear if it exists elsewhere.
**Work:** Decide whether to reinstate a party overview screen (shows all four characters' HP, conditions, spell slots) as a selectable "view" in the player app. Most useful in combat when a player wants to see the full party state without switching characters.

### 9.2 Death saves UI
**Status:** `character_states.death_saves` tracked in Supabase. UI built but unclear whether the 0HP / unconscious state is handled gracefully.
**Work:** When `cur_hp = 0`, show the death saves panel prominently on the character sheet. Successes/failures should be tappable directly. DM console roster panel should show a visual indicator for any character at 0 HP.

### 9.3 Spell slot sync between `character_states` and `characters`
**Status:** `character_states.spell_slots` tracks used slots. `characters.spell_slots` (via `stats` JSONB) tracks max slots. These need to stay in sync as characters level up.
**Work:** Ensure level-up (via PDF upload) updates `characters` max spell slots, and that the player app correctly reads max from `characters` and used from `character_states` — not mixing up the two.

### 9.4 Condition tooltips
**Status:** Superseded by §8.2 above — data is now in `src/data/rules-glossary.json`. See §8.2 for implementation spec.

---

## 10. Stat blocks & encounters

### 10.1 Portrait image upload in stat block creator
**Status:** Stat block image upload currently uses `FileReader` base64 inline encoding rather than Supabase Storage. Portrait is stored as a data URL in the database.
**Work:** Switch to `supabase.storage.from('assets').upload('portraits/{slug}.jpg', file, { upsert: true })` then `getPublicUrl()`. Populate `portrait_url` with the storage URL. Show preview thumbnail. The bucket is public, anon key has INSERT permission.

### 10.2 Encounter pre-sets
**Status:** `encounters` table designed (participants JSONB, terrain, hazards, objectives, tactics, scaling, rewards) — 0 rows.
**Work:** Add an encounter builder to the DM console stat blocks area. Pre-build encounter compositions (e.g. "3× Rotting Bloom", "Damir + web chamber") and save to `encounters`. In run mode, "Load encounter" button pulls combatants directly into the combat tracker from a saved encounter rather than adding them one at a time.

---

## 11. Infrastructure & reliability

### 11.1 Migration history
**Status:** 8 migrations tracked in Supabase. All schema changes we made today are tracked. Schema before today was applied directly with no migration history.
**Work:** Export the current full DDL as a baseline migration (`supabase/migrations/0000_baseline.sql`) and commit to `greenhunger-dm` so the schema is reproducible. Add `supabase/` to `.gitignore` exclusions if needed.

### 11.2 `gh_shared` cleanup
**Status:** `gh_shared` is a single-row JSON blob acting as a second database — contains roll log, HP, spell slots, session summaries, unlocked lore cards, active monsters, initiative state. It was a fast workaround and has grown large.
**Work:** Audit what's in `gh_shared` that hasn't been migrated to proper tables. Migrate each piece:
- `playerHp`, `spellSlots`, `deathSaves` → already in `character_states` — remove from `gh_shared`
- `rolls`, `playerRolls` → can stay as a session-scoped log or move to a `roll_log` table
- `sessionSummaries` → move to `sessions.post_session_notes`
- `unlocked.loreCards` → move to `revealed_content` table
- `activeMonsters` → already in `combat_state.combatants`
- `combatActive`, `combatRound` → already in `combat_state`
Once migrated, `gh_shared` should only contain the roll log (ephemeral per-session data that doesn't need to persist). Eventually it can be removed entirely.

### 11.3 Orphaned `is_active` and `player_name` in `character_states`
**Status:** These columns were added to `character_states` before we moved character data to the `characters` table. The app now correctly reads from `characters`. The `character_states` versions are orphaned.
**Work:** Remove `is_active` and `player_name` from `character_states` in a migration. Confirm the app has no remaining references to `character_states.is_active` or `character_states.player_name` before doing so.

### 11.4 RLS tightening (deferred from earlier)
**Status:** All tables have `USING (true)` blanket policies — any anon client can read/write everything. We attempted to tighten these earlier but reverted to avoid breaking the DM console.
**Work:** Once the DM console uses proper auth (or at minimum a session secret rather than the anon key), tighten RLS on mutable tables:
- `session_state`, `combat_state`, `gh_shared`: UPDATE only on known singleton row IDs
- `combat_feed`, `reveals`: INSERT/DELETE scoped to `session_id = 'session-1'`
- `character_states`: UPDATE only (no INSERT, no DELETE — rows are pre-seeded)
This is a security improvement, not a functional one — deprioritise until the app is otherwise stable.

### 11.5 Performance indexes
**Status:** Several foreign keys have no covering index. At current data volumes this is irrelevant, but worth adding before the schema grows.
**Work:** Add indexes on:
- `consequences.branch_id`
- `encounters.campaign_id`
- `factions.campaign_id`
- `npcs.stat_block_id`
- `scene_branches.target_scene_id`
- `character_spells.character_id`

---

## Priority summary

For reference, here is how these items stack up against each other for session readiness:

### Before Session 2 (critical)
- §2.1 HP sync between `combat_state` and `character_states`
- §2.2 Active turn indicator in player app
- §3.1 Green Mark display — player app
- §3.2 Green Mark tracker — DM console
- §1.2 Prep mode functional
- §8.2 Condition tooltips — player app (data already in `src/data/rules-glossary.json`)

### Before Session 3 (high value)
- §2.3 Combat portraits on combatant cards
- §5.1 Character roster panel
- §1.3 Multi-session architecture
- §4.1 Music player
- §6.1 Lore reveal — end-to-end wiring
- §3.3 Campaign state / tension clocks
- §8.1 DM rules lookup panel (data already in `src/data/rules-glossary.json`)

### Long campaign (build out over time)
- §5.2 PDF level-up tool
- §4.2 Scene atmosphere panel
- §7.1 NPC quick-reference panel
- §6.2 Asset reveal system
- §10.2 Encounter pre-sets
- §11.2 `gh_shared` cleanup
- §11.1 Migration history baseline
- §8.3 Stat block condition cross-references

### Maintenance (do when convenient)
- §11.3 Orphaned columns in `character_states`
- §11.4 RLS tightening
- §11.5 Performance indexes
- §9.3 Spell slot sync
- Housekeeping (`.DS_Store`, duplicate brief file)
