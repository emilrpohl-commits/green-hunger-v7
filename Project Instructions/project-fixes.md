# Green Hunger — Fix List for Cursor

This document contains every identified fix across the full platform, sourced from three audits:
1. **Platform-wide security & code quality audit** (both apps)
2. **Post-update verification audit** (confirming what was and wasn't addressed)
3. **Builder section deep audit** (DM app builder features)

Fixes are grouped by area and ordered by priority within each group. Each fix includes the exact file(s) to change and what to do. Do not skip to lower-priority fixes before completing higher ones in the same group.

---

## Group 1 — Security (Remaining Gaps)

These were identified as remaining open after the last update pass.

---

### FIX-S01 — Supabase dev fallback keys still in source

**Priority:** High  
**File:** `shared/lib/supabase.js`

The `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are now correctly read from environment variables, but hardcoded fallback values remain in the source for local dev. While publishable keys are low-risk individually, their presence in source is compounded by the open RLS policies still on some tables.

**What to do:**
- Remove the hardcoded fallback string values entirely
- If a dev fallback is genuinely needed, move it to a committed `.env.development` file with a comment explaining it is safe for local use only
- Add a startup warning if `VITE_SUPABASE_URL` is not set: `console.warn('[Supabase] No URL configured — check your .env.local')`

---

### FIX-S02 — RLS still permissive on characters and character_spells tables

**Priority:** High  
**File:** New migration in `supabase/migrations/`

The runtime tables (session_state, combat_state, character_states, combat_feed) now have proper RLS. However `characters` and `character_spells` still use `USING (true)` — any authenticated client can read all character data across all campaigns.

**What to do:**
- Create a new migration file: `supabase/migrations/[timestamp]_rls_characters_campaign_scope.sql`
- Scope SELECT on `characters` to the active campaign:
  ```sql
  DROP POLICY IF EXISTS allow_all_characters ON characters;
  CREATE POLICY "read_own_campaign_characters"
  ON characters FOR SELECT
  USING (
    campaign_id = (SELECT campaign_id FROM session_state LIMIT 1)
  );
  ```
- Apply equivalent scoping to `character_spells` via the character FK
- Do not touch existing migration files — append only

---

### FIX-S03 — No XSS sanitisation on beat content rendered in player app

**Priority:** Medium  
**Files:** `players/src/components/SceneDisplay.jsx`, any component rendering `beat.content`

Beat read-aloud text entered in the builder is rendered in the player app. React's default text escaping helps, but there is no explicit sanitisation guard. If a beat ever renders as HTML (e.g. a future rich-text upgrade), pasted content becomes an injection vector.

**What to do:**
- Add `DOMPurify` as a dependency in `players/`: `npm install dompurify`
- Wrap any place that renders beat content with `DOMPurify.sanitize()` before display
- Apply the same guard in the DM runtime view

---

### FIX-S04 — Imported stat blocks not validated before DB write

**Priority:** Medium  
**File:** `dm/src/features/statblocks/ImportModal.jsx` (approximately lines 300–330)

When a DM pastes raw stat block text, the result of `parseStatBlock()` is passed directly to `saveStatBlock()` with no schema validation. A malformed or crafted paste could write unexpected shapes to the `stat_blocks` table.

**What to do:**
- Create a Zod schema `statBlockImportSchema` in `shared/lib/validation/` covering all required fields with appropriate types and ranges (e.g. CR between 0–30, HP > 0, ability scores 1–30)
- Call `statBlockImportSchema.safeParse(parsed)` after `parseStatBlock()` and before `saveStatBlock()`
- If validation fails, surface the specific field errors to the DM in the import UI — do not silently discard

---

### FIX-S05 — Scene/beat slug uniqueness not enforced at DB level

**Priority:** Medium  
**File:** New migration in `supabase/migrations/`

Slugs are indexed but not unique-constrained. Two beats in the same scene can share a slug, making branch targeting by slug ambiguous.

**What to do:**
- Create migration: `[timestamp]_unique_slug_constraints.sql`
- Add: `ALTER TABLE beats ADD CONSTRAINT beats_scene_slug_unique UNIQUE (scene_id, slug);`
- Add: `ALTER TABLE scenes ADD CONSTRAINT scenes_session_slug_unique UNIQUE (session_id, slug);`
- Before adding constraints, run a de-duplication query to find and resolve existing conflicts:
  ```sql
  SELECT scene_id, slug, COUNT(*) FROM beats GROUP BY scene_id, slug HAVING COUNT(*) > 1;
  ```

---

## Group 2 — Builder: Data Loss Risks

These are the most impactful day-to-day pain points for a DM actively building a campaign.

---

### FIX-B01 — No autosave in any builder editor

**Priority:** High  
**Files:** `dm/src/features/sessions/SessionEditor.jsx`, `dm/src/features/builder/SceneEditor.jsx`, `dm/src/features/npcs/NpcLibrary.jsx`, `dm/src/features/statblocks/StatBlockEditor.jsx`

Every editor requires a manual Save click. A browser crash or accidental tab close loses all unsaved work.

**What to do:**
- Add a debounced autosave hook to each editor. The pattern is the same across all:
  ```javascript
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [form])
  ```
- Track `isDirty` state — set to `true` on any field change, `false` after a successful save
- Show a subtle "Saving…" / "Saved" indicator in the editor header (not a modal or toast)
- Do not autosave if the form has validation errors

---

### FIX-B02 — Cascading deletes show no scope warning

**Priority:** High  
**Files:** `dm/src/features/sessions/SessionsList.jsx` or wherever `deleteScene()` / `deleteSession()` is called from

Deleting a scene silently removes all its beats and branches via `ON DELETE CASCADE`. The DM has no indication of the scope of destruction before confirming.

**What to do:**
- Before calling any delete action, fetch the count of dependent records:
  ```javascript
  const beatCount = scene.beats?.length ?? 0
  const branchCount = scene.branches?.length ?? 0
  ```
- Show a confirmation modal with the exact scope:
  - "Delete Scene + 8 beats + 3 branches? This cannot be undone."
- Apply the same pattern for session deletion: show scene count
- Do not proceed without explicit confirmation

---

### FIX-B03 — Archived content has no restore UI

**Priority:** Medium  
**Files:** `dm/src/features/sessions/SessionsList.jsx`, `dm/src/features/statblocks/StatBlockLibrary.jsx`

`restoreSession()` and `restoreStatBlock()` exist in the store but are never surfaced in the UI. DMs who archive something think it is gone.

**What to do:**
- Add an "Archived" toggle/tab in SessionsList and StatBlockLibrary
- When viewing archived items, show a "Restore" button next to each row
- Call the existing `restoreSession()` / `restoreStatBlock()` store actions on click
- Show a confirmation: "Restore this session? It will reappear in the active list."

---

### FIX-B04 — Beat reorder makes N separate DB updates

**Priority:** Medium  
**File:** `dm/src/stores/campaignStore/contentCrudSlice.js` (approximately lines 50–55)

`reorderBeats()` issues one UPDATE per beat. A network interruption mid-reorder leaves beats in an inconsistent order with no recovery path.

**What to do:**
- Create a Supabase RPC function `reorder_beats(beat_updates jsonb)` that accepts an array of `{id, order}` and updates all rows in a single transaction
- Call this RPC from `reorderBeats()` instead of looping individual updates
- On failure, revert the local Zustand state to the pre-reorder order

---

### FIX-B05 — Import rollback can fail silently

**Priority:** Medium  
**File:** `dm/src/features/builder/SessionImportModal.jsx` (approximately lines 300–340)

`runLegacyImportWithRollback()` calls `rollbackSessionById()` in a catch block, but if the rollback itself fails (network error), the error is swallowed and a partial session remains in the database with no user feedback.

**What to do:**
- Wrap the rollback in its own try/catch with a distinct error message:
  ```javascript
  try {
    await rollbackSessionById(sessionId)
  } catch (rollbackErr) {
    setStatus('Import failed and rollback also failed. Session may be partially imported. Please check the Sessions list and delete any incomplete sessions manually.')
    return
  }
  ```
- After rollback, verify the session is gone with a SELECT before reporting success
- Surface both failure states clearly to the DM in the import UI

---

### FIX-B06 — No version history on builder content

**Priority:** Medium  
**File:** New migration + `dm/src/stores/campaignStore/contentCrudSlice.js`

All save operations overwrite previous values. There is no way to recover accidentally deleted or overwritten beat content, scene descriptions, or NPC details.

**What to do:**
- Create migration: `[timestamp]_audit_log.sql`
  ```sql
  CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,  -- 'beat', 'scene', 'session', 'npc', 'stat_block'
    entity_id uuid NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_at timestamptz DEFAULT now()
  );
  ```
- Before each UPDATE in `contentCrudSlice.js`, INSERT the current row into `audit_log`
- Add a "View history" option on scene/beat editors showing the last 5 versions with a restore button
- Do not store audit logs for trivial fields like `updated_at` or `order`

---

## Group 3 — Builder: Import System

---

### FIX-I01 — Markdown parser is untested and fragile

**Priority:** High  
**File:** `shared/lib/parseSessionMarkdown.js` (994 lines)

This is the highest-risk untested file in the codebase. It uses regex-based beat type detection and is sensitive to minor formatting variations. A malformed import can silently miscategorise beats or fail to extract stat blocks.

**What to do:**
- Create `shared/lib/parseSessionMarkdown.test.js`
- Write test cases for:
  - Well-formed session (verify all scenes, beats, branches extracted correctly)
  - Missing scene heading (verify graceful degradation, not a crash)
  - Beat type detection edge cases (ambiguous headings)
  - Stat block extraction (verify CR, HP, AC, actions are captured)
  - Word-to-number conversion ("Session Three" → 3)
  - Flat Word table parsing
- Add error line numbers to parse failure messages so DMs know where the problem is

---

### FIX-I02 — Import payload has no schema validation

**Priority:** Medium  
**File:** `dm/src/features/builder/SessionImportModal.jsx` (approximately lines 160–210)

`buildImportPayload()` constructs the import object manually with no Zod validation before the RPC call. Missing fields cause DB errors mid-import rather than clear pre-flight failures.

**What to do:**
- Create `shared/lib/validation/importPayloadSchema.js` with a Zod schema covering all required fields for scenes, beats, branches, and stat block references
- Call `importPayloadSchema.safeParse(payload)` in `SessionImportModal` before calling the RPC
- If validation fails, show a structured list of errors by field: "Scene 2: missing `scene_type`"
- Do not proceed to the RPC if validation fails

---

### FIX-I03 — Stat block parser misses multi-speed and AC note formats

**Priority:** Low  
**File:** `shared/lib/parseStatBlock.js`

The AC regex only captures the first number (`/AC\s+(\d+)/i`), missing AC notes like "16 (natural armour)". Speed parsing expects "X ft." and misses "burrow 30 ft., swim 40 ft." variants.

**What to do:**
- Update the AC regex to capture the full AC expression: `/AC\s+(\d+(?:\s*\([^)]+\))?)/i`
- Update speed parsing to split on commas and handle all movement type prefixes (walk, fly, swim, burrow, climb)
- Add test cases in a `parseStatBlock.test.js` file for each variant

---

## Group 4 — Builder: Performance

---

### FIX-P01 — No upper bound on stat block loading

**Priority:** Medium  
**File:** `dm/src/stores/campaignStore/dataSlice.js` (approximately lines 48–80)

`fetchStatBlocksForCampaignPaged()` loops with no max page count. A campaign with thousands of creatures will eventually cause a timeout or client memory overflow.

**What to do:**
- Add a `MAX_PAGES = 50` constant (i.e. max 5,000 stat blocks)
- Break the fetch loop if `page >= MAX_PAGES` and set a store warning: `statBlockLimitReached: true`
- Show a banner in the Stat Block Library if the limit is reached: "Showing the first 5,000 creatures. Archive unused stat blocks to see more."

---

### FIX-P02 — Scene editor re-renders all beats on any change

**Priority:** Medium  
**File:** `dm/src/features/builder/SceneEditor.jsx` (approximately lines 400+)

All beats are rendered in a flat list with no memoisation. Scenes with 50+ beats cause noticeable UI lag on every keystroke in any beat field.

**What to do:**
- Wrap `BeatRow` in `React.memo()` with a comparison on `beat.id` and `beat.updatedAt`
- Only re-render the beat that changed
- For scenes with more than 50 beats, implement windowed rendering using `react-window` (`FixedSizeList`)

---

### FIX-P03 — Spell library search is unoptimised

**Priority:** Low  
**File:** `dm/src/features/spells/SpellLibrary.jsx`

Client-side array filtering on every keystroke with no debounce. Campaigns with 500+ spells will feel sluggish.

**What to do:**
- Add a 300ms debounce to the search input before filtering
- For the spell compendium (SRD spells), move filtering to a Supabase query with `ilike` so only matching rows are fetched

---

## Group 5 — Builder: Code Quality

---

### FIX-Q01 — SessionImportModal is too large and tightly coupled

**Priority:** Medium  
**File:** `dm/src/features/builder/SessionImportModal.jsx` (750+ lines)

Parsing, preview, and import phases are all in one component. This makes it hard to test, maintain, or extend any single phase.

**What to do:**
Split into three focused files:
- `SessionImportParser.jsx` — handles file/text input and calls `parseSessionMarkdown()`; owns the `parsing` and `preview` states
- `SessionImportPreview.jsx` — renders the parsed structure for DM review before commit
- `SessionImportExecutor.jsx` — handles the actual RPC call, progress tracking, and success/error states
- Keep the parent `SessionImportModal.jsx` as a thin shell that sequences these phases

---

### FIX-Q02 — BranchEditor should be its own component

**Priority:** Low  
**File:** `dm/src/features/builder/SceneEditor.jsx` (561 lines)

The scene editor handles scene details, beats, AND branches across three tabs. Extracting the branch tab into its own component reduces the file to a manageable size and makes branch logic independently testable.

**What to do:**
- Extract the Branches tab content into `dm/src/features/builder/BranchEditor.jsx`
- Pass `scene.branches`, `saveScene`, and `allScenes` (for target scene linking) as props
- No logic changes — purely a structural extraction

---

### FIX-Q03 — Race condition on rapid save clicks

**Priority:** Medium  
**Files:** `dm/src/stores/campaignStore/contentCrudSlice.js`

`saveScene()`, `saveBeat()`, and similar actions have no request deduplication. Rapid save clicks can result in an older save response overwriting a newer one.

**What to do:**
- Use an `AbortController` per save operation:
  ```javascript
  const controller = new AbortController()
  // cancel previous in-flight save
  previousController?.abort()
  previousSaveController = controller
  ```
- Alternatively, debounce the save action at 500ms so rapid clicks collapse into one request
- Prefer the debounce approach as it pairs naturally with FIX-B01 autosave

---

### FIX-Q04 — No per-entity loading or error state

**Priority:** Low  
**File:** `dm/src/stores/campaignStore/dataSlice.js`

There is a single global `loading` flag. When one entity is saving, the entire UI shows as loading. There is also a single `error` field that gets overwritten by the next operation.

**What to do:**
- Replace the global `loading` / `error` with a map keyed by entity type + ID:
  ```javascript
  loadingStates: {},  // { 'scene:uuid': true }
  errorStates: {},    // { 'scene:uuid': 'Save failed' }
  ```
- Update all CRUD actions to set/clear their specific key
- Components subscribe only to their entity's loading/error state

---

## Group 6 — Missing D&D Features (Roadmap)

These are feature gaps identified against what a full D&D campaign tool would offer. They are not bugs — add them when the core fixes above are complete.

---

### FIX-F01 — No XP / levelling system

**What to build:**
- `character_experience` table: `(character_id, session_id, xp_awarded, source, awarded_at)`
- Auto-calculate XP from completed encounters (encounter CR × count × party size multiplier)
- Display cumulative XP and next level threshold in the character editor
- Toggle: XP-based vs. milestone levelling per campaign

---

### FIX-F02 — No NPC relationship graph

**What to build:**
- `npc_relationships` table: `(id, npc_id_a, npc_id_b, relationship_type, strength, notes)`
- Relationship types: ally, enemy, owes_favour, family, rival, worships
- Visual faction matrix in the NPC Library (grid of NPCs vs. factions with relationship indicators)
- Filter NPCs by faction or relationship type

---

### FIX-F03 — No loot tables or treasure tracking

**What to build:**
- `items` table: `(id, campaign_id, name, rarity, value_gp, description, magical)`
- `loot_tables` table: `(id, campaign_id, name, cr_range, results JSONB)`
- Loot table generator in the encounter editor (auto-suggest based on enemy CR)
- Item distribution tracker: which PC has which item

---

### FIX-F04 — No campaign calendar / timeline

**What to build:**
- `campaign_dates` table: `(id, session_id, in_game_date, season, weather_note)`
- Timeline view in the builder: sessions plotted on an in-game calendar
- Season/weather auto-suggestion based on date
- "Days since session 1" counter

---

### FIX-F05 — No session recap generation

**What to build:**
- Auto-generate a bullet-point recap from the session's beat sequence:
  - Narrative beats → story summary points
  - Combat beats → "Party fought X"
  - Decision beats → "Party chose to…"
- Editable output — DM refines the auto-generated draft
- Export as plain text or copy-to-clipboard for Discord/session notes

---

### FIX-F06 — No custom random tables

**What to build:**
- `random_tables` table: `(id, campaign_id, name, die_size, results JSONB)`
- Table builder UI in the DM Toolbox — add/edit/remove entries
- Roll button: picks a weighted random result and logs it to the session
- Pre-seed with common tables: NPC names, weather, trinkets, wild encounters

---

### FIX-F07 — No full-text search across campaign content

**What to build:**
- Add `tsvector` columns to `beats`, `scenes`, `npcs`, `stat_blocks` via migration
- Postgres `to_tsvector('english', content || ' ' || dm_notes)` updated via trigger
- Global search bar in the builder header (searches all entity types)
- Results grouped by type with context excerpt and direct link to edit

---

### FIX-F08 — No handout builder

**What to build:**
- `handouts` table: `(id, beat_id, title, template_type, content_html, distributed_to JSONB)`
- Template types: letter, journal entry, notice, map annotation, item card
- Simple rich-text editor for handout content (no markdown — DMs need formatting)
- "Push to players" button: creates a reveal in the player app with the handout content

---

### FIX-F09 — No encounter phase scripting

**What to build:**
- `encounter_phases` table: `(id, encounter_id, phase_number, trigger_condition, trigger_round, description, event_type)`
- Phase editor in the encounter builder: "At round 3, reinforcements arrive (2× Goblin)"
- DM runtime shows phase countdown and alerts when a phase trigger is reached
- Event types: reinforcements, lair action, terrain change, NPC enters

---

### FIX-F10 — No faction reputation system

**What to build:**
- `factions` table: `(id, campaign_id, name, description, goals, beliefs)`
- `character_faction_reputation` table: `(character_id, faction_id, reputation_score, notes)`
- Reputation ranges: Hostile / Unfriendly / Neutral / Friendly / Exalted
- DM can adjust reputation from the NPC or session editor
- Reputation changes logged to session timeline

---

## Quick Reference — Fix Priority Order

### Do immediately
- FIX-B01 — Autosave in all editors
- FIX-B02 — Cascade delete scope warnings
- FIX-I01 — Tests for parseSessionMarkdown
- FIX-S02 — Tighten RLS on characters table

### Do next
- FIX-B03 — Restore UI for archived content
- FIX-B04 — Batch beat reorder into single RPC
- FIX-B05 — Rollback failure handling in import
- FIX-S04 — Zod validation on imported stat blocks
- FIX-S05 — Unique slug constraints via migration
- FIX-Q01 — Split SessionImportModal
- FIX-Q03 — Race condition on saves
- FIX-I02 — Zod validation on import payload

### When time allows
- FIX-B06 — Version history / audit log
- FIX-P01 — Stat block load upper bound
- FIX-P02 — Beat list memoisation
- FIX-Q02 — Extract BranchEditor
- FIX-Q04 — Per-entity loading/error state
- FIX-S01 — Remove hardcoded Supabase fallbacks
- FIX-S03 — DOMPurify on beat content

### Roadmap (new features)
- FIX-F01 through FIX-F10 — in any order, after all fixes above are complete

---

## Rules for Cursor When Working on These Fixes

- Complete fixes in the priority order listed in each group — do not start a lower group while higher-priority items are open
- Each fix is self-contained — do not refactor surrounding code unless it directly blocks the fix
- Always create new migrations — never edit existing files in `supabase/migrations/`
- Run `npm test` in the affected app before marking a fix complete
- If a fix requires a Supabase RPC function, create it as a migration, not as a one-off script
- For any fix that touches the shared library, verify both `dm/` and `players/` still build after the change

---

*Compiled: April 2026. Based on full platform audit and builder deep-audit.*
