# Green Hunger — Content Entry System

This document specifies how to build a manual content entry system for the DM builder. It covers every entity type a DM needs to add — spells, feats, races, traits, equipment, magic items, class features, backgrounds, subclasses, and monsters — with a paste-and-parse flow that reads source book text and extracts structured data, plus manual entry forms for anything the parser can't capture.

The system is designed for:
- Pasting raw text copied from a PDF, digital sourcebook, or D&D Beyond
- Manually entering homebrew content field by field
- Editing any parsed result before saving
- Tagging content by source book so you always know where it came from

---

## Architecture Overview

### One unified entry point: the Content Library

Add a new top-level section to the builder nav: **Content Library**. This sits alongside Sessions, Stat Blocks, Spells, NPCs, Encounters, Characters.

The Content Library has a tab for each entity type. Each tab has three views:

1. **Browse** — searchable list of everything stored (SRD + custom)
2. **Paste & Parse** — textarea to paste raw source book text; auto-detects type, extracts fields, shows preview for review
3. **Manual Entry** — full form for the entity type; same form used for editing parsed results

### Storage

All content — SRD and custom — uses the same reference tables. Each table has a `source_type` field to distinguish origin:

| `source_type` value | Meaning |
|---|---|
| `srd-2014` | Official 5e SRD 2014 |
| `srd-2024` | Official 5e SRD 2024 |
| `custom` | Homebrew created by the DM |
| `third-party` | Paid sourcebooks (Xanathar's, Tasha's, etc.) |

And a `source_book` text field: `"Player's Handbook"`, `"Xanathar's Guide to Everything"`, `"Homebrew"`, etc.

Add these two columns to all reference tables via migration:

```sql
-- Run for each reference table
ALTER TABLE reference_spells ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'srd-2014';
ALTER TABLE reference_spells ADD COLUMN IF NOT EXISTS source_book text NOT NULL DEFAULT 'SRD 5.1';

ALTER TABLE reference_monsters ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'srd-2014';
ALTER TABLE reference_monsters ADD COLUMN IF NOT EXISTS source_book text NOT NULL DEFAULT 'SRD 5.1';

ALTER TABLE reference_conditions ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'srd-2014';
ALTER TABLE reference_conditions ADD COLUMN IF NOT EXISTS source_book text NOT NULL DEFAULT 'SRD 5.1';

-- Repeat for all new reference tables created in srd-integration-plan.md
```

### Parser infrastructure location

All parsers live in `shared/lib/parsers/`. Follow the same pattern as the existing `parseStatBlock.js` and `parseSpell.js`.

```
shared/lib/parsers/
├── parseStatBlock.js        -- existing
├── parseSpell.js            -- existing
├── parseFeat.js             -- new
├── parseRace.js             -- new
├── parseTrait.js            -- new
├── parseBackground.js       -- new
├── parseClassFeature.js     -- new
├── parseEquipment.js        -- new
├── parseMagicItem.js        -- new
├── parseSubclass.js         -- new
└── detectContentType.js     -- new (auto-detects which parser to use)
```

---

## The Paste & Parse Flow

This is the same pattern used by `SessionImportModal.jsx` — paste → parse → preview → save — adapted for individual entity types.

### Step 1: Paste

The DM copies text from their sourcebook PDF or digital tool and pastes it into the textarea. The text can be messy — hyphenation artefacts, smart quotes, em-dashes, double spaces — the parsers handle all of this.

```
┌─────────────────────────────────────────────────────┐
│  Paste content from your sourcebook                 │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │  (paste raw text here)                         │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Content type: [Auto-detect ▾]  Source book: [___]  │
│                                                      │
│  [Parse]                                             │
└─────────────────────────────────────────────────────┘
```

**Content type selector:** Defaults to "Auto-detect" which calls `detectContentType(text)`. DM can override if detection is wrong.

**Source book field:** Free text. Pre-filled suggestions: "Player's Handbook", "Dungeon Master's Guide", "Xanathar's Guide to Everything", "Tasha's Cauldron of Everything", "Homebrew". Saved as `source_book`.

### Step 2: Parse & Preview

On "Parse", run `detectContentType(text)` (or use the manual selection), then run the appropriate parser. Show the parsed result as a populated form — every extracted field editable before saving.

```
┌─────────────────────────────────────────────────────┐
│  Parsed: Spell                          [Edit raw]  │
│                                                      │
│  Name: Silvery Barbs                                 │
│  Level: 1   School: Enchantment                     │
│  Casting time: 1 reaction                           │
│  Range: 60 feet   Duration: Instantaneous           │
│  Concentration: No   Ritual: No                     │
│  Components: V                                      │
│                                                      │
│  Description:                                        │
│  [When a creature you can see within 60 feet of     │
│   you succeeds on an attack roll, ability check,    │
│   or saving throw, you can use your reaction to     │
│   force the creature to reroll...]                  │
│                                                      │
│  Classes: Bard, Sorcerer, Wizard                    │
│                                                      │
│  [Save]   [Parse different type ▾]                  │
└─────────────────────────────────────────────────────┘
```

If parsing fails for a field, that field is left blank (not errored). The DM fills it in manually. Nothing is blocked on a parse failure.

### Step 3: Save

Calls the appropriate save function which writes to the relevant `reference_*` table with `source_type: 'third-party'` (or `'custom'` for homebrew) and `source_book` as set by the DM.

---

## Content Type Auto-Detection

**File:** `shared/lib/parsers/detectContentType.js`

Reads the first 300 characters of pasted text and applies heuristic rules:

```javascript
export function detectContentType(rawText) {
  const text = rawText.trim()
  const head = text.slice(0, 300).toLowerCase()

  // Spells: level + school on line 1 or 2, or "cantrip"
  if (/^\s*\d+(?:st|nd|rd|th)[- ]level\s+\w+/im.test(text)) return 'spell'
  if (/\bcantrip\b/i.test(head) && /\bcasting time\b/i.test(head)) return 'spell'

  // Stat blocks: Challenge rating line, ability score block
  if (/\bchallenge\b.*\d+/i.test(head)) return 'stat-block'
  if (/\bstr\b.*\bdex\b.*\bcon\b/i.test(head)) return 'stat-block'

  // Feats: "Prerequisite:" is the strongest signal
  if (/^prerequisite/im.test(text)) return 'feat'

  // Races / Species: "Age." or "Size." or "Speed." as section headings
  if (/^(age|size|speed|languages)\./im.test(text)) return 'race'

  // Traits: Short, no prerequisites, no level/school — check for racial trait markers
  if (/^traits?\b/im.test(text) && !/\bchallenge\b/i.test(text)) return 'trait'

  // Backgrounds: "Skill Proficiencies:" is definitive
  if (/\bskill proficiencies\b/i.test(head)) return 'background'

  // Magic items: "Requires Attunement" or "Wondrous Item" or "Magic Weapon"
  if (/\brequires attunement\b/i.test(head)) return 'magic-item'
  if (/\bwondrous item\b/i.test(head)) return 'magic-item'
  if (/\bmagic (weapon|armor|armour|ring|rod|staff|wand)\b/i.test(head)) return 'magic-item'

  // Equipment: cost in gp/sp/cp, weapon/armour category line
  if (/\b\d+\s*(gp|sp|cp)\b/i.test(head) && /\b(simple|martial|light|medium|heavy)\b/i.test(head)) return 'equipment'

  // Subclass: "Subclass Feature" or e.g. "Path of the Berserker"
  if (/subclass feature/i.test(head)) return 'subclass'

  // Class feature: mentions a level number + a known class name
  if (/\b(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\b/i.test(head)
      && /\blevel\s+\d+\b/i.test(head)) return 'class-feature'

  return 'unknown'  // DM must select manually
}
```

---

## Entity Parsers

### Existing parsers to keep

`parseStatBlock.js` and `parseSpell.js` already exist and work well. Do not rewrite them. The new entity parsers follow the same patterns.

---

### parseFeat.js

**Source book format (example — Sentinel feat from PHB):**
```
Sentinel
Prerequisite: 4th level or higher

You have mastered techniques to take advantage of every drop in any enemy's guard, gaining the following benefits:

• When you hit a creature with an opportunity attack, the creature's speed becomes 0 for the rest of the turn.
• Creatures provoke opportunity attacks from you even if they take the Disengage action before leaving your reach.
• When a creature within 5 feet of you makes an attack against a target other than you (and that target doesn't have this feat), you can use your reaction to make a melee weapon attack against the attacking creature.
```

**Fields to extract:**

| Field | Source | Notes |
|---|---|---|
| `name` | First non-blank line | Title case |
| `prerequisite` | Line starting with "Prerequisite:" | Strip the label; `null` if absent |
| `description` | Everything after the prerequisite (or after name if no prerequisite) | Preserve bullet points as newline-separated text |
| `ability_score_minimum` | Parse prerequisite for `{STR\|DEX\|...} \d+` | e.g. "Strength 13" → `{ability: 'STR', minimum: 13}` |
| `level_minimum` | Parse prerequisite for `\d+(?:st\|nd\|rd\|th) level` | e.g. "4th level" → `4`; `null` if absent |
| `class_requirement` | Parse prerequisite for class name | e.g. "Fighter" |

```javascript
// shared/lib/parsers/parseFeat.js

export function parseFeat(rawText) {
  const lines = cleanText(rawText).split('\n').filter(Boolean)
  const feat = {
    name: '',
    prerequisite: null,
    description: '',
    ability_score_minimum: null,
    level_minimum: null,
    class_requirement: null,
  }

  let i = 0
  feat.name = toTitleCase(lines[i++])

  // Look for prerequisite on lines 1-3
  while (i < Math.min(4, lines.length)) {
    const prereqMatch = lines[i].match(/^prerequisite[s]?:?\s*(.+)/i)
    if (prereqMatch) {
      feat.prerequisite = prereqMatch[1].trim()
      // Parse ability score minimum: "Strength 13"
      const abilityMatch = feat.prerequisite.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)/i)
      if (abilityMatch) {
        feat.ability_score_minimum = {
          ability: ABILITY_SHORT[abilityMatch[1].toLowerCase()],
          minimum: parseInt(abilityMatch[2])
        }
      }
      // Parse level minimum: "4th level"
      const levelMatch = feat.prerequisite.match(/(\d+)(?:st|nd|rd|th)[- ]level/i)
      if (levelMatch) feat.level_minimum = parseInt(levelMatch[1])
      // Parse class requirement
      const classMatch = feat.prerequisite.match(/\b(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\b/i)
      if (classMatch) feat.class_requirement = toTitleCase(classMatch[1])
      i++
      break
    }
    i++
  }

  // Everything remaining is the description
  feat.description = lines.slice(i).join('\n').trim()

  return feat
}
```

---

### parseRace.js

**Source book format (example — Tiefling from PHB):**
```
Tiefling

Ability Score Increase. Your Intelligence score increases by 1, and your Charisma score increases by 2.

Age. Tieflings mature at the same rate as humans but live a few years longer.

Alignment. Tieflings might not have an innate tendency toward evil...

Size. Tieflings are about the same size and build as humans. Your size is Medium.

Speed. Your base walking speed is 30 feet.

Darkvision. Thanks to your infernal heritage, you have superior vision in dark and dim conditions...

Hellish Resistance. You have resistance to fire damage.

Infernal Legacy. You know the thaumaturgy cantrip...

Languages. You can speak, read, and write Common and Infernal.
```

**Fields to extract:**

| Field | Source | Pattern |
|---|---|---|
| `name` | First line | Title case |
| `ability_bonuses` | "Ability Score Increase" section | Parse `{ability} score increases by {N}` per sentence |
| `age_description` | "Age." section | Full text |
| `alignment_description` | "Alignment." section | Full text |
| `size` | "Size." section | Extract `Tiny\|Small\|Medium\|Large` |
| `size_description` | "Size." section | Full text |
| `speed` | "Speed." section | Extract integer: `(\d+) feet` |
| `traits` | All other sections not matched above | Array of `{name, description}` |
| `languages` | "Languages." section | Full text; extract language names as array |
| `subraces` | Any sections starting with a subrace name | Array of `{name, description, ability_bonuses}` |

```javascript
// shared/lib/parsers/parseRace.js

const KNOWN_SECTIONS = ['ability score increase', 'age', 'alignment', 'size', 'speed', 'languages', 'darkvision']

export function parseRace(rawText) {
  const text = cleanText(rawText)
  const sections = splitIntoSections(text)  // Splits on "Name. Content" pattern
  const race = {
    name: '',
    ability_bonuses: [],
    age_description: null,
    alignment_description: null,
    size: 'Medium',
    size_description: null,
    speed: 30,
    traits: [],
    languages: [],
    language_description: null,
    subraces: [],
  }

  // First non-blank line is the name
  race.name = sections[0].name

  for (const section of sections.slice(1)) {
    const key = section.name.toLowerCase()

    if (key.includes('ability score')) {
      race.ability_bonuses = parseAbilityBonuses(section.desc)
      continue
    }
    if (key === 'age') { race.age_description = section.desc; continue }
    if (key === 'alignment') { race.alignment_description = section.desc; continue }
    if (key === 'size') {
      race.size_description = section.desc
      const m = section.desc.match(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/)
      if (m) race.size = m[1]
      continue
    }
    if (key === 'speed') {
      const m = section.desc.match(/(\d+)\s*feet/)
      if (m) race.speed = parseInt(m[1])
      continue
    }
    if (key === 'languages') {
      race.language_description = section.desc
      race.languages = extractLanguageNames(section.desc)
      continue
    }
    // Everything else is a racial trait
    race.traits.push({ name: section.name, description: section.desc })
  }

  return race
}

function parseAbilityBonuses(text) {
  const bonuses = []
  const patterns = [
    /your\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+score\s+increases\s+by\s+(\d+)/gi,
    /(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+\+(\d+)/gi,
  ]
  for (const pattern of patterns) {
    let m
    while ((m = pattern.exec(text)) !== null) {
      bonuses.push({ ability: ABILITY_SHORT[m[1].toLowerCase()], bonus: parseInt(m[2]) })
    }
  }
  return bonuses
}
```

---

### parseTrait.js

Racial traits and class features that appear as standalone entries:

```
Darkvision
You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.
```

**Fields:** `name` (first line), `description` (everything after), `trait_type` (detected from text: `'sense'` | `'resistance'` | `'feature'` | `'proficiency'` | `'spellcasting'`).

```javascript
export function parseTrait(rawText) {
  const lines = cleanText(rawText).split('\n').filter(Boolean)
  return {
    name: lines[0].trim(),
    description: lines.slice(1).join('\n').trim(),
    trait_type: detectTraitType(lines.slice(1).join(' ')),
  }
}

function detectTraitType(desc) {
  if (/\bsee in dim light\b|\bdarkvision\b|\btremorsense\b|\bblindsight\b/i.test(desc)) return 'sense'
  if (/\bresistance to\b/i.test(desc)) return 'resistance'
  if (/\byou (know|can cast|learn)\b.*\bspell\b/i.test(desc)) return 'spellcasting'
  if (/\bproficiency\b.*\bskill\b|\bgain proficiency\b/i.test(desc)) return 'proficiency'
  return 'feature'
}
```

---

### parseBackground.js

**Source book format:**
```
Acolyte

Skill Proficiencies: Insight, Religion
Tool Proficiencies: None
Languages: Two of your choice
Equipment: A holy symbol, a prayer book or prayer wheel, 5 sticks of incense, vestments, a set of common clothes, and a pouch containing 15 gp

Feature: Shelter of the Faithful
As an acolyte, you command the respect of those who share your faith...

Suggested Characteristics
Acolytes are shaped by their experience in temples or other religious communities...

d8  Personality Trait
1   I idolize a particular hero of my faith...
2   I can find common ground between the fiercest enemies...
```

**Fields to extract:**

| Field | Pattern |
|---|---|
| `name` | First non-blank line |
| `skill_proficiencies` | `Skill Proficiencies:\s*(.+)` → split on `, ` |
| `tool_proficiencies` | `Tool Proficiencies:\s*(.+)` |
| `language_choices` | `Languages:\s*(.+)` → detect "two of your choice" → `2` |
| `starting_equipment` | `Equipment:\s*(.+)` |
| `feature_name` | `Feature:\s*(.+)` first line |
| `feature_description` | Text after feature name until next section |
| `personality_traits` | Table after `Personality Trait` heading (d8 table) |
| `ideals` | Table after `Ideals` heading (d6 table) |
| `bonds` | Table after `Bonds` heading (d6 table) |
| `flaws` | Table after `Flaws` heading (d6 table) |

```javascript
export function parseBackground(rawText) {
  const text = cleanText(rawText)
  const bg = {
    name: '', skill_proficiencies: [], tool_proficiencies: [],
    language_choices: 0, language_notes: null, starting_equipment: null,
    feature_name: null, feature_description: null,
    personality_traits: [], ideals: [], bonds: [], flaws: [],
  }

  const lines = text.split('\n')
  bg.name = lines[0].trim()

  // Key-value property lines
  for (const line of lines) {
    const skillMatch = line.match(/^skill proficiencies?:\s*(.+)/i)
    if (skillMatch) {
      bg.skill_proficiencies = skillMatch[1].split(/,\s*/).map(s => s.trim().toLowerCase()).filter(s => s !== 'none')
    }
    const toolMatch = line.match(/^tool proficiencies?:\s*(.+)/i)
    if (toolMatch && !toolMatch[1].toLowerCase().includes('none')) {
      bg.tool_proficiencies = toolMatch[1].split(/,\s*/).map(s => s.trim())
    }
    const langMatch = line.match(/^languages?:\s*(.+)/i)
    if (langMatch) {
      bg.language_notes = langMatch[1]
      const choiceMatch = langMatch[1].match(/(\w+)\s+of your choice/i)
      if (choiceMatch) bg.language_choices = wordToNumber(choiceMatch[1])
    }
    const equipMatch = line.match(/^equipment:\s*(.+)/i)
    if (equipMatch) bg.starting_equipment = equipMatch[1]
  }

  // Feature
  const featureMatch = text.match(/^Feature:\s*(.+)\n([\s\S]+?)(?=\n\n[A-Z]|\nSuggested|$)/im)
  if (featureMatch) {
    bg.feature_name = featureMatch[1].trim()
    bg.feature_description = featureMatch[2].trim()
  }

  // d-tables (personality traits, ideals, bonds, flaws)
  bg.personality_traits = parseDTable(text, 'Personality Trait')
  bg.ideals = parseDTable(text, 'Ideal')
  bg.bonds = parseDTable(text, 'Bond')
  bg.flaws = parseDTable(text, 'Flaw')

  return bg
}

function parseDTable(text, heading) {
  const match = text.match(new RegExp(`${heading}s?\\s*\\n([\\s\\S]+?)(?=\\nd\\d|\\n[A-Z][a-z]+\\n|$)`, 'i'))
  if (!match) return []
  return match[1].split('\n')
    .filter(line => /^\d+\s+/.test(line))
    .map(line => line.replace(/^\d+\s+/, '').trim())
}
```

---

### parseClassFeature.js

**Source book format:**
```
Rage
Starting at 1st level, you can go into a rage as a bonus action.

While raging, you gain the following benefits if you aren't wearing heavy armor:

• You have advantage on Strength checks and Strength saving throws.
• When you make a melee weapon attack using Strength, you gain a bonus to the damage roll that increases as you gain levels as a barbarian, as shown in the Rage Damage column of the Barbarian table.
• You have resistance to bludgeoning, piercing, and slashing damage.

...

You can use this feature a number of times equal to the Rage Count shown for your barbarian level...
```

**Fields to extract:**

| Field | Pattern |
|---|---|
| `name` | First non-blank line |
| `level` | `\bat\s+(\d+)(?:st\|nd\|rd\|th)\s+level\b` or `\bstarting at (\d+)\b` |
| `class_name` | Known class names found in text (see list below) |
| `description` | Full text after name |
| `feature_type` | `'class'` \| `'subclass'` — 'subclass' if text mentions specific subclass names |
| `recharge` | `\b(short rest\|long rest\|recharges on a\|uses equal to)\b` |
| `uses_formula` | `equal to (your \w+ modifier\|your proficiency bonus)` |

```javascript
const CLASS_NAMES = ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard']

export function parseClassFeature(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').filter(Boolean)

  const feature = {
    name: lines[0].trim(),
    level: null,
    class_name: null,
    description: lines.slice(1).join('\n').trim(),
    feature_type: 'class',
    recharge: null,
    uses_formula: null,
  }

  // Level detection
  const levelMatch = text.match(/\b(?:at|starting at)\s+(\d+)(?:st|nd|rd|th)\s+level\b/i)
  if (levelMatch) feature.level = parseInt(levelMatch[1])

  // Class detection
  for (const cls of CLASS_NAMES) {
    if (new RegExp(`\\b${cls}\\b`, 'i').test(text)) {
      feature.class_name = cls
      break
    }
  }

  // Recharge
  if (/\blong rest\b/i.test(text)) feature.recharge = 'long-rest'
  else if (/\bshort rest\b/i.test(text)) feature.recharge = 'short-rest'

  return feature
}
```

---

### parseEquipment.js

**Source book format (weapon):**
```
Rapier
Martial Melee Weapon
Cost: 25 gp   Damage: 1d8 piercing   Weight: 2 lb.
Properties: Finesse
```

**Source book format (armour):**
```
Chain Mail
Heavy Armor
Cost: 75 gp   Armor Class (AC): 16   Strength: 15   Stealth: Disadvantage
Weight: 55 lb.
```

```javascript
export function parseEquipment(rawText) {
  const lines = cleanText(rawText).split('\n').filter(Boolean)
  const eq = {
    name: lines[0].trim(),
    equipment_category: null,
    weapon_category: null,
    weapon_range: null,
    damage_dice: null,
    damage_type: null,
    ac_base: null,
    ac_add_dex_modifier: false,
    ac_max_dex_bonus: null,
    strength_minimum: null,
    stealth_disadvantage: false,
    cost_quantity: null,
    cost_unit: null,
    weight_lb: null,
    properties: [],
  }

  // Category line: "Martial Melee Weapon", "Simple Ranged Weapon", "Heavy Armor"
  const categoryLine = lines[1] ?? ''
  if (/weapon/i.test(categoryLine)) {
    eq.equipment_category = 'weapon'
    eq.weapon_category = /martial/i.test(categoryLine) ? 'Martial' : 'Simple'
    eq.weapon_range = /ranged/i.test(categoryLine) ? 'Ranged' : 'Melee'
  } else if (/armor|armour/i.test(categoryLine)) {
    eq.equipment_category = 'armor'
  } else {
    eq.equipment_category = 'adventuring-gear'
  }

  const fullText = lines.join('\n')

  // Cost
  const costMatch = fullText.match(/cost:?\s*(\d+)\s*(gp|sp|cp)/i)
  if (costMatch) { eq.cost_quantity = parseInt(costMatch[1]); eq.cost_unit = costMatch[2].toLowerCase() }

  // Damage
  const dmgMatch = fullText.match(/damage:?\s*(\d+d\d+(?:\+\d+)?)\s+(\w+)/i)
  if (dmgMatch) { eq.damage_dice = dmgMatch[1]; eq.damage_type = dmgMatch[2].toLowerCase() }

  // AC
  const acMatch = fullText.match(/(?:armor class|ac):?\s*(\d+)/i)
  if (acMatch) eq.ac_base = parseInt(acMatch[1])

  // + DEX modifier
  if (/\+\s*dex\s+modifier/i.test(fullText)) eq.ac_add_dex_modifier = true
  const maxDexMatch = fullText.match(/max\s+(\d+)\s+dex/i)
  if (maxDexMatch) eq.ac_max_dex_bonus = parseInt(maxDexMatch[1])

  // Strength minimum
  const strMatch = fullText.match(/strength:?\s*(\d+)/i)
  if (strMatch) eq.strength_minimum = parseInt(strMatch[1])

  // Stealth disadvantage
  if (/stealth:?\s*disadvantage/i.test(fullText)) eq.stealth_disadvantage = true

  // Weight
  const weightMatch = fullText.match(/weight:?\s*(\d+(?:\.\d+)?)\s*lb/i)
  if (weightMatch) eq.weight_lb = parseFloat(weightMatch[1])

  // Properties
  const propMatch = fullText.match(/properties?:?\s*(.+)/i)
  if (propMatch) {
    eq.properties = propMatch[1].split(/,\s*/).map(p => p.trim().toLowerCase())
  }

  return eq
}
```

---

### parseMagicItem.js

**Source book format:**
```
Cloak of Elvenkind
Wondrous Item, Uncommon (requires attunement)

While you wear this cloak with its hood up, Wisdom (Perception) checks made to see you have disadvantage, and you have advantage on Dexterity (Stealth) checks made to hide, as the cloak's color shifts to camouflage you. Pulling the hood up or down requires an action.
```

```javascript
export function parseMagicItem(rawText) {
  const lines = cleanText(rawText).split('\n').filter(Boolean)
  const item = {
    name: lines[0].trim(),
    equipment_category: null,
    rarity: null,
    requires_attunement: false,
    attunement_conditions: null,
    description: '',
  }

  // Type/rarity line: "Wondrous Item, Uncommon (requires attunement by a spellcaster)"
  const typeLine = lines[1] ?? ''

  // Rarity
  const rarityMatch = typeLine.match(/\b(common|uncommon|rare|very rare|legendary|artifact)\b/i)
  if (rarityMatch) item.rarity = toTitleCase(rarityMatch[1])

  // Category
  if (/wondrous/i.test(typeLine)) item.equipment_category = 'wondrous-item'
  else if (/weapon/i.test(typeLine)) item.equipment_category = 'weapon'
  else if (/armor|armour/i.test(typeLine)) item.equipment_category = 'armor'
  else if (/ring/i.test(typeLine)) item.equipment_category = 'ring'
  else if (/rod/i.test(typeLine)) item.equipment_category = 'rod'
  else if (/staff/i.test(typeLine)) item.equipment_category = 'staff'
  else if (/wand/i.test(typeLine)) item.equipment_category = 'wand'
  else item.equipment_category = 'wondrous-item'

  // Attunement
  if (/requires attunement/i.test(typeLine)) {
    item.requires_attunement = true
    const condMatch = typeLine.match(/requires attunement\s*(?:by\s+(.+?))?(?:\)|$)/i)
    if (condMatch?.[1]) item.attunement_conditions = condMatch[1].trim()
  }

  // Description: everything after the type line
  item.description = lines.slice(2).join('\n').trim()

  return item
}
```

---

### parseSubclass.js

**Source book format:**
```
Path of the Berserker
Barbarian Subclass

For some barbarians, rage is a means to an end—that end being violence. The Path of the Berserker is a path of untrammeled fury...

Frenzy
Starting when you choose this path at 3rd level, you can go into a frenzy when you rage...
```

```javascript
export function parseSubclass(rawText) {
  const text = cleanText(rawText)
  const lines = text.split('\n').filter(Boolean)

  const subclass = {
    name: lines[0].trim(),
    class_name: null,
    flavor: null,
    description: null,
    features: [],  // Array of parseClassFeature results found in the text
  }

  // Class name from line 2 or from text
  for (const cls of CLASS_NAMES) {
    if (new RegExp(`\\b${cls}\\b`, 'i').test(text.slice(0, 200))) {
      subclass.class_name = toTitleCase(cls)
      break
    }
  }

  // Description: first paragraph before any feature sections
  const firstFeatureIdx = lines.findIndex((l, i) => i > 1 && /^[A-Z]/.test(l) && /\d+(?:st|nd|rd|th)\s+level/i.test(lines.slice(i, i+3).join(' ')))
  subclass.description = lines.slice(1, firstFeatureIdx > -1 ? firstFeatureIdx : undefined).join('\n').trim()

  // Extract features (everything that looks like a class feature)
  const featureBlocks = splitIntoFeatureBlocks(text)
  subclass.features = featureBlocks.map(parseClassFeature)

  return subclass
}
```

---

## Shared Parser Utilities

**File:** `shared/lib/parsers/parserUtils.js`

```javascript
// Normalise common PDF copy-paste artefacts
export function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")        // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"')         // Smart double quotes
    .replace(/[\u2013\u2014]/g, '—')         // En/em dashes to em dash
    .replace(/\u00AD/g, '')                  // Soft hyphens (PDF line-break artefacts)
    .replace(/-\n([a-z])/g, '$1')            // Rejoin hyphenated line breaks
    .replace(/[ \t]{2,}/g, ' ')             // Multiple spaces to one
    .trim()
}

// Split "Name. Description" sections (used by race, subclass parsers)
export function splitIntoSections(text) {
  const sections = []
  const lines = text.split('\n')
  let current = null

  for (const line of lines) {
    const sectionMatch = line.match(/^([A-Z][^.]+)\.\s+(.+)/)
    if (sectionMatch) {
      if (current) sections.push(current)
      current = { name: sectionMatch[1], desc: sectionMatch[2] }
    } else if (current) {
      current.desc += '\n' + line
    } else {
      sections.push({ name: line, desc: '' })
      current = null
    }
  }
  if (current) sections.push(current)
  return sections
}

// Title case a string
export function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

// Word numbers to integers ("Three" → 3)
export function wordToNumber(word) {
  const map = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 }
  return map[word.toLowerCase()] ?? parseInt(word) ?? null
}

// Short ability names
export const ABILITY_SHORT = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON',
  intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA'
}
```

---

## Manual Entry Forms

Every entity type has a manual entry form that opens pre-filled when parse results are available, or blank for new entries. All forms follow the existing UI patterns from `StatBlockEditor.jsx` and `NpcLibrary.jsx`.

### Established patterns to reuse

- **Input style:** dark background, rounded border, consistent padding — use `{...inputStyle}` already defined
- **Section headers:** `SectionDivider` component (uppercase, monospace)
- **Lists with add/remove:** Cards with `×` button, `+ Add [Item]` button at bottom
- **Validation:** Green/amber/red status message in form header
- **Tabs:** For entities with many fields — follow `StatBlockEditor` tab pattern
- **Save:** Explicit Save button + silent autosave 2.5s after last change

---

### Feat Form

**File:** `dm/src/features/reference/FeatForm.jsx`

**Fields:**
- Name (text input)
- Prerequisite (text input, placeholder: "e.g. 4th level, or Strength 13 or higher")
- Ability score minimum — dropdown (STR/DEX/CON/INT/WIS/CHA) + number input
- Level minimum — number input
- Class requirement — dropdown of class names
- Description (large textarea)
- Source book (text input)

---

### Race / Species Form

**File:** `dm/src/features/reference/RaceForm.jsx`

**Tabs:** Core | Traits | Subraces

**Core tab:**
- Name, Size (dropdown: Tiny/Small/Medium/Large), Speed (number)
- Ability Bonuses: list of `{ability: dropdown, bonus: number}` pairs with + Add
- Languages: multi-select from `reference_languages` + freeform "choose N" field
- Age and Alignment description (textareas)

**Traits tab:**
- List of `{name, description}` pairs (same `NameDescListField` used in stat blocks)
- Sensory traits (Darkvision, Tremorsense): tick boxes with range inputs

**Subraces tab:**
- List of subraces, each with:
  - Name
  - Ability Bonus overrides
  - Additional traits

---

### Background Form

**File:** `dm/src/features/reference/BackgroundForm.jsx`

**Sections:**
- Name
- Skill Proficiencies: multi-select from 18 skills
- Tool Proficiencies: text input
- Languages: "Choose N" number + specific languages picker
- Starting Equipment: textarea
- Feature Name + Feature Description (two separate fields)
- Personality Traits: list field (up to 8, one per row)
- Ideals: list field (up to 6)
- Bonds: list field (up to 6)
- Flaws: list field (up to 6)

---

### Class Feature Form

**File:** `dm/src/features/reference/ClassFeatureForm.jsx`

**Fields:**
- Feature Name
- Class (dropdown: 12 class names)
- Level gained (1–20 number input)
- Subclass (optional text — if filled, marks this as a subclass feature)
- Description (large textarea)
- Recharge (dropdown: None / Short Rest / Long Rest / Per Turn)
- Uses (number or formula text: "equal to your Proficiency Bonus")

---

### Equipment Form

**File:** `dm/src/features/reference/EquipmentForm.jsx`

**Tabs:** Core | Weapon | Armour | Other

**Core tab (all equipment):**
- Name
- Category (dropdown: Weapon / Armour / Adventuring Gear / Tool / Mount / Vehicle)
- Cost (number + unit dropdown: gp/sp/cp)
- Weight (number, lbs)

**Weapon tab (shown when category = Weapon):**
- Weapon Category (Simple / Martial)
- Range (Melee / Ranged)
- Damage Dice (text: `1d8`)
- Damage Type (dropdown from 13 damage types)
- Normal Range / Long Range (number inputs, for ranged weapons)
- Properties (multi-select: Ammunition, Finesse, Heavy, Light, Loading, Reach, Special, Thrown, Two-Handed, Versatile, Monk)
- Thrown Range (number inputs, if Thrown selected)
- Versatile Damage Dice (text, if Versatile selected)

**Armour tab (shown when category = Armour):**
- Armour Category (Light / Medium / Heavy / Shield)
- Base AC (number)
- Add DEX modifier (checkbox)
- Maximum DEX bonus (number, enabled when Add DEX is ticked)
- Strength requirement (number)
- Stealth Disadvantage (checkbox)

---

### Magic Item Form

**File:** `dm/src/features/reference/MagicItemForm.jsx`

**Fields:**
- Name
- Category (dropdown: Armour / Potion / Ring / Rod / Scroll / Staff / Wand / Weapon / Wondrous Item)
- Rarity (dropdown: Common / Uncommon / Rare / Very Rare / Legendary / Artifact)
- Requires Attunement (checkbox)
- Attunement Conditions (text, enabled when attuned: e.g. "by a spellcaster")
- Is Variant (checkbox: e.g. `+1 Sword` is a variant of `Magic Sword`)
- Description (large textarea — this is the main field; full rules text goes here)
- Source Book (text)

---

### Subclass Form

**File:** `dm/src/features/reference/SubclassForm.jsx`

**Tabs:** Core | Features

**Core tab:**
- Subclass Name
- Class (dropdown)
- Flavor text (e.g. "Primal Path", "Sacred Oath" — the archetype flavour name)
- Description (textarea)

**Features tab:**
- List of features, each using `ClassFeatureForm` fields inline
- Level is required per feature
- `+ Add Feature` button

---

### Spell Form (update existing)

The existing spell form in `SpellLibrary.jsx` already has most fields. Add:
- `source_type` selector (SRD / Third Party / Homebrew)
- `source_book` text input
- Full description textarea (currently may be truncated)
- Higher levels textarea

---

### Stat Block Form (update existing)

The existing `StatBlockEditor.jsx` is complete. Add:
- `source_type` selector
- `source_book` text input

---

## Builder UI Structure

### Content Library section

New top-level nav item in `BuilderLayout.jsx`: **Content Library**

**Tab structure within Content Library:**

```
Content Library
├── Spells
├── Monsters
├── Feats
├── Races & Species
├── Classes & Features
├── Backgrounds
├── Equipment
└── Magic Items
```

Each tab follows this layout:

```
┌── [Search bar] ─────────────── [Source: All ▾] [Type: All ▾] ──┐
│                                                                    │
│  [+ Add New]  [Paste & Parse]                                      │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Name                  Source      Type        Rarity/CR    │  │
│  │  ─────────────────────────────────────────────────────────  │  │
│  │  Sentinel              PHB         Feat         —           │  │
│  │  Tiefling              SRD 2014    Race         —           │  │
│  │  Chain Mail            SRD 2014    Heavy Armour —           │  │
│  │  Cloak of Elvenkind    PHB         Wondrous     Uncommon    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Clicking a row opens the edit form in a modal (same pattern as existing editors).

**Source filter options:** All / SRD 2014 / SRD 2024 / Player's Handbook / Third Party / Homebrew

---

## Storage: Migrations

Create one migration per new table. Each follows the same shape established by `reference_spells`.

**Migration file naming:** `[timestamp]_reference_[entity].sql`

```sql
-- Example: reference_feats
CREATE TABLE reference_feats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'srd-2014',
  source_book text NOT NULL DEFAULT 'SRD 5.1',
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  prerequisite text,
  ability_score_minimum jsonb,         -- {ability: 'STR', minimum: 13}
  level_minimum integer,
  class_requirement text,
  description text NOT NULL,
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
CREATE INDEX reference_feats_name_idx ON reference_feats USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));
```

```sql
-- reference_races
CREATE TABLE reference_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'srd-2014',
  source_book text NOT NULL DEFAULT 'SRD 5.1',
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  speed integer NOT NULL DEFAULT 30,
  size text NOT NULL DEFAULT 'Medium',
  size_description text,
  age_description text,
  alignment_description text,
  ability_bonuses jsonb,               -- [{ability: 'CON', bonus: 2}]
  starting_languages text[],
  language_description text,
  traits jsonb,                        -- [{name, description}]
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

```sql
-- reference_class_features
CREATE TABLE reference_class_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'srd-2014',
  source_book text NOT NULL DEFAULT 'SRD 5.1',
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  class_name text NOT NULL,
  subclass_name text,
  level integer,
  name text NOT NULL,
  description text NOT NULL,
  feature_type text NOT NULL DEFAULT 'class',
  recharge text,
  uses_formula text,
  raw_json jsonb,
  imported_at timestamptz DEFAULT now()
);
```

```sql
-- reference_backgrounds
CREATE TABLE reference_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'srd-2014',
  source_book text NOT NULL DEFAULT 'SRD 5.1',
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  skill_proficiencies text[],
  tool_proficiencies text[],
  language_choices integer DEFAULT 0,
  language_notes text,
  starting_equipment text,
  feature_name text,
  feature_description text,
  personality_traits jsonb,
  ideals jsonb,
  bonds jsonb,
  flaws jsonb,
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
```

```sql
-- reference_equipment
CREATE TABLE reference_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'srd-2014',
  source_book text NOT NULL DEFAULT 'SRD 5.1',
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  equipment_category text NOT NULL,
  weapon_category text,
  weapon_range text,
  damage_dice text,
  damage_type text,
  range_normal integer,
  range_long integer,
  ac_base integer,
  ac_add_dex_modifier boolean DEFAULT false,
  ac_max_dex_bonus integer,
  strength_minimum integer,
  stealth_disadvantage boolean DEFAULT false,
  cost_quantity integer,
  cost_unit text,
  weight_lb numeric,
  properties text[],
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
CREATE INDEX reference_equipment_name_idx ON reference_equipment(name);
CREATE INDEX reference_equipment_category_idx ON reference_equipment(equipment_category);
```

```sql
-- reference_magic_items
CREATE TABLE reference_magic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'srd-2014',
  source_book text NOT NULL DEFAULT 'SRD 5.1',
  ruleset text NOT NULL DEFAULT '2014',
  source_index text NOT NULL,
  name text NOT NULL,
  equipment_category text,
  rarity text,
  requires_attunement boolean DEFAULT false,
  attunement_conditions text,
  is_variant boolean DEFAULT false,
  variant_of_index text,
  description text NOT NULL,
  raw_json jsonb,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (ruleset, source_index)
);
CREATE INDEX reference_magic_items_name_idx ON reference_magic_items USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));
CREATE INDEX reference_magic_items_rarity_idx ON reference_magic_items(rarity);
```

---

## Store Functions

**File:** `dm/src/stores/campaignStore/referenceLibrarySlice.js`

```javascript
export const referenceLibrarySlice = (set, get) => ({
  // State
  referenceFeats: [],
  referenceRaces: [],
  referenceBackgrounds: [],
  referenceEquipment: [],
  referenceMagicItems: [],
  referenceClassFeatures: [],
  referenceLoading: false,

  // Load functions (called lazily when tab opens)
  loadReferenceFeats: async () => { /* supabase.from('reference_feats').select() */ },
  loadReferenceRaces: async () => { /* supabase.from('reference_races').select() */ },
  loadReferenceBackgrounds: async () => { /* ... */ },
  loadReferenceEquipment: async () => { /* ... */ },
  loadReferenceMagicItems: async () => { /* ... */ },
  loadReferenceClassFeatures: async (className) => { /* filtered by class_name */ },

  // Save functions (used by both paste-and-parse and manual entry)
  saveFeat: async (feat) => {
    const row = { ...feat, source_index: slugify(feat.name) }
    const { data, error } = await supabase.from('reference_feats')
      .upsert(row, { onConflict: 'ruleset,source_index' })
      .select().single()
    if (error) throw error
    set(s => ({ referenceFeats: upsertById(s.referenceFeats, data) }))
    return data
  },
  saveRace: async (race) => { /* same pattern */ },
  saveBackground: async (bg) => { /* same pattern */ },
  saveEquipment: async (eq) => { /* same pattern */ },
  saveMagicItem: async (item) => { /* same pattern */ },
  saveClassFeature: async (feature) => { /* same pattern */ },
})
```

---

## Implementation Order

### Phase 1 — Infrastructure (do first, everything depends on this)
1. Create all 6 new migrations (feats, races, class_features, backgrounds, equipment, magic_items)
2. Add `source_type` and `source_book` columns to existing reference tables
3. Create `shared/lib/parsers/parserUtils.js` (cleanText, splitIntoSections, toTitleCase, wordToNumber)
4. Create `shared/lib/parsers/detectContentType.js`
5. Create `referenceLibrarySlice.js` with load/save functions

### Phase 2 — Parsers
Build and test each parser independently. Each parser should have a corresponding test file:
1. `parseFeat.js` + `parseFeat.test.js`
2. `parseRace.js` + `parseRace.test.js`
3. `parseTrait.js` + `parseTrait.test.js`
4. `parseBackground.js` + `parseBackground.test.js`
5. `parseClassFeature.js` + `parseClassFeature.test.js`
6. `parseEquipment.js` + `parseEquipment.test.js`
7. `parseMagicItem.js` + `parseMagicItem.test.js`
8. `parseSubclass.js` + `parseSubclass.test.js`

**For each test file, include at minimum:**
- One well-formed input → verify all fields extracted correctly
- One input with missing optional fields → verify graceful defaults, no crash
- One input with PDF artefacts (soft hyphens, smart quotes, hyphenated line breaks) → verify cleanText handles them

### Phase 3 — Manual Entry Forms
Build each form component independently (no wiring to the store yet):
1. `FeatForm.jsx`
2. `RaceForm.jsx` (tabs: Core, Traits, Subraces)
3. `BackgroundForm.jsx`
4. `ClassFeatureForm.jsx`
5. `EquipmentForm.jsx` (tabs: Core, Weapon, Armour)
6. `MagicItemForm.jsx`
7. `SubclassForm.jsx`

### Phase 4 — Paste & Parse UI
1. Build the `PasteAndParsePanel.jsx` component (textarea, type selector, source book field, Parse button)
2. Wire `detectContentType` → correct parser → populate the matching form
3. Add "Edit raw" toggle that shows the original pasted text alongside the parsed form

### Phase 5 — Content Library Shell
1. Add Content Library to `BuilderLayout.jsx` nav
2. Build the browse list for each tab (search, source filter, type filter)
3. Connect forms to store save functions
4. Add edit-on-row-click behaviour

---

## Rules for Cursor

- Never overwrite existing `parseStatBlock.js` or `parseSpell.js` — the new parsers follow their pattern but live separately
- Parser functions must never throw on missing fields — use sensible defaults or `null`; validation is the form's job
- `cleanText()` must be called at the top of every parser before any regex runs
- Every save function uses `upsert` with `onConflict: 'ruleset,source_index'` — re-importing the same content is always safe
- `source_index` is always `slugify(name)` for custom/third-party content; slugify = lowercase, non-alphanumeric to `-`, trim leading/trailing dashes
- Forms must work for both parsed results (pre-filled) and blank manual entry
- All new forms follow existing `inputStyle`, `SectionDivider`, and `NameDescListField` patterns already in the codebase — do not introduce new styling systems
- The parser preview shows the raw parsed object as a populated form — never show raw JSON to the DM

---

*Written: April 2026. Grounded in existing parseStatBlock.js, parseSpell.js, StatBlockEditor.jsx, NpcLibrary.jsx, SpellLibrary.jsx, and SessionImportModal.jsx patterns.*
