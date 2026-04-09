# Green Hunger — Character Data Migration Brief
## Moving static character data from hardcoded bundle → Supabase

---

## Context and goal

All four player characters (Dorothea, Kanan, Danil, Ilya) currently have their full static data — ability scores, skills, saving throws, spells, features, weapons, equipment, backstory — hardcoded in the player app bundle (`index-3ocWuDdQ.js`). Live combat state (HP, spell slots used, conditions, death saves) already lives in the `character_states` Supabase table.

The goal is to move all static character data into Supabase so that:
1. Level-ups can be applied by uploading a D&D Beyond PDF, without touching source code
2. The player app fetches character data on load rather than bundling it
3. Character data can be updated without a rebuild and redeploy

This is a two-phase task: **schema migration** (new tables) then **app refactor** (player app reads from Supabase).

---

## Pre-read: current data structure in the bundle

Each character object currently has this shape (from the live bundle — do not guess, use these exact field names):

```js
{
  id: "danil",
  name: "Danil Tanner",
  password: "Dianara",          // login password — stays in Supabase
  class: "Sorcerer",
  subclass: "Aberrant Mind / Genie Touched",
  level: 4,
  species: "Half-Elf",
  background: "Genie Touched (Milestone)",
  player: "BearOfTheSouthWest",
  image: "Danil.png",           // local file — leave as-is for now
  colour: "#407080",
  stats: {
    maxHp: 26, ac: 13, speed: 30,
    initiative: "+2", proficiencyBonus: "+2",
    spellAttack: "+6", spellSaveDC: 14,
    spellcastingAbility: "Charisma"
  },
  abilityScores: { STR, DEX, CON, INT, WIS, CHA },  // each: { score, mod }
  savingThrows: [ { name, mod, proficient } ],        // array of 6
  skills: [ { name, mod, proficient?, expertise?, ability } ],  // array of 18
  spellSlots: { 1: { max, used }, 2: { max, used }, ... },
  sorceryPoints: { max: 4, used: 0 },                // Danil only
  features: [ { name, uses, description } ],
  spells: {
    cantrips: [ spell ],
    1: [ spell ],
    2: [ spell ],
    // etc.
  },
  weapons: [ { name, hit, attackBonus, damage, damageDice, notes } ],
  healingActions: [ ... ],
  buffActions: [ ... ],          // Dorothea only (Bardic Inspiration)
  equipment: [ string ],
  magicItems: [ { name, description } ],
  passiveScores: { perception, insight, investigation },
  senses: string,
  languages: string,
  backstory: string,
}
```

**Spell object shape:**
```js
{
  name, level, school, mechanic,   // mechanic: "attack"|"save"|"heal"|"utility"|"auto"
  castingTime, range, target,
  // attack spells:
  toHit, damage: { count, sides, mod, type },
  // save spells:
  saveType, saveDC,
  // heal spells:
  healDice: { count, sides, mod }, perLevelHeal: { count, sides },
  // optional:
  concentration, ritual, upcast, limitedUse, alwaysPrepared,
  perLevel: { count, sides },      // damage upcast bonus per slot
  missiles, perLevelMissiles, rays, perLevelRays,
  aoe, description,
  minSlot, maxSlotLevel,
}
```

---

## Phase 1 — Database schema

### New table: `characters`

This holds all static character data. Do NOT use the existing `npcs` table — characters have a fundamentally different shape.

```sql
CREATE TABLE public.characters (
  id                  text PRIMARY KEY,          -- 'dorothea', 'kanan', 'danil', 'ilya'
  campaign_id         uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name                text NOT NULL,
  password            text,                      -- player login password
  class               text NOT NULL,
  subclass            text,
  level               integer NOT NULL DEFAULT 1,
  species             text,
  background          text,
  player_name         text,                      -- real-world player name
  image               text,                      -- filename e.g. 'Danil.png'
  colour              text,                      -- hex accent colour
  ac                  integer,
  speed               integer,
  initiative          text,
  proficiency_bonus   text,
  spell_attack        text,
  spell_save_dc       integer,
  spellcasting_ability text,
  ability_scores      jsonb DEFAULT '{}'::jsonb,  -- { STR: { score, mod }, ... }
  saving_throws       jsonb DEFAULT '[]'::jsonb,  -- [ { name, mod, proficient } ]
  skills              jsonb DEFAULT '[]'::jsonb,  -- [ { name, mod, proficient, expertise, ability } ]
  features            jsonb DEFAULT '[]'::jsonb,  -- [ { name, uses, description } ]
  weapons             jsonb DEFAULT '[]'::jsonb,
  healing_actions     jsonb DEFAULT '[]'::jsonb,
  buff_actions        jsonb DEFAULT '[]'::jsonb,
  equipment           jsonb DEFAULT '[]'::jsonb,  -- [ string ] or [ { name, description } ]
  magic_items         jsonb DEFAULT '[]'::jsonb,  -- [ { name, description } ]
  passive_scores      jsonb DEFAULT '{}'::jsonb,  -- { perception, insight, investigation }
  senses              text,
  languages           text,
  backstory           text,
  sorcery_points_max  integer,                   -- null unless class uses sorcery points
  is_active           boolean DEFAULT true,       -- DM toggle for Ilya
  is_npc              boolean DEFAULT false,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "characters_public_read"
  ON public.characters FOR SELECT TO public USING (true);

CREATE POLICY "characters_public_update"
  ON public.characters FOR UPDATE TO public USING (true);

CREATE POLICY "characters_public_insert"
  ON public.characters FOR INSERT TO public WITH CHECK (true);
```

### New table: `character_spells`

Spells get their own table so they can be added, replaced, or queried individually — this is what makes level-up uploads work cleanly.

```sql
CREATE TABLE public.character_spells (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    text REFERENCES public.characters(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name            text NOT NULL,
  level           integer NOT NULL DEFAULT 0,  -- 0 = cantrip
  school          text,
  mechanic        text,     -- 'attack'|'save'|'heal'|'utility'|'auto'
  casting_time    text,
  range           text,
  target          text,     -- 'enemy'|'ally'|'self'|'party'|null
  concentration   boolean DEFAULT false,
  ritual          boolean DEFAULT false,
  upcast          boolean DEFAULT false,
  limited_use     text,     -- e.g. '1/LR', 'Ritual (no slot)'
  always_prepared boolean DEFAULT false,
  min_slot        integer DEFAULT 1,
  max_slot_level  integer,
  -- attack mechanics
  to_hit          integer,
  -- save mechanics
  save_type       text,     -- 'STR'|'DEX'|'CON'|'INT'|'WIS'|'CHA'
  save_dc         integer,
  -- damage
  damage          jsonb,    -- { count, sides, mod, type }
  per_level       jsonb,    -- { count, sides } — upcast damage bonus
  damage_if_hurt  jsonb,    -- Toll the Dead variant
  -- heal
  heal_dice       jsonb,    -- { count, sides, mod }
  per_level_heal  jsonb,    -- { count, sides }
  -- multi-hit
  missiles        integer,
  per_level_missiles integer,
  rays            integer,
  per_level_rays  integer,
  -- area
  aoe             text,
  -- display
  description     text,
  higher_level_effect text,
  -- ordering
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.character_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_spells_public_read"
  ON public.character_spells FOR SELECT TO public USING (true);

CREATE POLICY "character_spells_public_insert"
  ON public.character_spells FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "character_spells_public_update"
  ON public.character_spells FOR UPDATE TO public USING (true);

CREATE POLICY "character_spells_public_delete"
  ON public.character_spells FOR DELETE TO public USING (true);
```

### Modify existing: `character_states`

`character_states` already has: `id`, `cur_hp`, `max_hp`, `temp_hp`, `concentration`, `spell_slots`, `death_saves`, `conditions`, `green_marks`, `player_name`, `is_active`, `updated_at`.

**Add one column** to link it to the new `characters` table:

```sql
-- No migration needed — id is already the character slug ('danil', etc.)
-- The character_states.id naturally FK-references characters.id
-- Optionally add an explicit FK constraint:
ALTER TABLE public.character_states
  ADD CONSTRAINT fk_character_states_characters
  FOREIGN KEY (id) REFERENCES public.characters(id) ON DELETE CASCADE;
```

Also: **remove `player_name` and `is_active` from `character_states`** — they now live on `characters`. Check first that Claude hasn't already wired these to the DM roster panel before removing them; if it has, migrate the logic to read from `characters` instead.

---

## Phase 2 — Seed all four characters

After creating the tables, seed the character data. Use the exact current values from the bundle. Do NOT invent or approximate values.

**Note on Danil's stats:** There is a minor discrepancy between the D&D Beyond PDF (DEX 15, CON 15) and the current bundle (DEX 14, CON 16). The bundle values appear to already include the Genie Touched background's +1/+1/+1 ASI applied differently. **Use the bundle values** as the source of truth for seeding — the PDF will be used for future level-ups only. Flag this discrepancy in a code comment.

### Seed `characters` table

Insert one row per character. All four: Dorothea, Kanan, Danil, Ilya. All JSONB fields should use the exact current data from the hardcoded bundle object, serialised to JSON. Key values:

**Dorothea Flight**
- id: `'dorothea'`, class: Bard, subclass: College of Glamour, level: 4, species: Human
- password: `'Esmae'`, colour: `'#9070a0'`
- AC: 13, HP: 43 (max — live HP in character_states), speed: 30
- Spell attack: +6, save DC: 14, spellcasting: Charisma, proficiency: +2
- STR 10/DEX 12/CON 14/INT 10/WIS 14/CHA 18

**Kanan Black**
- id: `'kanan'`, class: Wizard, subclass: School of Necromancy, level: 4, species: Tiefling
- password: `'Ishmira'`, colour: `'#8060a0'`
- AC: 13, HP: 26 (max), speed: 30
- Spell attack: +7, save DC: 15, spellcasting: Intelligence, proficiency: +2
- STR 8/DEX 14/CON 14/INT 18/WIS 12/CHA 12

**Danil Tanner**
- id: `'danil'`, class: Sorcerer, subclass: Aberrant Mind / Genie Touched, level: 4, species: Half-Elf
- password: `'Dianara'`, colour: `'#407080'`
- AC: 13, HP: 26 (max), speed: 30
- Spell attack: +6, save DC: 14, spellcasting: Charisma, proficiency: +2
- STR 10/DEX 14/CON 16/INT 12/WIS 12/CHA 18
- sorcery_points_max: 4

**Ilya**
- id: `'ilya'`, class: Cleric, subclass: Talona (secret), level: 7, species: Human
- password: `'Ilyan'`, colour: `'#608070'`
- is_npc: true (but playable when is_active = true)
- AC: 14, HP: 58 (max — note: character_states currently has 45; update to 58 to match bundle)
- Spell attack: +7, save DC: 15, spellcasting: Wisdom, proficiency: +3
- STR 10/DEX 12/CON 14/INT 16/WIS 18/CHA 13

### Seed `character_spells` table

Seed all spells for all four characters from the current bundle data. Assign `sort_order` by spell level then alphabetically. Every spell field from the bundle's spell objects maps directly to a column in `character_spells`.

---

## Phase 3 — Player app refactor

### On startup

Replace the hardcoded `ut = { dorothea: {...}, kanan: {...}, ... }` constant with a Supabase fetch:

```js
// On app init (before character select screen renders):
const { data: characters } = await supabase
  .from('characters')
  .select('*')
  .eq('campaign_id', CAMPAIGN_ID)
  .order('id');

const { data: spells } = await supabase
  .from('character_spells')
  .select('*')
  .in('character_id', characters.map(c => c.id));

// Build the character map the app currently expects:
const characterMap = {};
for (const char of characters) {
  characterMap[char.id] = {
    ...char,
    spells: groupSpellsByLevel(spells.filter(s => s.character_id === char.id)),
  };
}
```

### Character select screen

- Filter by `is_active = true` (from `characters.is_active`, not `character_states.is_active` — consolidate these)
- Password check against `characters.password`

### Character sheet

All reads that currently reference the hardcoded object (`char.stats.maxHp`, `char.skills`, etc.) should continue to work with the same field names — the shape of the fetched object should match the current hardcoded shape exactly, so component code requires minimal changes.

The only exception: **live values** (cur_hp, spell slots used, conditions, death saves, green marks) continue to come from `character_states` via the existing Realtime subscription. Do not move these to `characters`.

### Realtime

No changes needed to the existing `character_states` subscription — it already handles all live state. The `characters` table data only needs to be fetched once on load and can be held in app state (no Realtime subscription needed — static data doesn't change mid-session).

---

## Phase 4 — DM console additions

### Character data editor (new panel)

Add a **Characters** tab to the DM console with a simple edit interface for each character:

- Level field (integer) — updating this should prompt "Update all derived stats?" 
- Ability scores (six inputs)
- Proficiency bonus (auto-calculated from level: floor((level-1)/4)+2)
- HP max (integer)
- AC (integer)
- Spell attack and save DC (auto-calculated from spellcasting ability mod + proficiency)
- Spell slots (per level, max — not used count, that's in character_states)
- Spell list: table of spells with edit/delete per row, and "Add spell" button
- Features: list with edit/delete and "Add feature" button
- Save button writes to `characters` and `character_spells` tables

This panel is the manual editing interface. The PDF upload tool (described separately) will use this same backend but populate it automatically.

### PDF upload parser (the level-up tool)

Add an "Import from D&D Beyond PDF" button in the Characters panel.

**Parsing approach — do it client-side with PDF.js:**

1. User selects a D&D Beyond exported PDF file
2. Use `pdf.js` (already likely in project, or add as a dependency) to extract text content page by page
3. Parse the text using a purpose-built parser for the D&D Beyond PDF format (it is consistent across all exports — same field order, same labels, same layout)
4. The parser should extract:
   - Character name, class, level, species, background
   - All six ability scores and their modifiers
   - All saving throws with proficiency indicators (• bullet in the PDF)
   - All 18 skills with proficiency/expertise indicators
   - AC, HP, speed, initiative
   - Hit dice
   - Spell slots by level
   - All features and traits (from Features & Traits pages)
   - All weapons (from Weapon Attacks & Cantrips section)
   - Equipment list
5. Show a **diff view** before saving: "Level 4 → 5. Changes: HP 26→32, new spell slot L3×2, new feature: Careful Spell upgraded, new spell: Fireball." User confirms.
6. On confirm: `UPDATE characters SET level = $1, ... WHERE id = $2` and upsert changed spells

**Parser notes specific to D&D Beyond PDF format:**

The PDF text layer is clean and consistently structured. Key parsing anchors:
- `CLASS & LEVEL` label precedes `Sorcerer 4` etc.
- Ability scores appear as pairs: score on one line, modifier below
- Skill proficiency: look for `•` bullet preceding the modifier
- Spell slots: not explicitly listed in the basic PDF — derive from class/level using a lookup table
- Features page uses `=== SORCERER FEATURES ===` and `* Feature Name • Source` format
- Weapons section uses `=== WEAPONS ===` as a header anchor
- Multiple pages — parse all pages, concatenate text before parsing

The `pdf-parse` npm package or `PDF.js` `getTextContent()` are both viable. PDF.js is preferred as it runs client-side with no server needed.

**Important:** spell descriptions are NOT in the D&D Beyond PDF export in full — they are truncated. After a PDF import, spells that are new (not already in the database) will need their `description` field populated manually or from a spells reference table. Show a warning: "3 new spells added — descriptions need to be filled in."

---

## Implementation order

1. Apply the SQL migrations (schema only — no seeding yet)
2. Seed `characters` table for all four characters
3. Seed `character_spells` for all four characters
4. Update `character_states.max_hp` for Ilya from 45 → 58 (to match bundle)
5. Refactor player app to fetch from Supabase on load (Phase 3)
6. Verify all four character sheets render identically to current behaviour
7. Add DM character editor panel (Phase 4 — manual editing)
8. Add PDF upload parser (Phase 4 — import tool)

---

## Do not change

- The existing `character_states` Realtime subscription and all live state logic
- The `gh_shared` roll log and session state — untouched
- The hardcoded session/scene/beat content in the DM console — separate system
- Character portrait image files — still served from the repo's `/characters/` directory

---

## Known discrepancies to flag in code

1. **Danil ability scores:** PDF (DEX 15 / CON 15) vs bundle (DEX 14 / CON 16). The Genie Touched background grants +1 to three ability scores; the allocation differs between the two sources. Confirm with player which is correct before next session.
2. **Danil AC:** PDF shows 12 (no armour, no Mage Armor). Bundle shows 13. The +1 is unexplained — possibly the bundle assumed Mage Armor is always active. Confirm with player.
3. **Danil spell save DC:** PDF ability save DC field is blank. Bundle uses 14. 14 = 8 + 4 (CHA) + 2 (prof), which is correct for a Charisma-based caster at level 4.
4. **Ilya max HP:** `character_states` has 45, bundle has 58. 58 is correct for a Level 7 Cleric (7d8+14). Update `character_states.max_hp` to 58 and `cur_hp` to 58 during seeding.
