# Green Hunger — SRD Integration Plan

This document covers what the two SRD repositories contain, what's already pulled in, what's missing, how each missing piece fits into the DM builder, and a recommended parsing pipeline for extending coverage over time.

---

## What We Have

Two complete SRD data sources sitting in `docs/`:

| Repo | Purpose | Total Entities |
|---|---|---|
| `5e-database-main` | Source-of-truth JSON for all 5e SRD data | 10,390+ |
| `5e-srd-api-main` | REST/GraphQL API wrapper over the same data | Same data, queryable |

The API repo adds nothing new — it's the database in a queryable form. For import purposes, read directly from the JSON files in `5e-database-main/src/2014/`.

---

## Current Integration Status

Three reference tables exist in Supabase (`reference_conditions`, `reference_spells`, `reference_monsters`) and three ETL functions in `shared/lib/reference/`. Everything else is either hardcoded, stored as freeform text, or absent.

| Category | Available | Integrated | How Currently Handled |
|---|---|---|---|
| Spells | 1,804 | ✅ Partial | `reference_spells` + `spell_compendium` — 2014 SRD only |
| Monsters | 2,388 | ✅ Partial | `reference_monsters` + clone to `stat_blocks` |
| Conditions | 15 | ✅ Partial | `reference_conditions` + `shared/lib/rules/catalog/conditions.json` |
| Classes | 477 entries | ❌ None | Characters store class as a plain text string |
| Subclasses | 250 | ❌ None | Characters store subclass as a plain text string |
| Races / Species | 108 | ❌ None | Characters store species as a plain text string |
| Subraces | 19 | ❌ None | Not normalised |
| Traits | 192 | ❌ None | Appear only in `stat_blocks.traits` as freeform JSONB |
| Backgrounds | 30 | ❌ None | Not present anywhere in the app |
| Feats | 2 (SRD only) | ❌ None | Not present anywhere |
| Features (class/level) | 1,185 | ❌ None | No level progression tables |
| Equipment | 773 | ❌ None | Characters store equipment as freeform text |
| Magic Items | 847 | ❌ None | Characters store magic items as freeform text |
| Proficiencies | 330 | ❌ None | Skills/saves hardcoded |
| Skills | 18 | ✅ Rules only | `shared/lib/rules/catalog/skillsIndex.json` — not in DB |
| Ability Scores | 6 | ✅ Rules only | Hardcoded in character schema |
| Weapon Properties | 11 | ❌ None | Freeform text on equipment |
| Languages | 16 | ❌ None | Characters store as freeform text |
| Damage Types | 13 | ✅ Rules only | `shared/lib/rules/catalog/damageTypes.json` — not in DB |
| Magic Schools | 8 | ✅ Rules only | Used in spell filtering |
| Alignments | 9 | ❌ None | Freeform string on NPCs/monsters |
| Rules / Rule Sections | 72 | ✅ Partial | `data/rules/` — already structured |

---

## What to Bring In — Priority Order

### Tier 1 — High Impact, Unblocked

These directly improve the DM builder and player experience right now with no architectural dependencies.

---

#### 1. Classes + Level Features (`reference_classes`, `reference_class_features`)

**Source:** `5e-SRD-Classes.json` (12 classes) + `5e-SRD-Features.json` (1,185 level features)

**Why:** The character editor currently stores class as a plain text field. There's no knowledge of what features a Barbarian gets at level 5, what a Wizard's spellcasting progression looks like, or what proficiencies each class grants. This is the foundation everything else builds on.

**DM Builder use:**
- Character editor: auto-populate features, proficiencies, and spell slots when DM sets class + level
- NPC editor: "This NPC is a Fighter 8" fills in stats automatically
- Encounter budget: class-aware HP calculation for NPCs

**Player app use:**
- Character sheet can show correct class features for the PC's level
- Rest recovery: short-rest hit dice auto-calculated from class

**Supabase tables to create:**
```sql
CREATE TABLE reference_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,          -- 'barbarian'
  name text NOT NULL,                  -- 'Barbarian'
  hit_die integer NOT NULL,            -- 12
  primary_ability text[],              -- ['STR']
  saving_throw_proficiencies text[],   -- ['STR', 'CON']
  armor_proficiencies text[],
  weapon_proficiencies text[],
  tool_proficiencies text[],
  skill_choices integer,               -- choose 2 from list
  skill_options text[],
  spellcasting_ability text,           -- null for non-casters
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);

CREATE TABLE reference_class_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  class_index text NOT NULL,           -- 'barbarian'
  subclass_index text,                 -- null for class features; 'berserker' for subclass
  level integer NOT NULL,              -- 1–20
  name text NOT NULL,                  -- 'Rage'
  description text,
  feature_type text,                   -- 'class' | 'subclass'
  raw_json jsonb,
  imported_at timestamptz DEFAULT now()
);
```

---

#### 2. Subclasses (`reference_subclasses`)

**Source:** `5e-SRD-Subclasses.json` (250 entries)

**Why:** Subclass affects spell lists (Cleric domains, Paladin oaths), feature grants at levels 3/6/10/14, and flavour. Currently stored as a free text string on characters.

**DM Builder use:**
- Character editor dropdown populates subclasses valid for the chosen class
- Subclass-specific spells auto-added to character spell list

**Supabase table:**
```sql
CREATE TABLE reference_subclasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,          -- 'berserker'
  class_index text NOT NULL,           -- 'barbarian'
  name text NOT NULL,                  -- 'Berserker'
  flavor text,                         -- 'Primal Path'
  description text,
  granted_spells jsonb,                -- array of {level, spell_index} for domain/oath spells
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

---

#### 3. Races / Species + Subraces + Traits (`reference_races`, `reference_traits`)

**Source:** `5e-SRD-Races.json` (108 entries), `5e-SRD-Subraces.json` (19), `5e-SRD-Traits.json` (192)

**Why:** Currently species is a freeform text field. No app knows what Darkvision range a Half-Elf has, what ability score bonuses a Dwarf gets, or what language proficiencies a Gnome starts with.

**DM Builder use:**
- Character editor: selecting species auto-fills ability bonuses, trait list, starting languages
- NPC editor: same
- Character stat validation: flag if ASIs don't match species

**Player app use:**
- Character sheet "Racial Traits" tab populated from reference (no DM needs to manually enter Darkvision)

**Supabase tables:**
```sql
CREATE TABLE reference_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,          -- 'dwarf'
  name text NOT NULL,
  speed integer,
  size text,
  ability_bonuses jsonb,               -- [{"ability": "CON", "bonus": 2}]
  starting_languages text[],
  trait_indices text[],                -- ['darkvision', 'dwarven-resilience']
  subrace_indices text[],
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);

CREATE TABLE reference_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,          -- 'darkvision'
  name text NOT NULL,
  description text,
  race_indices text[],
  proficiency_grants jsonb,
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

---

#### 4. Equipment + Weapon Properties (`reference_equipment`)

**Source:** `5e-SRD-Equipment.json` (773 items), `5e-SRD-Weapon-Properties.json` (11 entries)

**Why:** Weapons/armour are currently freeform text on character sheets. No app knows that a Rapier deals 1d8 piercing and has the Finesse property, or that Chain Mail has a 13+DEX AC formula.

**DM Builder use:**
- Character editor: equipment picker with searchable SRD weapons/armour
- Generates attack entries automatically (name + die + damage type + properties)
- Equipment cost reference for merchants / loot

**Player app use:**
- Character sheet weapons tab: damage dice already populated from reference
- Finesse weapons: automatically offer STR or DEX for attack/damage rolls

**Supabase table:**
```sql
CREATE TABLE reference_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,          -- 'rapier'
  name text NOT NULL,
  equipment_category text,             -- 'weapon' | 'armor' | 'adventuring-gear' | 'tool'
  weapon_category text,                -- 'Martial' | 'Simple' | null
  weapon_range text,                   -- 'Melee' | 'Ranged' | null
  damage_dice text,                    -- '1d8'
  damage_type text,                    -- 'piercing'
  range_normal integer,                -- 5 (melee) or 30 (thrown)
  range_long integer,
  ac_base integer,                     -- for armour
  ac_add_dex_modifier boolean,
  ac_max_dex_bonus integer,
  strength_minimum integer,
  stealth_disadvantage boolean,
  cost_quantity integer,
  cost_unit text,                      -- 'gp' | 'sp' | 'cp'
  weight_lb numeric,
  properties text[],                   -- ['finesse', 'light']
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

---

#### 5. Magic Items (`reference_magic_items`)

**Source:** `5e-SRD-Magic-Items.json` (847 entries)

**Why:** 847 magic items with rarity, description, and attunement requirements. Currently characters list magic items as freeform text with no structured data.

**DM Builder use:**
- Item award UI: search SRD magic items by name/rarity/category
- One-click add to character sheet with full description
- Loot table generation: pick items by rarity tier

**Player app use:**
- Magic items tab on character sheet: tap item to see full description
- Attunement tracking (attuned = ticked)

**Supabase table:**
```sql
CREATE TABLE reference_magic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  equipment_category text,
  rarity text,                         -- 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact'
  requires_attunement boolean,
  attunement_conditions text,
  description text,
  is_variant boolean,
  variant_of_index text,               -- null for base items
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

---

### Tier 2 — Medium Impact, Some Setup Required

---

#### 6. Backgrounds (`reference_backgrounds`)

**Source:** `5e-SRD-Backgrounds.json` (30 entries)

**Why:** Backgrounds grant skill proficiencies, tool proficiencies, languages, starting equipment, and a unique feature. Currently not in the app at all.

**DM Builder use:**
- Character editor: background picker populates proficiency grants and starting equipment
- NPC backgrounds: quick personality/motivation flavour from ideals/bonds/flaws tables

**Supabase table:**
```sql
CREATE TABLE reference_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  skill_proficiencies text[],          -- ['insight', 'religion']
  tool_proficiencies text[],
  language_choices integer,            -- choose N from any language
  starting_equipment jsonb,
  feature_name text,                   -- 'Shelter of the Faithful'
  feature_description text,
  personality_traits jsonb,            -- array of d8 options
  ideals jsonb,
  bonds jsonb,
  flaws jsonb,
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

---

#### 7. Proficiencies (`reference_proficiencies`)

**Source:** `5e-SRD-Proficiencies.json` (330 entries)

**Why:** Links proficiency types (armor, weapon, skill, tool, vehicle, language) to the classes and races that grant them. Enables the app to validate whether a character's proficiencies are correct and auto-populate proficiency bonus.

**DM Builder use:**
- Validate that a Level 5 Rogue has the right skill proficiencies
- Auto-fill proficiency bonus when querying saving throws

---

#### 8. Languages (`reference_languages`)

**Source:** `5e-SRD-Languages.json` (16 entries — Standard and Exotic)

**Why:** Currently languages are freeform text on characters. Normalising this enables language-based NPC interactions (e.g., "this NPC speaks Elvish — does anyone in the party?") and script reference.

**Simple table:**
```sql
CREATE TABLE reference_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  language_type text,                  -- 'Standard' | 'Exotic'
  typical_speakers text[],
  script text,
  raw_json jsonb,
  UNIQUE (ruleset, source_index)
);
```

---

#### 9. Skills (`reference_skills`)

**Source:** `5e-SRD-Skills.json` (18 entries)

**Why:** Skills are currently hardcoded in `shared/lib/rules/catalog/skillsIndex.json`. Moving them to the DB means the DM toolbox quick-rulings panel and the player skill check roller can be powered by a live, queryable source rather than a static file.

---

#### 10. Damage Types (`reference_damage_types`)

**Source:** `5e-SRD-Damage-Types.json` (13 entries)

**Why:** Damage types are hardcoded throughout the combat pipeline. A normalised reference table enables the DM to see damage type flavour text in the combat tracker ("Psychic damage: a gnawing pain that eats at the mind") and validates damage type input in stat block imports.

---

### Tier 3 — Lower Priority / Foundational for Future Features

---

#### 11. Feats (`reference_feats`)

**Source:** `5e-SRD-Feats.json` — only 2 feats in the 2014 SRD (Grappler is the notable one). The 2024 SRD dataset has significantly more.

**Why:** Feats should be stored as a reference so the character editor can present a searchable list with prerequisites and descriptions rather than requiring DMs to type them manually. Low urgency until feat tracking becomes a character sheet feature.

---

#### 12. Rules + Rule Sections (`reference_rules`)

**Source:** `5e-SRD-Rule-Sections.json` (33 entries) + `5e-SRD-Rules.json` (39 entries)

**Status:** Already partially done — `data/rules/` has structured rules data. Consider whether these need to be in Supabase at all, or whether the JSON files in `data/rules/` are the right long-term home. For now the existing approach is fine; migrate only if the DM toolbox needs to query rules dynamically.

---

#### 13. 2024 SRD Data

The 2024 SRD JSON files exist in `5e-database-main/src/2024/` with 19 data files. The Supabase schema already has a `ruleset` column on all reference tables specifically to support this.

**What's new in 2024 SRD:**
- Updated Conditions (some renamed, some mechanics changed)
- New Species replacing old Races
- Updated class/subclass features
- Weapon Mastery system (new `weapon_mastery_properties` file)
- New Backgrounds and Feats

**Approach:** Once Tier 1 imports are complete for 2014 data, running the same import scripts with `ruleset = '2024'` will populate the 2024 data without touching existing rows (the `UNIQUE (ruleset, source_index)` constraint handles this).

---

## DM Builder: New Sections to Add

Once the reference data above is imported, these builder sections become possible:

### A. Reference Browser (new top-level section)

A read-only reference panel in the builder for quick lookup during session prep. Five tabs:

| Tab | Data Source | Use Case |
|---|---|---|
| **Spells** | `reference_spells` — already exists | Look up any SRD spell while building encounters |
| **Monsters** | `reference_monsters` — already exists | Browse and clone to stat_blocks |
| **Equipment** | `reference_equipment` — new | Look up weapon stats, armour AC, costs |
| **Magic Items** | `reference_magic_items` — new | Award items; see attunement requirements |
| **Rules** | `data/rules/rules-glossary.json` — already exists | Quick rules lookup during prep |

This is mostly UI work once the data is imported.

---

### B. Character Editor Upgrades

The existing character editor becomes dramatically more powerful:

- **Class picker** → dropdown from `reference_classes`; auto-fills hit die, save proficiencies, weapon/armour proficiencies, spellcasting ability
- **Subclass picker** → populates after class selection; options filtered to valid subclasses
- **Species picker** → dropdown from `reference_races`; auto-fills ability bonuses, speed, starting traits and languages
- **Background picker** → dropdown from `reference_backgrounds`; auto-fills skill proficiencies, starting equipment, feature
- **Level-up helper** → select new level → app shows which features are gained from `reference_class_features`
- **Equipment picker** → searchable weapon/armour browser; selecting an item auto-generates an attack action with correct damage dice and properties

---

### C. Magic Item Award Panel (new in Session Runtime)

A slide-out panel during a live session: DM searches `reference_magic_items` by name or rarity, selects an item, selects which character receives it. Item is written to `characters.magic_items` and pushed as a reveal to the player app.

---

### D. Quick Proficiency Checker (DM Toolbox)

Given a character's class, level, race, and background, display their full proficiency list. Flag any discrepancies between what's on the character sheet and what the references say they should have. Useful when importing or manually entering PCs.

---

### E. Loot Generator (Encounter Builder)

Select an encounter's CR range and the app generates a suggested loot table:
- XP from `reference_monsters` (already in `raw_json.xp`)
- Magic item rarity suggestion from DMG CR thresholds
- Random item from `reference_magic_items` filtered by rarity

---

## Recommended Parsing Pipeline

### The Problem

Each SRD category has its own nested JSON structure. One-off scripts per category don't scale — when the 2024 data is extended or a new SRD is released, the pipeline needs to run again cleanly.

### The Recommendation: Standardised ETL Modules + SRD Import Manager UI

**Approach:** Follow the pattern already established in `shared/lib/reference/srdReferenceRows.js`. Each new category gets one file following the same contract. A central import runner calls all of them. A UI in the DM builder triggers and monitors runs.

---

#### Step 1 — One ETL module per category

Create a file per category in `shared/lib/reference/importers/`:

```
shared/lib/reference/importers/
├── importSpells.js        -- already partially done
├── importMonsters.js      -- already partially done
├── importConditions.js    -- already done
├── importClasses.js       -- new
├── importSubclasses.js    -- new
├── importRaces.js         -- new
├── importTraits.js        -- new
├── importBackgrounds.js   -- new
├── importEquipment.js     -- new
├── importMagicItems.js    -- new
├── importProficiencies.js -- new
├── importSkills.js        -- new
├── importLanguages.js     -- new
├── importDamageTypes.js   -- new
└── importFeatures.js      -- new
```

Each file exports a standard interface:

```javascript
// Example: shared/lib/reference/importers/importEquipment.js

import { z } from 'zod'
import equipmentJson from '../../../../docs/5e-database-main/src/2014/5e-SRD-Equipment.json'

// 1. Zod schema — validates every row before it touches the DB
const equipmentRowSchema = z.object({
  ruleset: z.string(),
  source_index: z.string(),
  name: z.string(),
  equipment_category: z.string(),
  weapon_category: z.string().nullable(),
  weapon_range: z.string().nullable(),
  damage_dice: z.string().nullable(),
  damage_type: z.string().nullable(),
  range_normal: z.number().nullable(),
  range_long: z.number().nullable(),
  ac_base: z.number().nullable(),
  ac_add_dex_modifier: z.boolean(),
  ac_max_dex_bonus: z.number().nullable(),
  strength_minimum: z.number().nullable(),
  stealth_disadvantage: z.boolean(),
  cost_quantity: z.number().nullable(),
  cost_unit: z.string().nullable(),
  weight_lb: z.number().nullable(),
  properties: z.array(z.string()),
  raw_json: z.record(z.unknown()),
})

// 2. Transform — one source item → one validated row
function equipmentJsonToRow(item, ruleset = '2014') {
  const row = {
    ruleset,
    source_index: item.index,
    name: item.name,
    equipment_category: item.equipment_category?.index ?? null,
    weapon_category: item.weapon_category ?? null,
    weapon_range: item.weapon_range ?? null,
    damage_dice: item.damage?.damage_dice ?? null,
    damage_type: item.damage?.damage_type?.index ?? null,
    range_normal: item.range?.normal ?? null,
    range_long: item.range?.long ?? null,
    ac_base: item.armor_class?.base ?? null,
    ac_add_dex_modifier: item.armor_class?.dex_bonus ?? false,
    ac_max_dex_bonus: item.armor_class?.max_bonus ?? null,
    strength_minimum: item.str_minimum ?? null,
    stealth_disadvantage: item.stealth_disadvantage ?? false,
    cost_quantity: item.cost?.quantity ?? null,
    cost_unit: item.cost?.unit ?? null,
    weight_lb: item.weight ?? null,
    properties: (item.properties ?? []).map(p => p.index),
    raw_json: item,
  }
  return equipmentRowSchema.parse(row)  // throws if invalid
}

// 3. Run — validates all, reports errors, upserts clean rows
export async function importEquipment(supabase, { ruleset = '2014', dryRun = false } = {}) {
  const results = { total: 0, success: 0, skipped: 0, errors: [] }

  for (const item of equipmentJson) {
    results.total++
    try {
      const row = equipmentJsonToRow(item, ruleset)
      if (!dryRun) {
        const { error } = await supabase
          .from('reference_equipment')
          .upsert(row, { onConflict: 'ruleset,source_index' })
        if (error) throw error
      }
      results.success++
    } catch (e) {
      results.errors.push({ index: item.index, error: e.message })
      results.skipped++
    }
  }

  return results
}
```

Key properties of this pattern:
- **Zod validates every row before insert** — bad data never reaches the DB
- **`dryRun` mode** — validates without writing, useful for previewing before committing
- **Upsert with conflict resolution** — safe to re-run; won't create duplicates
- **Structured return** — caller knows exactly what succeeded and what failed
- **Self-contained** — no shared mutable state between importers

---

#### Step 2 — Central import runner

```javascript
// scripts/srd-import.mjs
// Run with: node scripts/srd-import.mjs --category=equipment --ruleset=2014 --dry-run

import { importEquipment } from '../shared/lib/reference/importers/importEquipment.js'
import { importMagicItems } from '../shared/lib/reference/importers/importMagicItems.js'
// ... etc.

const IMPORTERS = {
  spells: importSpells,
  monsters: importMonsters,
  conditions: importConditions,
  classes: importClasses,
  subclasses: importSubclasses,
  races: importRaces,
  traits: importTraits,
  backgrounds: importBackgrounds,
  equipment: importEquipment,
  'magic-items': importMagicItems,
  proficiencies: importProficiencies,
  skills: importSkills,
  languages: importLanguages,
  'damage-types': importDamageTypes,
  features: importFeatures,
}

// Parse CLI args: --category, --ruleset, --dry-run
const category = args.category ?? 'all'
const ruleset = args.ruleset ?? '2014'
const dryRun = args['dry-run'] ?? false

const toRun = category === 'all' ? Object.entries(IMPORTERS) : [[category, IMPORTERS[category]]]

for (const [name, importer] of toRun) {
  console.log(`\nImporting ${name} (ruleset: ${ruleset}, dry-run: ${dryRun})...`)
  const result = await importer(supabase, { ruleset, dryRun })
  console.log(`  ✓ ${result.success}/${result.total} imported`)
  if (result.errors.length) {
    console.log(`  ✗ ${result.errors.length} errors:`)
    result.errors.forEach(e => console.log(`    - ${e.index}: ${e.error}`))
  }
}
```

Add to `dm/package.json`:
```json
"scripts": {
  "srd:import": "node ../scripts/srd-import.mjs",
  "srd:dry-run": "node ../scripts/srd-import.mjs --dry-run"
}
```

---

#### Step 3 — SRD Import Manager in the DM Builder

A new section in the builder (alongside Sessions, Stat Blocks, Spells, etc.): **Reference Library**.

Two sub-views:

**Import Status Dashboard** — shows the state of each reference category:

| Category | Count | Last Imported | Ruleset | Action |
|---|---|---|---|---|
| Spells | 1,804 | Apr 12 2026 | 2014 | Re-import |
| Monsters | 2,388 | Apr 12 2026 | 2014 | Re-import |
| Equipment | 0 | Never | — | Import |
| Magic Items | 0 | Never | — | Import |
| Classes | 0 | Never | — | Import |

**Import Controls:**
- Per-category "Import" button triggers the relevant importer via a Supabase Edge Function
- "Import All" button runs the full pipeline
- "Dry Run" toggle: validate without writing
- Live progress: rows processed / total, error count
- Error log: expandable list of failed rows with reason

**Supabase tracking table:**
```sql
CREATE TABLE srd_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,          -- 'equipment'
  ruleset text NOT NULL,           -- '2014'
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_rows integer,
  success_rows integer,
  error_rows integer,
  errors jsonb,                    -- array of {index, error}
  dry_run boolean DEFAULT false
);
```

This table powers the Import Status Dashboard — query `MAX(completed_at)` and `success_rows` per category.

---

#### Adding a New Category Later

When the 2024 SRD extends feats, or a new homebrew dataset needs importing:

1. Create `shared/lib/reference/importers/importNewCategory.js` following the pattern above
2. Write the Zod schema matching the new reference table
3. Create the migration for the new reference table
4. Register the importer in `scripts/srd-import.mjs`
5. The Import Manager UI picks it up automatically

That's the entire process. No changes to existing code.

---

## Implementation Order

### Phase 1 — Foundation (do first)
1. Create migrations for `reference_classes`, `reference_class_features`, `reference_subclasses`, `reference_races`, `reference_traits`
2. Write importers for all five
3. Run import via CLI script
4. Upgrade character editor to use class/subclass/race pickers

### Phase 2 — Equipment & Items
1. Create migrations for `reference_equipment`, `reference_magic_items`
2. Write importers
3. Add equipment picker to character editor
4. Add magic item award panel to runtime

### Phase 3 — Reference Browser
1. Import `reference_backgrounds`, `reference_proficiencies`, `reference_languages`, `reference_skills`, `reference_damage_types`
2. Build Reference Library section in builder with read-only browsing tabs
3. Build SRD Import Manager UI

### Phase 4 — 2024 Data
1. Re-run all importers with `--ruleset=2024`
2. Add ruleset toggle to the builder UI (show 2014 or 2024 rules text)

---

## What the App Looks Like After This

The DM opens the builder to create a new PC for an NPC. They pick **Human Fighter 5 / Battle Master**. The app:
- Loads Fighter proficiencies (all armour, shields, all weapons)
- Grants CON and STR saving throw proficiencies
- Shows features gained at levels 1–5 (Second Wind, Action Surge, Extra Attack, Combat Superiority)
- Adds Battle Master maneuvers picker at level 3
- Pulls background (Soldier) → adds Athletics and Perception skill proficiencies
- Shows starting equipment picker from SRD equipment list
- Lets DM search magic items to award (e.g., Gauntlets of Ogre Power)

All from existing SRD data sitting in `docs/`. No new data entry required.

---

*Written: April 2026. Based on full exploration of 5e-database-main (10,390+ entities), 5e-srd-api-main, and existing app integration at shared/lib/reference/ and supabase/schema.sql.*
