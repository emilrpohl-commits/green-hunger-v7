# Green Hunger — Hardcoded Content Migration Plan

This document catalogues every piece of hardcoded content in the app and specifies exactly how to migrate each one to the database. The goal is a platform where no campaign content, character data, session structure, or game mechanics require a code change or redeployment to update.

---

## Overview — What's Hardcoded and Why It Matters

| Category | Files | Severity |
|---|---|---|
| Player character roster | `shared/content/playerCharacters.js` | Critical |
| Session structures (3 sessions) | `shared/content/session1-3.js` | Critical |
| Monster stat blocks | `shared/content/statblocks.js` | Critical |
| Lore / reveal cards | `dm/src/stores/revealStore.js` | Critical |
| Session encounter mappings | `dm/src/features/runtime/RightRail.jsx` | Critical |
| Campaign slug & session ID defaults | `runtimeContext.js`, `migrate.js` | High |
| Hostile/buff spell effects for combat | `dm/src/features/combat/cards/constants.js` | Medium |
| Wild magic surge table | `shared/lib/dmToolbox/wildMagicTable.js` | Low |
| Rules catalogs (conditions, damage types, skills, DC tables) | `shared/lib/rules/catalog/` | Low — safe to keep |
| Feature flags | `shared/lib/featureFlags.js` | Fine — env vars |
| Beat type / display constants | `shared/lib/constants.js` | Fine — system design |

**Severity key:**
- **Critical** — Blocks multi-campaign support; content cannot be updated without a code deploy
- **High** — Causes bugs or confusion when campaign changes
- **Medium** — Limits customisation; no bugs but unnecessary rigidity
- **Low** — Works fine hardcoded; migrating is optional quality-of-life

---

## Part 1 — Campaign Slug & Session ID Defaults

### What's hardcoded

**`supabase/migrate.js` line 16:**
```javascript
const CAMPAIGN_SLUG = 'green-hunger'
```

**`shared/lib/runtimeContext.js` line 6:**
```javascript
const DEFAULT_SESSION_RUN_ID = 'session-1'
```

**`dm/src/features/runtime/RightRail.jsx` lines 59–66:**
```javascript
if (sessionRunId === 'session-1') launchEncounter('corrupted-wolf')
if (sessionRunId === 'session-2') launchEncounter('darcy-recombined')
```

### What to do

**`runtimeContext.js`:** Replace the hardcoded default with an environment variable. If the variable is absent, derive the active session from `session_state` table rather than assuming `'session-1'`.

```javascript
// Before
const DEFAULT_SESSION_RUN_ID = 'session-1'

// After
const DEFAULT_SESSION_RUN_ID = import.meta.env.VITE_DEFAULT_SESSION_RUN_ID ?? null
// If null, load from session_state.active_session_uuid on app boot
```

**`RightRail.jsx`:** Remove the hardcoded session-to-encounter mapping entirely. The encounters that belong to a session are already stored in the `encounters` table with a session FK. Query them instead:

```javascript
// Before — hardcoded
if (sessionRunId === 'session-1') launchEncounter('corrupted-wolf')

// After — database-driven
const sessionEncounters = useEncountersForSession(activeSessionId)
// Render launch buttons from sessionEncounters array
```

**`migrate.js`:** Read campaign slug from environment:
```javascript
const CAMPAIGN_SLUG = process.env.CAMPAIGN_SLUG ?? 'green-hunger'
```

---

## Part 2 — Player Character Roster

### What's hardcoded

**`shared/content/playerCharacters.js`** — 542 lines containing four complete character objects: Dorothea, Kanan, Danil, Ilya.

Every field is hardcoded: ability scores, modifiers, saving throws, skills (with pre-computed mods), spell lists, weapons, equipment, magic items, healing actions, buff actions, passive scores, proficiency bonus, spell attack bonus, spell save DC, backstory, senses, languages, character colour.

This file is already marked deprecated but is still imported as a fallback in `dataSlice.js`.

### What's already in the database

The `characters` table already has all the right columns. All four characters already have DB rows. The file only acts as a fallback when the DB returns nothing — but the DB always has rows, so the fallback is never actually needed.

### What to do

This migration is fully specified in `character-sheet-rebuild.md`. In summary:

1. Confirm all four character rows in Supabase `characters` table have complete, correct data for every column
2. Run the DB migration that adds `saving_throw_proficiencies`, `skill_proficiencies`, `spellcasting_ability`, and `ac_config` columns
3. Backfill those new columns from the existing JSONB data (SQL provided in `character-sheet-rebuild.md`)
4. Remove the `import { PLAYER_CHARACTERS }` from `dataSlice.js`
5. Remove the fallback logic that references `PLAYER_CHARACTERS`
6. Mark the file as deleted

**Do not delete the file until step 5 is confirmed working.** The file is the safety net — remove the import first, verify the app loads all four characters from the DB, then delete the file.

---

## Part 3 — Session Structure (session1.js, session2.js, session3.js)

### What's hardcoded

**`shared/content/session1.js`** — 438 lines
**`shared/content/session2.js`** — 394 lines
**`shared/content/session3.js`** — 191 lines

Each file contains a complete exported session object with:
- Session ID, title, session number
- 7–10 scene objects, each with: ID, title, scene type, player description, DM notes, beats array
- Each beat with: title, type, content, DM notes, read-aloud text, mechanical effects
- Stat block references (by slug) for combat beats
- Character names embedded in narration and DM notes
- Hardcoded level-up commands as beat content

These files are referenced in:
- `dataSlice.js` — imported as fallback session data
- `players/src/stores/playerStore/dataSlice.js` — used to populate initial session state
- Any component that calls `getSession('session-1')`

### What's already in the database

The `sessions`, `scenes`, and `beats` tables already exist and have the correct schema. The session import system (markdown import in the DM builder) is designed to populate exactly these tables. The sessions may or may not already be in the DB.

### What to do

**Step 1 — Verify DB state**

Check whether sessions 1, 2, and 3 already exist in the `sessions` table:

```sql
SELECT id, session_number, title FROM sessions ORDER BY session_number;
```

If they exist: proceed to Step 3.
If they don't: proceed to Step 2.

**Step 2 — Import sessions into the database**

Use the existing session import system in the DM builder (Paste & Parse → Session Import) to load each session's content into the database. The session files themselves can be used as the source — convert each JS object to markdown format compatible with the session importer, or write a one-time seed script:

```javascript
// scripts/seed-sessions.mjs
// One-time script — run once, then delete

import { SESSION_1 } from '../shared/content/session1.js'
import { SESSION_2 } from '../shared/content/session2.js'
import { SESSION_3 } from '../shared/content/session3.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SERVICE_ROLE_KEY)

for (const session of [SESSION_1, SESSION_2, SESSION_3]) {
  // Insert session row
  const { data: sessionRow } = await supabase.from('sessions').upsert({
    session_number: session.sessionNumber,
    title: session.title,
    // ... map all fields
  }, { onConflict: 'session_number,adventure_id' }).select().single()

  // Insert scene rows
  for (const scene of session.scenes) {
    const { data: sceneRow } = await supabase.from('scenes').upsert({
      session_id: sessionRow.id,
      title: scene.title,
      scene_type: scene.type,
      // ... map all fields
    }).select().single()

    // Insert beat rows
    for (const [i, beat] of scene.beats.entries()) {
      await supabase.from('beats').upsert({
        scene_id: sceneRow.id,
        order: i,
        title: beat.title,
        type: beat.type,
        content: beat.content,
        dm_notes: beat.dmNotes,
        // ... map all fields
      })
    }
  }
}
```

**Step 3 — Remove the static file imports**

In `dataSlice.js` and `players/src/stores/playerStore/dataSlice.js`, find every import of `session1.js`, `session2.js`, `session3.js` and the fallback logic that uses them. Remove the imports and fallbacks. Sessions must come from the database only.

**Step 4 — Update the session loader to be campaign-aware**

The session loader currently hard-references session slugs. Replace with a query that loads the active session from `session_state`:

```javascript
// Before
import { SESSION_1 } from '@shared/content/session1.js'
const session = SESSION_1

// After
const { data: sessionState } = await supabase
  .from('session_state')
  .select('active_session_uuid')
  .single()

const { data: session } = await supabase
  .from('sessions')
  .select('*, scenes(*, beats(*))')
  .eq('id', sessionState.active_session_uuid)
  .single()
```

**Step 5 — Delete the static files**

Once all three apps load sessions exclusively from the DB:
- Delete `shared/content/session1.js`
- Delete `shared/content/session2.js`
- Delete `shared/content/session3.js`

---

## Part 4 — Monster Stat Blocks

### What's hardcoded

**`shared/content/statblocks.js`** — 210 lines, 5 complete stat blocks:

| Slug | CR | Description |
|---|---|---|
| `corrupted-wolf` | ½ | Pack tactics, Corruption Aura |
| `darcy-recombined` | 4 | Boss — Divided Form, Reformation |
| `rotting-bloom` | 1 | Spore Cloud, False Appearance |
| `damir-woven-grief` | 7 | Spider-human cleric hybrid, legendary |
| `ilya` | 7 | NPC stat block, Talona's Touch |

These are referenced by slug in:
- `session1.js`, `session2.js` — beat stat block references
- `RightRail.jsx` — encounter launch buttons
- `statblocks.js` itself is imported wherever stat blocks need to load as fallback

### What's already in the database

The `stat_blocks` table already exists with the correct schema. These five stat blocks may or may not already have rows.

### What to do

**Step 1 — Verify DB state**

```sql
SELECT slug, name, cr FROM stat_blocks
WHERE slug IN ('corrupted-wolf','darcy-recombined','rotting-bloom','damir-woven-grief','ilya');
```

**Step 2 — Seed any missing stat blocks**

If any of the five are missing from the DB, use the DM builder Stat Block Library to add them manually (paste the stat block text into the import field — the existing parser handles this). Or write a one-time seed script mirroring the session seed script above.

**Step 3 — Remove the static file import**

Find every import of `statblocks.js` and replace with a Supabase query:

```javascript
// Before
import { STAT_BLOCKS } from '@shared/content/statblocks.js'
const statBlock = STAT_BLOCKS.find(s => s.slug === slug)

// After
const { data: statBlock } = await supabase
  .from('stat_blocks')
  .select('*')
  .eq('slug', slug)
  .single()
```

**Step 4 — Delete `shared/content/statblocks.js`**

---

## Part 5 — Lore / Reveal Cards

### What's hardcoded

**`dm/src/stores/revealStore.js`** — the store initialises with 10+ hardcoded lore cards for Sessions 1 and 2:

```javascript
const INITIAL_LORE_CARDS = [
  {
    id: 'lore-weald-1',
    title: 'The Weald of Sharp Teeth',
    content: 'Ancient forest lore...',
    tone: 'ominous',
    category: 'lore'
  },
  {
    id: 'lore-birna-1',
    title: 'Birna Grove',
    content: 'NPC background and secrets...',
    tone: 'npc',
    category: 'npc'
  },
  // ... 8+ more
]
```

These are campaign-specific reveals that appear as cards in the player app when the DM pushes them. They include lore about the Weald, specific NPCs (Birna, Darcy, Damir, Ilya), specific magic items (Brooch of the Last Hearth, Eye of the Hollow Raven, Ring of the Unbroken Thread), the Fracture backstory, the Binding ritual, and the Green Hunger antagonist.

### What's already in the database

The `reveals` table already exists and is used for live session reveals. However it's used for transient reveals (pushed during a session, removed when dismissed) — not for the persistent lore card library.

### What to do

**Step 1 — Create a `lore_cards` table**

```sql
CREATE TABLE lore_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  tone text NOT NULL DEFAULT 'narrative',
    -- 'narrative' | 'ominous' | 'danger' | 'npc' | 'item' | 'lore' | 'location'
  category text NOT NULL DEFAULT 'lore',
  session_number integer,          -- null = available any session
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, slug)
);
```

**Step 2 — Seed existing lore cards**

Write a one-time migration or seed script that inserts all lore cards currently in `revealStore.js` into the `lore_cards` table, linked to the `green-hunger` campaign.

**Step 3 — Update `revealStore.js`**

Replace the hardcoded `INITIAL_LORE_CARDS` constant with a Supabase query:

```javascript
// Before
const INITIAL_LORE_CARDS = [ { id: 'lore-weald-1', ... }, ... ]

// After
loadLoreCards: async (campaignId) => {
  const { data } = await supabase
    .from('lore_cards')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .order('session_number', { ascending: true, nullsFirst: true })
  set({ loreCards: data ?? [] })
}
```

**Step 4 — Add a Lore Cards editor to the DM builder**

The DM should be able to create, edit, and delete lore cards in the builder. Each card needs: title, content (the text shown to players), tone (dropdown), category, and optional session number (so the DM can filter by session).

This editor is a simple list + form — the same pattern as the NPC library.

---

## Part 6 — Combat Spell Effects

### What's hardcoded

**`dm/src/features/combat/cards/constants.js`:**

```javascript
// Hostile spells DM can apply to enemies
const HOSTILE_EFFECTS = [
  { name: 'Bane',         colour: '#8b2020', mechanic: '-1d4 to attack rolls and saving throws', concentration: true },
  { name: 'Hex',          colour: '#6b3a6b', mechanic: 'Disadvantage on chosen ability checks', concentration: true },
  { name: 'Faerie Fire',  colour: '#7b5ea7', mechanic: 'Advantage on attacks against target', concentration: true },
  { name: 'Hold Person',  colour: '#4a7c8e', mechanic: 'Paralyzed — attacks have Advantage, hits are critical', concentration: true },
  { name: 'Guiding Bolt', colour: '#d4a017', mechanic: 'Next attack has Advantage', concentration: false },
  { name: 'Ray of Enfeeblement', colour: '#5a7a5a', mechanic: 'STR-based attacks deal half damage', concentration: true },
  { name: "Hunter's Mark", colour: '#8b4513', mechanic: '+1d6 damage from your attacks', concentration: true },
  { name: 'Silvery Barbs', colour: '#c0c0c0', mechanic: 'Force reroll — attacker takes lower', concentration: false },
  { name: 'Command',      colour: '#8b0000', mechanic: 'One-word command on a failed WIS save', concentration: false },
  { name: 'Charm',        colour: '#ff69b4', mechanic: 'Charmed condition — no attacks against charmer', concentration: false },
]

// Buff spells DM applies to allies
const BUFF_EFFECTS = [
  { name: 'Bless',          colour: '#ffd700', mechanic: '+1d4 to attack rolls and saving throws', concentration: true },
  { name: 'Shield of Faith', colour: '#add8e6', mechanic: '+2 AC', concentration: true },
  { name: 'Guidance',       colour: '#98fb98', mechanic: '+1d4 to ability checks', concentration: true },
]
```

### What to do

These are a UI convenience layer — quick buttons for conditions/effects the DM frequently applies mid-combat. They're not a complete spell database; they're a curated shortlist.

**Option A (recommended) — Keep hardcoded, make it a configurable JSON file**

Move the arrays out of `constants.js` and into a JSON file in `data/`:

```
data/combat-effects.json
```

The JSON file is committed to the repo but edited directly when the DM wants to add a new quick-apply effect. No DB required for this level of customisation — it's a developer config, not user content.

**Option B — Move to database**

Create a `combat_effect_presets` table:

```sql
CREATE TABLE combat_effect_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  effect_type text NOT NULL DEFAULT 'hostile',  -- 'hostile' | 'buff'
  colour text,
  mechanic_description text,
  concentration boolean DEFAULT false,
  is_active boolean DEFAULT true
);
```

The DM builder gets a "Combat Effect Presets" section where they can add/edit/remove entries. Default presets are seeded from the current hardcoded list.

**Recommendation:** Do Option A immediately (1 hour of work, eliminates the constants.js coupling), then do Option B when the builder section is being built.

---

## Part 7 — Wild Magic Surge Table

### What's hardcoded

**`shared/lib/dmToolbox/wildMagicTable.js`** — 50 effects in a d100 table, each with title, description, type (instant/duration/triggered), duration, and tone.

This is the official PHB wild magic table. The DM Toolbox rolls from this table for Sorcerers.

### What to do

**Option A (recommended) — Keep hardcoded, this is correct**

The PHB wild magic table is standard published content. It changes only when a new edition is released. Hardcoding it is appropriate for the same reason that spell damage dice are not stored in the database.

**Option B — Extend to support custom tables**

If the DM wants to use a homebrew wild magic table (or a third-party one from, e.g., Xanathar's), implement the custom random tables system specified in `project-fixes.md` (FIX-F06). The hardcoded PHB table becomes the default entry in that system.

**Recommendation:** Leave as-is until FIX-F06 custom random tables are built. At that point, migrate the wild magic table as the first entry.

---

## Part 8 — Rules Catalogs

### What's hardcoded

```
shared/lib/rules/catalog/
├── classHitDice.js        — 12 classes → hit dice
├── conditions.json        — 15 standard + 1 homebrew condition
├── damageTypes.json       — 13 damage types
├── skillsIndex.json       — 18 skills with ability mappings
└── dcTables.json          — DC difficulty ladder
```

### Assessment: Keep hardcoded

These are all standard D&D 5e rules data. They change only between editions. The 5e SRD database already contains this data, but the performance and simplicity of reading from a local JSON file outweighs the flexibility of a DB query for content that never changes.

**One exception — `conditions.json` contains a homebrew condition:**
```json
{
  "index": "silenced",
  "name": "Silenced",
  "summary": "Homebrew: cannot cast spells with verbal components.",
  "srd": false,
  "homebrew": true
}
```

This should not live in a shared rules catalog — it's campaign-specific content. Move it to the `homebrew_overlays` table which already exists for this purpose.

**Action for the homebrew condition:**

```sql
-- Move 'Silenced' out of conditions.json and into homebrew_overlays
INSERT INTO homebrew_overlays (campaign_id, overlay_type, target_index, override_data)
VALUES (
  (SELECT id FROM campaigns WHERE slug = 'green-hunger'),
  'condition',
  'silenced',
  '{"name": "Silenced", "summary": "Cannot cast spells with verbal components.", "colour": "#7090b0"}'::jsonb
);
```

Then remove `silenced` from `conditions.json` and ensure the condition catalog loader merges homebrew_overlays at runtime (this logic likely already exists given the homebrew overlay system is already built).

---

## Migration Execution Plan

### Phase 1 — Quick wins (1–2 days each, no UI work)

| Task | File to change | DB work needed |
|---|---|---|
| Remove campaign slug hardcode | `migrate.js` | None |
| Remove session ID default | `runtimeContext.js` | None |
| Move combat effects to JSON config | `constants.js` → `data/combat-effects.json` | None |
| Move homebrew Silenced condition | `conditions.json` → `homebrew_overlays` | One INSERT |
| Env var for default session | `runtimeContext.js` | None |

### Phase 2 — Data migration (verify DB, remove fallbacks)

| Task | Depends on | DB work |
|---|---|---|
| Verify all 4 characters in DB | Phase 1 | Spot-check query |
| Remove `playerCharacters.js` import | Character verification | None (data is already there) |
| Verify sessions 1-3 in DB | Phase 1 | Spot-check query |
| Remove `session1-3.js` imports | Session verification | None |
| Verify stat blocks in DB | Phase 1 | Spot-check query |
| Remove `statblocks.js` import | Stat block verification | None |
| Delete deprecated files | All above | None |

### Phase 3 — New DB table + UI (3–5 days)

| Task | New table | UI component |
|---|---|---|
| Lore cards migration | `lore_cards` | Lore Card editor in DM builder |
| Remove `revealStore.js` hardcoded cards | — | `revealStore.loadLoreCards()` |
| Session encounter mapping | None needed (already in `encounters` table) | Update `RightRail.jsx` to query |

### Phase 4 — Optional (when building related features)

| Task | Note |
|---|---|
| Combat effect presets in DB | When building combat effects builder section |
| Wild magic table in DB | When building custom random tables (FIX-F06) |

---

## Rules for Cursor

### General rules
- Every piece of campaign content (characters, sessions, scenes, beats, stat blocks, lore cards) must come from the database. No static files as data sources for live content.
- Static JSON files in `shared/lib/rules/catalog/` are fine to keep — they are SRD rules, not campaign content.
- Never read from `playerCharacters.js`, `session1.js`, `session2.js`, `session3.js`, or `statblocks.js` as a data source. If you find an import of these files in any store or component, remove it.
- The deletion order matters: remove the import first, verify the app still works, then delete the file. Never delete first.

### Migration script rules
- Migration scripts that seed data go in `scripts/` and are named `seed-[content].mjs`
- They use the service role key (not the anon key) — add `SERVICE_ROLE_KEY` to `.env.local` for local runs
- Every seed script must be idempotent — running it twice must not create duplicates. Use upsert with conflict resolution.
- Delete seed scripts after they have been run and the data is confirmed in the database

### Fallback rules
- Do not replace hardcoded fallbacks with other hardcoded fallbacks
- If the database returns no rows where rows are expected, surface a clear error message — do not fall back to static data
- The only acceptable fallback is an empty state (empty array, null), not hardcoded content

### Verification checklist before deleting any file
- [ ] The file is no longer imported anywhere (run a grep for the filename)
- [ ] The app loads without errors in `npm run dev`
- [ ] All data that was in the file is confirmed present in the database
- [ ] The relevant store/slice loads that data from Supabase correctly
- [ ] The relevant UI components display the data correctly

---

## What the App Looks Like After This Migration

- **No campaign content in the codebase.** Adding a new session, changing a character's backstory, or creating a new lore card is done in the DM builder, not by editing a JavaScript file.
- **A new campaign can be started** by creating a new campaign row in Supabase, creating characters, and building sessions — without touching code.
- **The codebase deploys once.** All content changes are data changes. The DM builder is the CMS.

---

*Written: April 2026. Based on full audit of shared/content/, dm/src/stores/revealStore.js, dm/src/features/runtime/RightRail.jsx, shared/lib/runtimeContext.js, and supabase/migrate.js.*
