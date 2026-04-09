# Green Hunger — Master Build Brief
## Session Outliner, DOCX Import & Run-Mode Refactor

---

## Overview

This is a three-part build delivered as a single job:

**Part 0 — Data reset & run-mode refactor** removes the hardcoded session data from the bundle, deletes the existing partial session data from Supabase, and makes the run-mode store load sessions entirely from Supabase. This must be completed before Parts 1 and 2.

**Part 1 — Session Outliner** replaces the current drill-down session editor (Sessions → Session → Scene → Beats tab → Beat form) with a single-pane, always-visible outliner where every scene and beat is visible at once and editable inline.

**Part 2 — DOCX Import Tool** adds an import modal that accepts a DM session document (`.docx`), parses it using `mammoth.js`, previews the detected structure, and writes to Supabase using existing store actions. The outliner is the primary interface for reviewing and correcting imported content.

---

# Part 0 — Data Reset & Run-Mode Refactor

This must be done first. Do not start Parts 1 or 2 until Part 0 is complete and verified.

## 0a. Delete existing Supabase session data

Delete all existing session content from Supabase. Beats and scenes will cascade-delete when their parent session is deleted.

```sql
DELETE FROM sessions;
```

Verify after deletion:
```sql
SELECT COUNT(*) FROM sessions;  -- expect 0
SELECT COUNT(*) FROM scenes;    -- expect 0
SELECT COUNT(*) FROM beats;     -- expect 0
SELECT COUNT(*) FROM scene_branches; -- expect 0
```

Do not delete `stat_blocks`, `characters`, `character_states`, `campaign_state`, `music_tracks`, or any other table — only the session hierarchy.

## 0b. Remove hardcoded session constants from the run-mode store

In the run-mode store (Zustand store `M`), the following hardcoded constants currently initialise the sessions array:

- `ql` — hardcoded Session 1 object (id: `"session-1"`, title: "Session One")
- `If` — hardcoded Session 2 object (id: `"session-2"`, title: "Session Two")
- `Pf` — hardcoded Session 3 object (id: `"session-3"`, title: "Session Three")
- `Rd = [ql, If, Pf]` — the array passed as initial state

Remove all of these. The initial state for `sessions` should be an empty array `[]`, and `session` (the active session) should be `null`.

## 0c. Refactor `syncContentFromDb` to be the single source of truth

Currently `syncContentFromDb` overlays Supabase data on top of the hardcoded array by matching session number. After removing the hardcoded sessions, rewrite it to simply **replace** the sessions array with Supabase data:

```js
syncContentFromDb: (supabaseSessions) => {
  if (!supabaseSessions || supabaseSessions.length === 0) return;
  const mapped = supabaseSessions.map(normaliseSession).sort(
    (a, b) => (a.session_number || a.order || 0) - (b.session_number || b.order || 0)
  );
  set({ sessions: mapped, session: mapped[0] ?? null });
},
```

Where `normaliseSession` is the existing `n` function that maps database field names to the camelCase names the run-mode panel expects (`dm_notes` → `dmNote`, `stat_block_id` → `statBlockId`, etc.).

## 0d. Handle empty state gracefully in run mode

The run-mode panel (`Bb`) currently assumes a session and scene are always available. After this refactor, both may be null. Add a null guard:

```js
// In Bb component, replace the early return:
if (!session || !o || !l) {
  return (
    <div style={{ gridArea: 'main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      No session loaded. Import a session in the Builder.
    </div>
  );
}
```

## 0e. Verify before proceeding

After Part 0, confirm:
- [ ] `sessions` table in Supabase has 0 rows
- [ ] The DM console loads without errors
- [ ] Run mode shows "No session loaded" message
- [ ] Builder mode shows an empty sessions list with `[+ Session]` and `[Import DOCX]` buttons

---

# Part 1 — Session Outliner

## Pre-read: what exists now

The current builder is a 200px left sidebar + main content pane mounted at `l === "build"` in the root `zx` component. The nav state is a simple object `{ type, id }` stored in local state (`n`/`setNav`). Navigation currently works like a router:

- `null` → Sessions list (`Dx`)
- `{ type: "session", id }` → Session editor (`Sx`) — replaces main pane
- `{ type: "scene", id, sessionId }` → Scene editor (`Cx`) — replaces main pane again
- Inside `Cx`: tabs for Scene / Beats / Branches. Beat editing replaces the beats list.

**Components to replace:** `Dx`, `Sx`, `Cx`, `jx` (beat editor), `Rx` (branch editor). These are all in the builder view only — they do not affect run mode.

**Store actions to keep using exactly as-is:**
```js
saveSession(obj)     // INSERT if no id, UPDATE if id present
saveScene(obj)       // strips beats/branches before saving — do not pass beats or branches in obj
saveBeat(obj)        // INSERT or UPDATE
saveBranch(obj)      // INSERT or UPDATE into scene_branches
saveStatBlock(obj)   // requires campaign.id from store state — already resolved
deleteSession(id)
deleteScene(id)
deleteBeat(id)
deleteBranch(id)
reorderBeats(sceneId, orderedIdArray)
createSession(title) // requires adventureId from store state — already resolved
refreshSession(id)
```

**Enums to use:**
```js
// Scene types (kx):
["narrative", "combat", "exploration", "social", "puzzle", "transition"]

// Beat types (_x):
["narrative", "prompt", "check", "decision", "combat", "reveal", "transition"]

// Branch condition types (Tx):
["explicit", "implicit", "conditional"]
```

## Layout

Replace the builder main pane with an outliner. The 200px left sidebar nav (with Sessions, Stat Blocks, Spells, NPCs tabs) stays exactly as-is. Only the main content area changes.

```
┌─────────────────────────────────────────────────────────────┐
│ THE GREEN HUNGER · Builder    [← Back to Run]               │ topbar
├──────────────┬──────────────────────────────────────────────┤
│ Sessions     │  Sessions                [+ Session] [Import] │
│ Stat Blocks  │ ─────────────────────────────────────────     │
│ Spells       │  ▶ SESSION 1 · The Weald Awakens              │
│ NPCs         │  ▼ SESSION 2 · Into the Heart      [Edit] [⋯] │
│              │    ─────────────────────────────────────────  │
│              │    ▼ Scene 1 — Darcy, The Clearing  [+Beat]   │
│              │      [narrative] Opening Narrative      [▾]   │
│              │      [prompt]   The Persuasion Window   [▾]   │
│              │      [decision] If Persuasion Succeeds  [▾]   │
│              │      [combat]   Darcy Recombined    ⚔  [▾]   │
│              │                                               │
│              │    ▼ Scene 2 — Into the Forest      [+Beat]   │
│              │      [narrative] Birna's Send-Off    [▾]      │
│              │      [prompt]   Raven Appears        [▾]      │
│              │      ...                                      │
│              │                                               │
│              │    ── Scene 4 → Scene 5a  [Left Path]  ──→    │
│              │            └──→ Scene 5b  [Right Path] ──→    │
│              │                                               │
│              │    [+ Add Scene]                              │
└──────────────┴──────────────────────────────────────────────┘
```

## Session-level row

Each session renders as a collapsible row. Collapsed by default. Click row to expand.

```
▼ SESSION 2 · Into the Heart                        [Edit] [Delete] [⋯]
```

- Session number + title in display font (`var(--font-display)`)
- `[Edit]` opens a small **inline metadata panel** directly below the session row — not a new page
- `[Delete]` triggers `window.confirm` then `deleteSession(id)`
- `[⋯]` opens a small popover with: "Import from DOCX" (triggers import modal for this session slot)

## Session metadata panel (inline)

Expands directly below the session header row. 2-column grid layout:

| Field | Input | Column |
|---|---|---|
| Title | text input | full width |
| Subtitle | text input | left |
| Estimated Duration | text input | right |
| Recap | textarea 3 rows | full width |
| Objectives | textarea, one per line | full width |
| Contingency Notes | textarea 2 rows | full width |
| Post-Session Notes | textarea 2 rows | full width |
| Notes (DM background) | textarea 3 rows | full width |

Save/Cancel buttons at the bottom.

## Scene rows

Each scene appears as an indented row inside its parent session:

```
▼ Scene 1 — Darcy, The Clearing     [narrative]  20–30 min    [Edit] [+ Beat] [Delete]
```

- Scene number + title
- `[scene_type]` badge using existing type colours
- Estimated time (dim, monospace)
- `[Edit]` expands an **inline scene metadata panel**
- `[+ Beat]` immediately appends a new empty beat row in edit mode
- `[Delete]` triggers confirm then `deleteScene(id)`
- ▲▼ buttons for reordering scenes within a session

## Scene metadata panel (inline)

Expands below the scene header row:

| Field | Input |
|---|---|
| Title | text input |
| Subtitle | text input |
| Scene Type | select (`kx` enum) |
| Estimated Time | text input |
| Slug | text input |
| Purpose (DM only) | textarea 2 rows |
| Summary (DM only) | textarea 2 rows |
| Player Description | textarea 3 rows (amber italic: `color: #d4a080; font-style: italic`) |
| DM Notes | textarea 3 rows |
| Entry Conditions | textarea 2 rows |
| Environment | textarea 2 rows |
| Fallback Notes | textarea 2 rows |
| Fail-Forward Notes | textarea 2 rows |
| Outcomes | outcome table editor (see below) |
| Published to Players | checkbox |

**Outcome table editor:** render `scenes.outcomes` (JSONB array) as an inline table with "Outcome" and "Consequence" columns. Each row has two text inputs and a delete `[×]` button. `[+ Add Outcome]` appends a blank row. Saves as:
```json
[{ "outcome": "Darcy Persuaded", "consequence": "Talona retains foothold..." }]
```

## Beat rows

Each beat renders as a compact indented row inside its parent scene:

```
  [narrative]  Opening Narrative                              [▾ expand] [▲] [▼] [Delete]
  [prompt]     The Persuasion Window                          [▾ expand] [▲] [▼] [Delete]
  [combat]     Darcy Recombined  ⚔                           [▾ expand] [▲] [▼] [Delete]
  [check]      Reading the Forest  🎲                         [▾ expand] [▲] [▼] [Delete]
```

- Type badge coloured using the existing `Id`/`Rb` colour map already in the bundle
- Beat title
- `⚔` icon if `stat_block_id` is set
- `🎲` icon if `mechanical_effect` is non-empty
- `[▾]` expands the beat inline
- `[▲]` `[▼]` reorder via `reorderBeats(sceneId, newOrderArray)`
- `[Delete]` triggers confirm then `deleteBeat(id)`

## Beat expand panel (inline)

Click `[▾]` on any beat to expand it in place below the row. Other beats remain visible above and below. Only one beat expanded at a time.

### All beat fields

| Field | Input | Shown for |
|---|---|---|
| Title | text input | all |
| Type | select (`_x` enum) | all |
| Trigger Text | textarea 1 row | all |
| Content (read-aloud, amber italic) | textarea 4 rows | narrative, prompt, reveal, decision |
| Player-Facing Text | textarea 2 rows | narrative, prompt |
| DM Notes | textarea 3 rows | all |
| Mechanical Effect | skill check table editor (see below) | check, prompt |
| Mechanical Effect | plain textarea | decision, transition |
| Stat Block | dropdown of `statBlocks` from store | combat |
| Asset IDs | tag list | reveal |

### Skill check table editor

For beats of type `check` and `prompt`, replace the plain `mechanical_effect` textarea with a structured table editor.

Render `beats.mechanical_effect` parsed as a JSONB array:

```
┌──────────────────────────────┬──────────────────┬────┬──────────────────────────────┐
│ Trigger                      │ Skill / Save     │ DC │ What They Learn              │
├──────────────────────────────┼──────────────────┼────┼──────────────────────────────┤
│ Examine the spiral           │ Investigation    │ 12 │ The moss has been arranged…  │ [×]
│ Stand at the centre          │ Wisdom Save      │ 14 │ On fail: a voice says name…  │ [×]
│ [new trigger…]               │ [skill…]         │    │ [result…]                    │
└──────────────────────────────┴──────────────────┴────┴──────────────────────────────┘
[+ Add Check]
```

Each row: four inputs (trigger text, skill text, DC as number, result text). Saves as:
```json
[
  { "trigger": "Examine the spiral", "skill": "Investigation", "dc": 12, "result": "The moss has been arranged..." },
  { "trigger": "Stand at the centre", "skill": "Wisdom Save", "dc": 14, "result": "On fail: a voice says your character's name." }
]
```

When reading existing `mechanical_effect` values that are plain strings (from old data), attempt JSON parse. If it fails, show plain textarea fallback.

## Branch display

Branches render **between scene rows** as visual connectors — not in a separate tab.

When a scene has `branches`, render them below the last beat of that scene:

```
    → Left Path — The Druid's Cabin      [Target: Scene 5a]    [edit] [×]
    → Right Path — Direct to Heart       [Target: Scene 5b]    [edit] [×]
    [+ Add Branch]
```

Each branch tag shows: arrow `→`, `branch.label`, target scene title (looked up from all scenes by `target_scene_id`), `[edit]`, `[×]`.

**Branch edit form (inline, expands on `[edit]`):**
- Label (text input)
- Description (textarea 1 row)
- Condition Text (textarea 1 row)
- Condition Type (select: `Tx` enum — explicit / implicit / conditional)
- Target Scene (select from all scenes in the session, excluding self)
- `[Save]` `[Cancel]`

## Save behaviour

- Beat: save on explicit `[Save]` button within the expanded panel, or on collapse if dirty
- Scene/session metadata: save on `[Save]` button
- Inline save feedback: `"Saved"` in `var(--green-bright)`, `"Error"` in `var(--danger)`

---

# Part 2 — DOCX Import Tool

## Entry point

Two access points:
1. `[Import]` button in the Sessions header (top right of Sessions content area)
2. `[Import from DOCX]` in the `[⋯]` session popover

Both open the same import modal.

## mammoth.js

```bash
npm install mammoth
```

Use `mammoth.convertToMarkdown(arrayBuffer)`:

```js
import mammoth from 'mammoth';

async function docxToMarkdown(file) {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToMarkdown(arrayBuffer);
  return value;
}
```

## Modal states

```
idle → parsing → preview → importing → done
                         ↘ error (session exists)
                         ↘ error (parse failure)
```

### Idle state
Drop zone accepting `.docx` only. Cancel button.

### Parsing state
Spinner + "Reading document…"

### Preview state
```
✓ Session 2 — Into the Heart
✓ 9 scenes detected
✓ 34 beats detected
✓ 2 stat blocks detected  (Darcy, Rotting Bloom)
⚠ 1 branching path  (Scene 4 → 5a / 5b)

▼ Scene breakdown
  1  Darcy — The Clearing     [narrative]  4 beats
  2  Into the Forest          [narrative]  5 beats
  3  Rotting Bloom Combat     [combat]     3 beats
  4  The Fork in the Road     [narrative]  3 beats
  5a The Druid's Cabin        [narrative]  5 beats  ← branches from 4
  5b The Right Path           [narrative]  3 beats  ← branches from 4
  6  The Antechamber          [narrative]  3 beats
  7  The Web Chamber / Ilya   [narrative]  5 beats
  8  Damir                    [combat]     4 beats
  9  Level Up & Close         [narrative]  3 beats

ⓘ Import cannot be undone. Edit content in the session outliner after import.

[Cancel]    [Import to Supabase →]
```

### Error state — session already exists
```
⛔ Session 2 already exists

Session 2 ("Into the Heart") is already in the database.
Use the session outliner to edit it. Re-importing is not supported.

[Close]
```

Check runs immediately after parsing, before showing preview:
```js
const exists = sessions.find(s => s.session_number === parsed.sessionNumber);
if (exists) → show error state immediately. No overwrite option. Hard stop.
```

### Importing state
Step-by-step progress log:
```
Saving stat blocks…  ✓
Saving session…      ✓
Saving Scene 1…      ✓
Saving Scene 2…      ⋯
```

### Done state
```
✓ Session 2 imported successfully
  9 scenes · 34 beats · 2 stat blocks
  [Open in Outliner]   [Close]
```
`[Open in Outliner]` scrolls to and expands the new session in the outliner.

---

## The parser

### Session header
```
# THE GREEN HUNGER
DM Guide — Session [N]
Chapter [N]: [Title]
```
Extract `session_number` (integer from "Session N"), `title` (chapter title only, e.g. "Into the Heart"), `subtitle` ("Chapter N: [Title]").

### Session overview table
Pipe table with columns: `#`, `Scene`, `Purpose`, `Time`, `Notes`.

Parse each row:
```js
{ sceneNumber: "1", title: "Darcy — The Clearing", purpose: "Moral choice, first consequences", estimatedTime: "20–30 min", notes: "Let persuasion breathe." }
```
`notes` → `scenes.fallback_notes`. `purpose` → `scenes.purpose`. `estimatedTime` → `scenes.estimated_time`.

### Background section
```
## Background — What the DM Knows
```
Concatenate all paragraphs until first `## Scene` heading → `sessions.notes`.

### Scene heading detection
```js
/^##\s+Scene\s+(\d+[ab]?)\s+[—–\-]\s+(.+)$/m
```
Group 1 = scene number string. Group 2 = scene title.

Scene object:
```js
{
  sceneNumber: "1",       // string, preserve letter suffix
  title: "...",
  isBranching: /[ab]$/.test(sceneNumber),
  order: 1,               // integer (see branching section)
  slug: "s2-1",           // s{sessionNum}-{sceneNumber}
  sceneType: "narrative", // override for combat scenes
  purpose: "",            // from overview table
  estimatedTime: "",      // from overview table
  beats: [],
  outcomes: [],
  dmNotes: "",
  fallbackNotes: "",
}
```

### Scene type inference
Set `scene_type = "combat"` if:
- Scene title contains "COMBAT", "Fight", "Battle", or "Combat"
- OR scene body contains a `### Stat Block —` heading
Otherwise `"narrative"`.

### Beat detection
Split scene body on `###` sub-headings. Type mapping:

| Sub-heading pattern | Beat type | Notes |
|---|---|---|
| `Opening Narrative` | `narrative` | |
| `[Name] Appears`, `[Name]'s [X]`, named narrative | `narrative` | |
| `Persuasion Window`, `Raven Appearance`, `Birna's Send-Off`, `The Walk`, `Raven Appears` | `prompt` | |
| `If Persuasion Succeeds`, `If Persuasion Fails`, `Outcomes` (standalone) | `decision` | |
| `COMBAT`, `Setup` (in combat scene) | `combat` | |
| `Stat Block —` | — | Not a beat — triggers stat block extraction |
| `What They Can Find`, `What They Can Learn`, `The Clue —`, `Rot Opportunity`, `Finding the Entrance` | `check` | |
| `DM NOTE:` | — | Not a beat — append to previous beat's `dm_notes` |
| `Combat Description Prompts` | — | Not a beat — append to previous combat beat's `dm_notes` |
| `Level Up`, `Level Up & Close`, `Session Close` | `narrative` | |
| `Freeing [Name]`, `What [Name] Says` | `prompt` | |
| `[Name]'s Choices`, `[Name]'s Boon` | `decision` | |
| `Before Initiative` | `prompt` | |
| `Description — What They See` | `narrative` | |

Beat slug: `b{sceneSlug}-{order}` e.g. `bs2-1-1`.
Beat `trigger_text`: use the sub-heading text itself.

### Beat content extraction

**`beats.content` + `beats.player_text`:** All body paragraphs that are NOT a DM NOTE block.

**`beats.dm_notes`:** Any paragraph starting with `**DM NOTE**:` or `DM NOTE:` — extract text after the prefix. Handle both inline and standalone forms.

**`beats.mechanical_effect` (skill check tables):** Detect pipe table with `DC` column. Parse into JSONB array `[{ trigger, skill, dc, result }]`. Column map: `Trigger` → trigger, `Skill / Save` → skill, `DC` → dc (integer), `What They Learn` → result.

**`scenes.outcomes` (outcome tables):** Detect pipe table with `Consequence` column. Parse into `[{ outcome, consequence }]`, store on parent scene.

### Stat block extraction

On `### Stat Block — [Name]`:
- Extract raw text from this heading to the next `###`
- Pass to the **existing stat block text parser** (extract the `Fd()` parser into a shared utility `parseStatBlockText(rawText)` and call it from here — do not rewrite the parser)
- Call `saveStatBlock(parsed)` (stat blocks saved before scenes, before beats)
- Store UUID: `statBlockIdMap[name.toLowerCase()] = data.id`

Stat block ↔ beat linking: when saving a combat beat, check if its title or content contains any key in `statBlockIdMap` (case-insensitive partial match). If yes, set `stat_block_id`.

### 5a/5b branching

**Detection:** `/^\d+[a-z]$/` on scene number.

**Order assignment:** Sort all scene numbers treating letter suffixes as decimals (5a=5.1, 5b=5.2), then assign sequential integers starting from 1.

**Branch records** (created after all scenes have UUIDs):
```js
await saveBranch({
  scene_id: parentScene.id,   // scene with preceding integer number
  order: branchIndex + 1,
  label: branchScene.title,
  description: branchScene.fallbackNotes || "",
  condition_text: `Party takes the ${branchScene.title.toLowerCase()} option`,
  condition_type: "explicit",
  target_scene_id: branchScene.id,
  target_slug: branchScene.slug,
  is_dm_only: false,
});
```

---

## Import sequence (exact order — do not deviate)

```js
async function runImport(parsed) {
  // 1. Stat blocks (beats need their UUIDs)
  const statBlockIdMap = {};
  for (const sb of parsed.statBlocks) {
    const { data } = await saveStatBlock(sb);
    if (data) statBlockIdMap[sb.name.toLowerCase()] = data.id;
  }

  // 2. Session
  const { data: session } = await saveSession({
    adventure_id: adventureId,
    session_number: parsed.sessionNumber,
    title: parsed.sessionTitle,
    subtitle: parsed.chapterSubtitle,
    notes: parsed.backgroundNotes,
    estimated_duration: parsed.estimatedDuration,
    objectives: parsed.objectives,
  });

  // 3. Scenes — non-branching first, then branching
  const sceneIdMap = {};
  const sortedScenes = [
    ...parsed.scenes.filter(s => !s.isBranching),
    ...parsed.scenes.filter(s => s.isBranching),
  ];

  for (const scene of sortedScenes) {
    const { data: savedScene } = await saveScene({
      session_id: session.id,
      order: scene.order,
      slug: scene.slug,
      title: scene.title,
      scene_type: scene.sceneType,
      purpose: scene.purpose,
      estimated_time: scene.estimatedTime,
      fallback_notes: scene.fallbackNotes,
      dm_notes: scene.dmNotes,
      outcomes: scene.outcomes,
      is_published: false,
    });
    sceneIdMap[scene.sceneNumber] = savedScene;

    // 4. Beats
    for (const beat of scene.beats) {
      const sbName = beat.statBlockRef?.toLowerCase();
      const statBlockKey = sbName
        ? Object.keys(statBlockIdMap).find(k => sbName.includes(k) || k.includes(sbName))
        : null;

      await saveBeat({
        scene_id: savedScene.id,
        order: beat.order,
        slug: beat.slug,
        title: beat.title,
        type: beat.type,
        trigger_text: beat.triggerText,
        content: beat.content,
        player_text: beat.playerText || beat.content,
        dm_notes: beat.dmNotes,
        mechanical_effect: beat.mechanicalEffect
          ? JSON.stringify(beat.mechanicalEffect)
          : null,
        stat_block_id: statBlockKey ? statBlockIdMap[statBlockKey] : null,
      });
    }
  }

  // 5. Branches (after all scenes have UUIDs)
  for (const branch of parsed.branches) {
    const parentScene = sceneIdMap[branch.parentSceneNumber];
    const targetScene = sceneIdMap[branch.targetSceneNumber];
    if (!parentScene || !targetScene) continue;

    await saveBranch({
      scene_id: parentScene.id,
      order: branch.order,
      label: branch.label,
      description: branch.description,
      condition_text: branch.conditionText,
      condition_type: "explicit",
      target_scene_id: targetScene.id,
      target_slug: targetScene.slug,
      is_dm_only: false,
    });
  }

  // 6. Refresh store
  await refreshSession(session.id);
}
```

---

## Error handling

- Wrap entire import in try/catch
- On error: show step that failed, stop, do not rollback (partial imports are recoverable in the outliner)
- `console.error('Import failed at step:', currentStep, error)`

---

## Known parsing edge cases

| Edge case | Handling |
|---|---|
| Darcy stat block mid-scene (Scene 1, before persuasion resolves) | Extract stat block wherever `### Stat Block —` appears. Link to nearest combat beat in same scene. |
| `**DM NOTE**:` inline within a paragraph | Check for `DM NOTE` anywhere in paragraph, not just as heading prefix. |
| Skill check tables with 3 or 4 columns | Parse tolerantly: long first column = trigger, long last column = result, middle = skill/DC. |
| Ability score table in stat block (multi-row Word table) | Validate all six scores present after extraction. Fill missing with `10`. |
| `If Persuasion Fails — COMBAT` combined heading | Create two beats: one `decision` (the fail narrative), one `combat` (the fight trigger). |
| Raven appearances with emoji in heading (🦅) | Include emoji in beat title — it's intentional. |
| Session 3 Background section is 6+ paragraphs | No special handling — concatenate until first `## Scene`. |
| `Before Initiative` NPC speech | Type `prompt`. Content = the NPC speech. DM NOTE = the tactical context if present. |

---

## Field mapping reference

| Document element | Database field |
|---|---|
| `Session N` number | `sessions.session_number` |
| Chapter title | `sessions.title` |
| Background section | `sessions.notes` |
| Overview table `Notes` column | `scenes.fallback_notes` |
| Overview table `Purpose` column | `scenes.purpose` |
| Overview table `Time` column | `scenes.estimated_time` |
| Scene body narrative text | `beats.content` + `beats.player_text` |
| `DM NOTE:` blocks | `beats.dm_notes` |
| `###` sub-heading text | `beats.trigger_text` |
| Skill check pipe table | `beats.mechanical_effect` (JSONB stringified) |
| Outcome pipe table | `scenes.outcomes` (JSONB) |
| `### Stat Block — [Name]` | `stat_blocks` via `saveStatBlock` |
| Stat block reference in combat beat | `beats.stat_block_id` |
| Branching scenes 5a/5b | `scene_branches` via `saveBranch` |

---

## Do not change

- Run-mode panel (`Bb`), topbar (`Eb`), combat tracker (`Gb`), character panel (`Ab`) — untouched beyond the null guard in Part 0d
- All store actions (`saveSession`, `saveScene`, `saveBeat`, `saveBranch`, `saveStatBlock`, etc.) — use as-is, do not rewrite
- The existing stat block text parser — extract into `parseStatBlockText()` shared utility, call from import tool
- The 200px builder left sidebar (Sessions / Stat Blocks / Spells / NPCs nav) — keep exactly as-is
- `stat_blocks`, `characters`, `character_states`, `campaign_state`, `music_tracks` — do not delete or modify
