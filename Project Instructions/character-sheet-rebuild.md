# Green Hunger — Character Sheet Rebuild

This document specifies how to rebuild the player character sheet so that all data flows from Supabase instead of from hardcoded constants. It is written for Cursor and covers every file that needs to change, the exact shape of the new data layer, the computation model, and the migration path from the current hardcoded state.

---

## The Problem

Character data currently has two sources in tension:

1. **`shared/content/playerCharacters.js`** — a file with four complete character objects (Dorothea, Kanan, Danil, Ilya), hardcoded in full: every ability modifier, every skill modifier, every saving throw, spell attack bonus, spell save DC, passive score, proficiency bonus. 72 skill modifiers, 24 saving throw modifiers, and a dozen derived stat values — all manually entered and none linked to the underlying numbers.

2. **Supabase `characters` table** — the DB already has all the right columns: `ability_scores`, `saving_throws`, `skills`, `stats`, `features`, `weapons`, `spell_slots`, etc. Data loaded from here correctly.

The loader in `dataSlice.js` merges these — if a DB row exists, it takes precedence, but `playerCharacters.js` is the fallback. In practice the DB rows exist for all four characters, so the hardcoded file is rarely the actual source — but the hardcoded file was used to populate the DB in the first place, so both contain the same bad data: pre-computed derived values that will silently desynchronise if a character levels up, changes equipment, or gains a proficiency.

**The root cause:** The `characters` table stores derived values (skill mods, save mods, passive scores, spell attack, spell save DC) instead of only the raw inputs needed to compute them (ability scores, which saves/skills are proficient, level, spellcasting ability). When a character levels up in the DB, proficiency bonus changes — but the 18 skill modifiers stored alongside it do not update automatically.

**The fix:** Store only raw values in the DB. Compute all derived values in a single client-side function when the character loads. Remove the hardcoded file as a data source.

---

## What Changes and What Doesn't

### Does NOT change
- The `characters` table column names
- The `character_states` table (live HP, conditions, spell slots — this is already correct)
- The component files (`StatsTab`, `SpellsTab`, `ActionsTab`, `FeaturesTab`, `EquipmentTab`, `CombatStrip`)
- The spell loading system (`character_spells` table + compendium)
- The Supabase Realtime subscriptions
- The combat system

### DOES change
- The shape of data stored in the JSONB columns `ability_scores`, `saving_throws`, `skills`, `stats` — simplified to raw inputs only
- `dataSlice.js` — removes the `playerCharacters.js` fallback; adds the computation step after loading
- A new file: `shared/lib/character/computeCharacterSheet.js` — the single place all derived values are calculated
- `SheetEditTab.jsx` — simplified to only allow editing raw inputs, not derived values
- `shared/content/playerCharacters.js` — demoted from primary data source to a one-time seed file only

---

## The Computation Model

### Raw inputs (stored in DB)

These are the only values that need to be stored. Everything else is derived from them.

```javascript
// Raw inputs — what the DB stores (simplified)
{
  // Identity
  id, name, class, subclass, level,
  species, background, player, isNPC,
  image, colour, senses, languages, backstory,

  // Ability scores — SCORE only, not modifier
  abilityScores: {
    STR: 16,   // integer score
    DEX: 12,
    CON: 14,
    INT: 10,
    WIS: 13,
    CHA: 18
  },

  // Saving throw proficiencies — boolean flags only
  savingThrowProficiencies: {
    STR: false, DEX: false, CON: false,
    INT: false, WIS: false, CHA: true
  },

  // Skill proficiencies — objects with proficient and expertise flags
  skillProficiencies: [
    { name: 'Acrobatics',     ability: 'DEX', proficient: false, expertise: false },
    { name: 'Animal Handling', ability: 'WIS', proficient: false, expertise: false },
    { name: 'Arcana',         ability: 'INT', proficient: false, expertise: false },
    { name: 'Athletics',      ability: 'STR', proficient: false, expertise: false },
    { name: 'Deception',      ability: 'CHA', proficient: true,  expertise: true  },
    // ... all 18 skills
  ],

  // Spellcasting configuration (null for non-casters)
  spellcastingAbility: 'CHA',      // null if not a caster

  // AC breakdown (to support different armour types)
  acConfig: {
    base: 13,                        // base armour AC
    addDex: true,                    // add DEX modifier?
    maxDex: null,                    // null = no cap, number = capped (e.g. medium armour = 2)
    shield: false,                   // +2 for shield?
    magicBonus: 0                    // +X from magical armour
  },

  // Things that don't compute automatically
  spellSlots: { 1: {max:4}, 2: {max:3}, 3: {max:2} },
  sorceryPoints: { max: 4 },
  features: [ { name, uses, description } ],
  weapons: [ { name, hit, damage, notes } ],
  healingActions: [ { name, dice, action, target, note } ],
  buffActions: [ { name, die, maxUses, perRest, target } ],
  equipment: [ 'string' ],
  magicItems: [ { name, description } ],
}
```

### Derived values (computed from raw inputs)

```javascript
// What computeCharacterSheet() produces — NEVER stored in DB
{
  // From level
  proficiencyBonus: 2,              // ceil(level/4) + 1 — standard 5e table

  // From ability scores
  abilityModifiers: {
    STR: +3, DEX: +1, CON: +2,
    INT:  0, WIS: +1, CHA: +4
  },

  // From abilityModifiers + proficiencyBonus + savingThrowProficiencies
  savingThrows: [
    { name: 'STR', ability: 'STR', mod: +3, proficient: false },
    { name: 'DEX', ability: 'DEX', mod: +1, proficient: false },
    { name: 'CON', ability: 'CON', mod: +2, proficient: false },
    { name: 'INT', ability: 'INT', mod:  0, proficient: false },
    { name: 'WIS', ability: 'WIS', mod: +1, proficient: false },
    { name: 'CHA', ability: 'CHA', mod: +6, proficient: true },  // +4 + 2 prof
  ],

  // From skillProficiencies + abilityModifiers + proficiencyBonus
  skills: [
    { name: 'Acrobatics',  ability: 'DEX', mod: +1, proficient: false, expertise: false },
    { name: 'Deception',   ability: 'CHA', mod: +8, proficient: true,  expertise: true  }, // +4 + (2×2 exp)
    // ...
  ],

  // From skills
  passiveScores: {
    perception:    11,   // 10 + Perception mod
    insight:       11,   // 10 + Insight mod
    investigation: 10,   // 10 + Investigation mod
  },

  // From spellcastingAbility + abilityModifiers + proficiencyBonus
  spellAttack: '+6',     // spellMod + proficiencyBonus, formatted as string
  spellSaveDC: 14,       // 8 + spellMod + proficiencyBonus

  // From acConfig + abilityModifiers
  ac: 14,                // base(13) + DEX(1, uncapped) = 14

  // From level
  hitDice: 'd6',         // mapped from class name
  maxHp: 28,             // stored or computed: (hitDice avg + CON mod) × level
}
```

---

## New File: computeCharacterSheet.js

**Location:** `shared/lib/character/computeCharacterSheet.js`

This is the single source of truth for all derived values. Called once when a character is loaded from the DB. Returns the full character object ready for the components.

```javascript
// shared/lib/character/computeCharacterSheet.js

import { SKILL_LIST } from '../rules/catalog/skillsIndex.js'
import { CLASS_HIT_DICE } from '../rules/catalog/classHitDice.js'

/**
 * Calculate proficiency bonus from character level.
 * Standard 5e table: levels 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6
 */
export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

/**
 * Calculate ability modifier from raw ability score.
 * Standard 5e formula: floor((score - 10) / 2)
 */
export function getAbilityModifier(score) {
  return Math.floor((score - 10) / 2)
}

/**
 * Format a modifier as a signed string: +3, -1, +0
 */
export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/**
 * Compute all derived character sheet values from raw DB inputs.
 * This function must never be called with undefined — all inputs must be present.
 *
 * @param {object} raw - The raw character object from the DB (after column mapping)
 * @returns {object} - The full character object with all derived values attached
 */
export function computeCharacterSheet(raw) {
  const level = raw.level ?? 1
  const profBonus = getProficiencyBonus(level)

  // Ability scores → modifiers
  const scores = raw.abilityScores ?? {}
  const mods = {}
  for (const [ability, score] of Object.entries(scores)) {
    mods[ability] = getAbilityModifier(typeof score === 'object' ? score.score : score)
  }

  // Saving throws
  const saveProfs = raw.savingThrowProficiencies ?? {}
  const savingThrows = ['STR','DEX','CON','INT','WIS','CHA'].map(ability => ({
    name: ability,
    ability,
    mod: mods[ability] + (saveProfs[ability] ? profBonus : 0),
    proficient: !!saveProfs[ability],
  }))

  // Skills — use SKILL_LIST canonical order (18 skills)
  const skillProfs = indexSkillProficiencies(raw.skillProficiencies ?? [])
  const skills = SKILL_LIST.map(({ name, ability }) => {
    const prof = skillProfs[name] ?? { proficient: false, expertise: false }
    const abilityMod = mods[ability] ?? 0
    const bonus = prof.expertise
      ? profBonus * 2
      : prof.proficient
      ? profBonus
      : 0
    return {
      name,
      ability,
      mod: abilityMod + bonus,
      proficient: prof.proficient,
      expertise: prof.expertise,
    }
  })

  // Passive scores (always Perception, Insight, Investigation — others optional)
  const findSkillMod = (skillName) =>
    skills.find(s => s.name === skillName)?.mod ?? 0
  const passiveScores = {
    perception:    10 + findSkillMod('Perception'),
    insight:       10 + findSkillMod('Insight'),
    investigation: 10 + findSkillMod('Investigation'),
  }

  // Spellcasting
  const spellcastingAbility = raw.spellcastingAbility ?? null
  const spellMod = spellcastingAbility ? (mods[spellcastingAbility] ?? 0) : 0
  const spellAttack = spellcastingAbility ? formatModifier(spellMod + profBonus) : null
  const spellSaveDC = spellcastingAbility ? 8 + spellMod + profBonus : null

  // AC
  const acConfig = raw.acConfig ?? { base: 10, addDex: true, maxDex: null, shield: false, magicBonus: 0 }
  const dexMod = mods['DEX'] ?? 0
  const dexContribution = acConfig.addDex
    ? (acConfig.maxDex != null ? Math.min(dexMod, acConfig.maxDex) : dexMod)
    : 0
  const ac = acConfig.base + dexContribution + (acConfig.shield ? 2 : 0) + (acConfig.magicBonus ?? 0)

  // Hit dice from class
  const hitDice = CLASS_HIT_DICE[raw.class?.toLowerCase()] ?? 'd8'

  // Assemble complete character object
  return {
    // Pass through all raw fields
    ...raw,

    // Override with computed values
    proficiencyBonus: formatModifier(profBonus),
    abilityModifiers: mods,
    savingThrows,
    skills,
    passiveScores,
    spellAttack,
    spellSaveDC,
    ac,
    hitDice,

    // Keep the raw spellcastingAbility for display
    spellcastingAbility,

    // Keep stats object for anything not covered above
    stats: {
      ...(raw.stats ?? {}),
      proficiencyBonus: formatModifier(profBonus),
      spellAttack,
      spellSaveDC,
      spellcastingAbility,
      ac,
      // maxHp and speed come from raw.stats — not computed
    },
  }
}

// Index skill proficiencies by name for O(1) lookup
function indexSkillProficiencies(skillProficiencies) {
  const index = {}
  for (const s of skillProficiencies) {
    index[s.name] = { proficient: s.proficient, expertise: s.expertise }
  }
  return index
}
```

---

## New File: classHitDice.js

**Location:** `shared/lib/rules/catalog/classHitDice.js`

```javascript
export const CLASS_HIT_DICE = {
  barbarian: 'd12',
  fighter: 'd10', paladin: 'd10', ranger: 'd10',
  bard: 'd8', cleric: 'd8', druid: 'd8', monk: 'd8', rogue: 'd8', warlock: 'd8',
  sorcerer: 'd6', wizard: 'd6',
}
```

---

## Changes to dataSlice.js

**File:** `players/src/stores/playerStore/dataSlice.js`

### Change 1 — Remove the playerCharacters.js fallback

Find the fallback import and usage:

```javascript
// REMOVE this import entirely
import { PLAYER_CHARACTERS } from '@shared/content/playerCharacters.js'

// REMOVE any usage like:
// const fallbackChar = PLAYER_CHARACTERS.find(c => c.id === id)
// or
// const roster = dbRows.length > 0 ? dbRows : PLAYER_CHARACTERS
```

The Supabase `characters` table is now the only source. If the table returns no rows, surface an error — do not fall back to hardcoded data.

### Change 2 — Add the computation step after loading from Supabase

In `loadCharacters()`, after the DB rows are mapped to character objects, run `computeCharacterSheet()` on each one:

```javascript
import { computeCharacterSheet } from '@shared/lib/character/computeCharacterSheet.js'

// After mapping DB columns to character shape:
const rawCharacters = charRows.map(row => mapDbRowToRawCharacter(row))

// Compute all derived values for each character
const characters = rawCharacters.map(raw => computeCharacterSheet(raw))
```

### Change 3 — Update mapDbRowToRawCharacter()

The column mapping function needs to read the new raw data shapes from the DB. Key changes:

```javascript
function mapDbRowToRawCharacter(row) {
  return {
    id: row.id,
    name: row.name,
    password: row.password,
    class: row.class,
    subclass: row.subclass,
    level: row.level ?? 1,
    species: row.species,
    background: row.background,
    player: row.player,
    isNPC: row.is_npc,
    isActive: row.is_active,
    assignedPcId: row.assigned_pc_id ?? null,
    image: row.image,
    colour: row.colour,
    senses: row.senses,
    languages: row.languages,
    backstory: row.backstory,

    // Raw ability scores — just the integer scores
    abilityScores: row.ability_scores ?? {},

    // Proficiency flags — NEW shape
    savingThrowProficiencies: row.saving_throw_proficiencies ?? {},
    skillProficiencies: row.skill_proficiencies ?? [],

    // Spellcasting
    spellcastingAbility: row.spellcasting_ability ?? row.stats?.spellcastingAbility ?? null,

    // AC configuration
    acConfig: row.ac_config ?? null,

    // Computed stat overrides — if DM has manually set values, respect them
    stats: row.stats ?? {},

    // Arrays
    spellSlots: row.spell_slots ?? {},
    sorceryPoints: row.sorcery_points ?? null,
    features: row.features ?? [],
    weapons: row.weapons ?? [],
    healingActions: row.healing_actions ?? [],
    buffActions: row.buff_actions ?? [],
    equipment: row.equipment ?? [],
    magicItems: row.magic_items ?? [],
    homebrew_json: row.homebrew_json ?? {},
  }
}
```

---

## Database Changes

### Migration: Normalise character JSONB columns

**File:** `supabase/migrations/[timestamp]_normalise_character_raw_inputs.sql`

Add new columns for the normalised raw inputs. Keep the old columns — they will be populated with the new shape during the data migration.

```sql
-- New columns for clean raw inputs
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS saving_throw_proficiencies jsonb,
  ADD COLUMN IF NOT EXISTS skill_proficiencies jsonb,
  ADD COLUMN IF NOT EXISTS spellcasting_ability text,
  ADD COLUMN IF NOT EXISTS ac_config jsonb;

-- Update existing columns to document their new expected shape
COMMENT ON COLUMN characters.ability_scores IS
  'Raw ability scores as integers: {"STR": 16, "DEX": 12, ...}. Modifiers are computed client-side.';

COMMENT ON COLUMN characters.saving_throw_proficiencies IS
  'Which saves are proficient: {"STR": false, "DEX": false, "CON": false, "INT": false, "WIS": false, "CHA": true}';

COMMENT ON COLUMN characters.skill_proficiencies IS
  'Array: [{name, ability, proficient, expertise}]. Modifiers are computed client-side.';

COMMENT ON COLUMN characters.ac_config IS
  'AC breakdown: {base, addDex, maxDex, shield, magicBonus}. Final AC computed client-side.';
```

### Data migration: Backfill from existing characters

For each existing character, extract the proficiency flags from the current `saving_throws` and `skills` JSONB arrays (which have `proficient` booleans) and write them to the new columns.

```sql
-- Backfill saving_throw_proficiencies from existing saving_throws array
UPDATE characters
SET saving_throw_proficiencies = (
  SELECT jsonb_object_agg(
    elem->>'name',
    (elem->>'proficient')::boolean
  )
  FROM jsonb_array_elements(saving_throws) AS elem
)
WHERE saving_throw_proficiencies IS NULL
  AND saving_throws IS NOT NULL;

-- Backfill skill_proficiencies from existing skills array
UPDATE characters
SET skill_proficiencies = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', elem->>'name',
      'ability', elem->>'ability',
      'proficient', (elem->>'proficient')::boolean,
      'expertise', coalesce((elem->>'expertise')::boolean, false)
    )
  )
  FROM jsonb_array_elements(skills) AS elem
)
WHERE skill_proficiencies IS NULL
  AND skills IS NOT NULL;

-- Backfill spellcasting_ability from stats->>'spellcastingAbility'
UPDATE characters
SET spellcasting_ability = stats->>'spellcastingAbility'
WHERE spellcasting_ability IS NULL
  AND stats ? 'spellcastingAbility';

-- Backfill ability_scores to use integer scores (not {score, mod} objects)
-- Only needed if ability_scores stores {score: 16, mod: 3} objects
UPDATE characters
SET ability_scores = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value ? 'score' THEN (value->>'score')::int
      ELSE value::int
    END
  )
  FROM jsonb_each(ability_scores)
)
WHERE ability_scores IS NOT NULL;
```

Run this migration, then verify by checking a few characters:

```sql
SELECT id, name, saving_throw_proficiencies, skill_proficiencies, spellcasting_ability
FROM characters
LIMIT 5;
```

---

## Changes to SheetEditTab.jsx

**File:** `players/src/components/tabs/SheetEditTab.jsx`

The SheetEditTab currently lets the player edit skill modifiers and save modifiers directly. After this rebuild, it only exposes raw inputs — the modifiers are displayed as read-only computed values.

### Fields to KEEP as editable
- name, class, subclass, level
- species, background
- languages, senses, backstory
- stats.maxHp, stats.speed
- Ability scores (STR, DEX, CON, INT, WIS, CHA) — the integer score
- Which saves are proficient (6 checkboxes)
- Which skills are proficient / have expertise (18 rows, each with proficient + expertise checkboxes)
- spellcastingAbility (dropdown: STR/DEX/CON/INT/WIS/CHA/None)
- acConfig (base AC, add DEX checkbox, max DEX cap, shield checkbox, magic bonus)
- spellSlots (per level: max only — used count is tracked in character_states)
- sorceryPoints.max
- features[], weapons[], healingActions[], buffActions[], equipment[], magicItems[]

### Fields to REMOVE as editable (display as computed, read-only)
- stats.proficiencyBonus → show "(computed from level)"
- stats.spellAttack → show "(computed)"
- stats.spellSaveDC → show "(computed)"
- stats.ac → show "(computed from AC config)"
- Skill modifier numbers → show computed value next to each proficiency checkbox
- Save modifier numbers → show computed value next to each proficiency checkbox
- passiveScores → show computed values, read-only

### Updated form layout for abilities/saves/skills

```jsx
// Ability Scores section — edit raw score, show computed modifier alongside
<div className="ability-grid">
  {['STR','DEX','CON','INT','WIS','CHA'].map(ability => (
    <div key={ability} className="ability-field">
      <label>{ability}</label>
      <input
        type="number" min={1} max={30}
        value={form.abilityScores[ability] ?? 10}
        onChange={e => setAbilityScore(ability, parseInt(e.target.value))}
      />
      <span className="computed-mod">
        {formatModifier(getAbilityModifier(form.abilityScores[ability] ?? 10))}
      </span>
    </div>
  ))}
</div>

// Saving Throws — proficiency checkboxes + computed modifier display
<div className="saves-list">
  {['STR','DEX','CON','INT','WIS','CHA'].map(ability => {
    const isProficient = form.savingThrowProficiencies[ability] ?? false
    const abilityScore = form.abilityScores[ability] ?? 10
    const abilityMod = getAbilityModifier(abilityScore)
    const profBonus = getProficiencyBonus(form.level)
    const totalMod = abilityMod + (isProficient ? profBonus : 0)
    return (
      <div key={ability} className="save-row">
        <input
          type="checkbox"
          checked={isProficient}
          onChange={e => setSaveProficiency(ability, e.target.checked)}
        />
        <span className="computed-mod">{formatModifier(totalMod)}</span>
        <label>{ability} Save</label>
      </div>
    )
  })}
</div>

// Skills — proficient + expertise checkboxes + computed modifier display
<div className="skills-list">
  {SKILL_LIST.map(({ name, ability }) => {
    const skillProf = form.skillProficiencies.find(s => s.name === name) ?? {}
    const abilityMod = getAbilityModifier(form.abilityScores[ability] ?? 10)
    const profBonus = getProficiencyBonus(form.level)
    const bonus = skillProf.expertise ? profBonus * 2 : skillProf.proficient ? profBonus : 0
    const totalMod = abilityMod + bonus
    return (
      <div key={name} className="skill-row">
        <input type="checkbox" checked={!!skillProf.proficient}
          onChange={e => setSkillProficiency(name, ability, e.target.checked, skillProf.expertise)} />
        <input type="checkbox" checked={!!skillProf.expertise}
          onChange={e => setSkillProficiency(name, ability, skillProf.proficient, e.target.checked)} />
        <span className="computed-mod">{formatModifier(totalMod)}</span>
        <label>{name} <small>({ability})</small></label>
      </div>
    )
  })}
</div>
```

### The save function

When saving, write only the raw inputs. Do not compute modifiers before saving — they will be computed on load.

```javascript
async function handleSave() {
  const payload = {
    name: form.name,
    class: form.class,
    subclass: form.subclass,
    level: form.level,
    species: form.species,
    background: form.background,
    languages: form.languages,
    senses: form.senses,
    backstory: form.backstory,
    // Raw ability scores (integers only)
    ability_scores: form.abilityScores,
    // Proficiency flags (not modifiers)
    saving_throw_proficiencies: form.savingThrowProficiencies,
    skill_proficiencies: form.skillProficiencies,
    spellcasting_ability: form.spellcastingAbility,
    ac_config: form.acConfig,
    // Stats object — only non-computed values
    stats: {
      maxHp: form.stats.maxHp,
      speed: form.stats.speed,
      initiative: form.stats.initiative,
    },
    spell_slots: form.spellSlots,
    sorcery_points: form.sorceryPoints,
    features: form.features,
    weapons: form.weapons,
    healing_actions: form.healingActions,
    buff_actions: form.buffActions,
    equipment: form.equipment,
    magic_items: form.magicItems,
  }

  const { error } = await supabase
    .from('characters')
    .update(payload)
    .eq('id', form.id)

  if (error) {
    setStatus({ type: 'error', message: 'Save failed: ' + error.message })
    return
  }

  // Re-run computation locally to update the store immediately
  const updatedChar = computeCharacterSheet(mapPayloadToRaw(payload))
  updateCharacterInStore(updatedChar)
  setStatus({ type: 'success', message: 'Saved' })
}
```

---

## Changes to the DM Character Editor

**File:** `dm/src/features/characters/CharacterEditor.jsx`

The DM character editor must mirror the same changes as `SheetEditTab.jsx`:
- Edit raw ability scores, not modifiers
- Edit proficiency checkboxes, not modifier numbers
- Show computed values as read-only alongside each field
- Save only raw inputs

The save payload is identical to the player app save payload above.

---

## What Happens When a Character Levels Up

Old process: DM manually edits proficiency bonus, re-calculates 18 skill modifiers and 6 save modifiers by hand, updates spell attack, updates spell save DC. 7+ manual fields to update.

New process: DM increments `level` by 1 in the Character Editor. On next load, `computeCharacterSheet()` recalculates proficiency bonus, all 18 skill modifiers, all 6 save modifiers, spell attack, spell save DC, and passive scores automatically.

---

## What Happens to shared/content/playerCharacters.js

This file is not deleted immediately — it may be needed as a reference for data migration. After the DB backfill migration is confirmed working:

1. Remove the `import` of this file from `dataSlice.js`
2. Remove any usage of `PLAYER_CHARACTERS` as a fallback anywhere in the codebase
3. Add a comment to the file itself: `// DEPRECATED — used for initial DB seed only. Do not import.`
4. Delete the file in a subsequent cleanup commit

Do not keep it as a live fallback. If the DB has no characters, surface an error. The hardcoded file caused the desynchronisation problem — it should not remain as a safety net.

---

## Test Cases

After implementing, verify each of the following manually by loading the player app and checking the character sheet:

**Proficiency bonus:**
- [ ] Level 1–4 character shows `+2`
- [ ] Level 5–8 character shows `+3`
- [ ] Level 9–12 character shows `+4`

**Skill modifiers:**
- [ ] Non-proficient skill = ability modifier only
- [ ] Proficient skill = ability modifier + proficiency bonus
- [ ] Expertise skill = ability modifier + (proficiency bonus × 2)

**Saving throws:**
- [ ] Non-proficient save = ability modifier only
- [ ] Proficient save = ability modifier + proficiency bonus

**Spell stats:**
- [ ] Spell attack = spellcasting ability modifier + proficiency bonus, formatted as `+X`
- [ ] Spell save DC = 8 + spellcasting ability modifier + proficiency bonus

**AC:**
- [ ] Light armour + DEX: base + full DEX modifier
- [ ] Medium armour + DEX cap 2: base + min(DEX mod, 2)
- [ ] Heavy armour: base only, no DEX
- [ ] Shield: +2 to any of the above

**Passive scores:**
- [ ] Passive Perception = 10 + Perception skill modifier
- [ ] Passive Insight = 10 + Insight skill modifier
- [ ] Passive Investigation = 10 + Investigation skill modifier

**Level up simulation (DM raises level in editor, player refreshes):**
- [ ] Proficiency bonus updates
- [ ] All 18 skill modifiers update
- [ ] All 6 save modifiers update
- [ ] Spell attack and save DC update

---

## Implementation Order

Complete in this sequence — each step depends on the previous one being stable.

1. **Create `computeCharacterSheet.js` and `classHitDice.js`** — write and test the pure computation functions first, before touching any DB or components
2. **Write unit tests for `computeCharacterSheet.js`** — cover all the test cases above; these should pass before anything else changes
3. **Run the DB migration** — add new columns, backfill from existing data, verify with spot checks in Supabase dashboard
4. **Update `mapDbRowToRawCharacter()` in `dataSlice.js`** — map new column names; verify characters still load
5. **Add `computeCharacterSheet()` call in `dataSlice.js`** — run after mapping; verify computed values appear correctly
6. **Remove `playerCharacters.js` import and fallback** — verify app still loads; if it fails, diagnose why (a required field is missing from DB)
7. **Update `SheetEditTab.jsx`** — simplify to raw inputs + computed displays
8. **Update `CharacterEditor.jsx` in DM app** — same changes as SheetEditTab
9. **Smoke test all four characters** — load each one, check every field in StatsTab against expected values

Do not proceed to step 6 until steps 1–5 are confirmed working. Removing the fallback before the DB data is verified will break the app.

---

## Rules for Cursor

- `computeCharacterSheet()` is a **pure function** — no side effects, no async, no Supabase calls. It takes a raw object and returns a computed object. Test it independently.
- Never store computed values (skill mods, save mods, passive scores, spell attack, spell save DC) in the DB. If you find yourself writing a modifier to the `characters` table, stop — you're computing it wrong.
- `getAbilityModifier(score)` = `Math.floor((score - 10) / 2)` — this is the standard 5e formula and must never vary.
- `getProficiencyBonus(level)` = `Math.ceil(level / 4) + 1` — this is correct for levels 1–20 and matches the standard 5e table.
- The `character_states` table is not touched by this rebuild. Live HP, conditions, concentration, and active spell slots remain exactly as they are.
- Existing spell loading (from `character_spells` table + compendium merge) is not touched by this rebuild.
- All form components display computed values as **read-only** — they are never editable inputs.

---

*Written: April 2026. Based on full audit of players/src/components/tabs/, players/src/stores/playerStore/dataSlice.js, shared/content/playerCharacters.js, and supabase/schema.sql.*
