# The Green Hunger — Session Writing Guide
## A reference document for Claude AI when drafting DM session guides

---

## What this is

This guide defines the exact format, structure, prose style, and content conventions for DM session guides in *The Green Hunger* campaign. Every session document must follow this format precisely — the DM console application parses these documents automatically to populate the session database, and deviations from the format will cause import errors or content loss.

Read this document in full before drafting any session. Do not invent new structural conventions. Do not use formatting not described here.

---

## Campaign context

*The Green Hunger* is a D&D 5e campaign set in the Weald of Sharp Teeth, an ancient and corrupted forest in Tethyr. Tone: slow dread, earned horror, moral weight. Not action-adventure. Not comedy.

**Core themes:** Corruption that reshapes rather than destroys. The cost of containment. Trust given and withheld. The question of what remains of a person when most of them is gone.

**Key figures:**
- **The Party** — Dorothea Flight (Bard), Kanan Black (Wizard), Danil Tanner (Sorcerer)
- **Ilya** — Human Cleric of Talona. Travelling with the party. Warm, methodical, useful, lying.
- **Birna** — Druid. Allied with the party. Partly compromised. Will not say so.
- **Artos** — Druid. Fragmented into the raven. Cannot speak. Can point.
- **Talona** — Divine force in arrested containment. The corruption is her pressure. She is not the antagonist in any simple sense.
- **Darcy, Damir** — Party members lost in the fracture. Remade by the corruption. Preserved rather than destroyed.

**The Green Mark** — A corruption mechanic. Players accumulate marks through exposure to corrupted environments, failed saves, and Talona's influence. Tracked numerically. Narratively significant at thresholds. Do not explain the mechanic to players explicitly — let it surface through consequences.

---

## Document structure

Every session document must contain these sections in this order:

```
1. Document header
2. Session structure table
3. Background — What the DM Knows
4. Scenes (numbered)
5. [Within each scene: beats, stat blocks, skill tables, outcome tables]
```

---

## Section 1 — Document header

```
THE GREEN HUNGER
DM Guide — Session [N]
Chapter [N]: [Title]
```

- "THE GREEN HUNGER" in all caps on its own line
- "DM Guide — Session [N]" using an em dash (—)
- "Chapter [N]: [Title]" where the chapter title is a short evocative phrase, not a description

**Examples of good chapter titles:** "Into the Heart", "The Thing That Was Held Back", "What the Raven Knew"
**Examples of bad chapter titles:** "Session Two Content", "The Party Fights Damir and Meets Ilya"

---

## Section 2 — Session structure table

A table immediately following the header, with exactly these columns:

| # | Scene | Purpose | Time | Notes |
|---|---|---|---|---|

- **#** — scene number (use `5a` / `5b` for branching paths)
- **Scene** — exact scene title as it will appear in the scene heading
- **Purpose** — 3–6 words describing the dramatic function (e.g. "Moral choice, first consequences")
- **Time** — estimated runtime as a range (e.g. "20–30 min")
- **Notes** — one brief DM instruction (e.g. "Let persuasion breathe.", "Do not tip the scales.")

Do not add extra columns. Do not use merged cells.

---

## Section 3 — Background

```
## Background — What the DM Knows
```

This section contains multi-paragraph DM-only context. It covers:
- Where the party ended the previous session (one sentence)
- What the players do not know (the critical information withheld from them)
- What NPCs know and are concealing
- What forces are in motion that the party cannot yet perceive

**Format rules:**
- Use "What the players do not know:" as a sub-label before each piece of withheld information
- Write in plain prose paragraphs, no bullets
- Do not use sub-headings within this section
- This section ends when the first `## Scene` heading begins

**Prose note:** Write this section in confident present tense, as though narrating events from slightly above the story. Not breathless. Not expository. "The raven splintered from the creature deliberately" — not "The raven had splintered from the creature deliberately, because it needed to..."

---

## Section 4 — Scenes

Each scene is a top-level heading using this exact format:

```
## Scene [N] — [Title]
```

Use an em dash (—), not a hyphen or en dash. Scene numbers are integers for standard scenes, letter-suffixed for branching paths (`5a`, `5b`).

**Scene body structure:**

A scene contains some combination of the following sub-sections (in roughly this order when all are present):

1. Opening description / narrative
2. Setup (for combat or exploration scenes)
3. Skill check table(s)
4. DM NOTE blocks
5. Stat block (for scenes with combat)
6. Outcomes table
7. Branch paths (for scenes with choices)

Not every scene needs all of these. A pure narrative scene may have only an opening description and DM notes.

---

## Sub-headings (beats)

All sub-headings within a scene use `###` (three hashes). This is critical — the import parser uses heading level to determine what is a beat vs what is a scene.

**Standard beat sub-headings:**

| Sub-heading | When to use |
|---|---|
| `### Opening Narrative` | First beat of any scene — the read-aloud description of what the party encounters |
| `### [Character Name]'s [X]` | Named beats for specific character actions or moments (e.g. "Birna's Send-Off", "Ilya's Boon") |
| `### The [X] Window` | For mechanics windows (e.g. "The Persuasion Window") |
| `### Setup` | For combat scenes — what triggers the encounter |
| `### Before Initiative` | NPC speech or action before a fight begins |
| `### Description — What They See` | Extended environmental or visual description |
| `### Raven Appearance — It [Helps/Hinders]` | Artos intervention beat. Always prefix with 🦅 emoji. |
| `### Rot Opportunity — [Location]` | Corruption risk beat tied to a specific location |
| `### If [Condition] Succeeds/Fails` | Decision beats |
| `### COMBAT` | Combat trigger beat |
| `### What They Can Find` | Investigation beat with enumerated discoveries |
| `### What They Can Learn` | Skill check information beat |
| `### Finding the [X]` | Exploration discovery beat |
| `### [Character Name] — Where [They Go/It Goes]` | NPC departure or consequence beat |
| `### Level Up` or `### Level Up & Close` | Final beat of a session |

**Do not invent new sub-heading conventions.** If a beat doesn't fit an existing pattern, use the closest existing one.

---

## Prose style — read-aloud content

Read-aloud content is text the DM reads directly to players. It appears as body paragraphs under narrative/description beats (not marked with any special prefix — just paragraph text).

**Rules for read-aloud prose:**

**Write in second person present tense.** "You are in a forest" not "The party finds themselves in a forest."

**Use sentence fragments deliberately.** Fragments create pace. "He is not what he was. The form that pulled itself upright from the churned earth is Darcy — the shape of him, at least." The second sentence anchors the fragment. This is intentional, not an error.

**Physical specificity over vague atmosphere.** "His hands are too long. His neck bends at an angle that should hurt." Not "He looks wrong and unsettling."

**Let wrongness be described precisely.** The corruption manifests in specific, observable ways. Name them. "The trees are bone-white, their bark stripped so cleanly it looks deliberate." Not "The trees look strange."

**Do not explain what the players should feel.** "The air feels oppressive" is telling them their emotional response. "The air does not move" is giving them information and letting them respond.

**Silence and absence are content.** "No birds. No insects. The forest is watching" is three beats of information. Use it.

**Paragraph rhythm:** Short sentences followed by a longer one. Or a very long sentence broken by dashes, followed by a short one. Do not write uniformly. "You hear it before you see it — a low, wet tearing, like bark splitting under pressure. The fungi at the path's edge are not growing. They are unfolding."

**Dialogue is sparse and precise.** NPCs do not monologue. They say the minimum required. "I know you," he says. "I remember. I—" and then stop. Incompleteness is character.

---

## Prose style — DM notes

DM notes are not read aloud. They are instructions, context, and decisions for the DM.

**Format:**

```
DM NOTE: [text]
```

Or for longer notes, a standalone paragraph beginning with `DM NOTE`. The colon is part of the format — do not use `DM NOTE —` or `Note:` or any variant.

**Rules for DM notes:**

**Be directive.** "Do not tell the players which path leads where." Not "The DM may wish to consider withholding this information."

**Use them for the things the DM needs to remember mid-scene.** Hidden agendas, timing cues, things players might ask about, things that would be easy to forget under table pressure.

**Flag Ilya specifically.** Whenever Ilya is present in a scene, include a DM NOTE about what he is actually doing, what he is concealing, and what it would cost to notice. His warmth is never incidental.

**Flag Birna's tells.** She is partially compromised. There are moments where her affect is wrong. Call them out precisely: "Birna's expression, just before she begins the suspension, is not grief. It is satisfaction. It passes quickly."

**Do not over-explain what the players will obviously understand.** DM notes are for subtext, mechanics, and timing — not for restating what the read-aloud already communicates.

---

## Skill check tables

Skill check tables appear under any beat where players can learn information through investigation, perception, or social interaction.

**Format — exactly this column structure:**

| Trigger | Skill / Save | DC | What They Learn |
|---|---|---|---|
| Examine the spiral | Investigation | 12 | The moss has been arranged. Recently. Something with intent made this. |
| Stand at the centre | Wisdom Save | 14 | On a fail: a voice — not heard, felt — says your character's name. Gain 1 Green Mark. |

**Rules:**

- **Trigger** — what the player does to attempt the check. Action verb. "Examine the wall", "Speak calmly", "Check for tracks". Not "If a player examines the wall".
- **Skill / Save** — the specific skill or save type. "Investigation", "Wisdom Save", "Charisma (Persuasion)", "Nature". Enough to be unambiguous.
- **DC** — integer only. No ranges.
- **What They Learn** — the specific information revealed on a success. Write it as DM-addressed facts the player can be told, not as "they learn that..." Avoid starting with "The player learns".
- Include a `—` (em dash) in the Skill column and `Auto` in the DC column when a result is automatic (no roll required).

**DC philosophy:** Easy information (10–12) rewards curiosity. Important information (13–16) rewards the right skills. Critical information (17+) should be rare. Green Mark risks are usually DC 13–14 Con saves.

---

## Outcome tables

Outcome tables appear at the end of scenes with branching consequences. They summarise what happens under each resolution.

**Format:**

| Outcome | Consequence |
|---|---|
| Darcy Persuaded — Birna Suspends | Talona retains foothold. Birna collects the knotted form. Party earns Birna's quiet approval. |
| Darcy Killed (Party) | Talona loses this foothold. The forest reacts. Birna is still. |

**Rules:**

- Outcomes are player actions or results, not abstract states
- Consequences are concrete: what changes in the world, what the party gains or loses, what NPCs do
- Always include the mechanically worst outcome and what it costs
- Do not soften consequences. If Talona retains a foothold, say so clearly.

---

## Stat blocks

Stat blocks appear under a specific sub-heading format:

```
### Stat Block — [Creature Name]
```

The creature name after the em dash must match the name used in the stat block body.

**Stat block format — use this exact sequence:**

```
[Creature Name]
[Size] [Type] ([Descriptor]), [Alignment] — Challenge [N] ([XP] XP)

STR     DEX     CON     INT     WIS     CHA
[N] (+N) [N] (+N) [N] (+N) [N] (+N) [N] (+N) [N] (+N)

AC: [N]
HP: [N] ([dice formula])
Speed: [N] ft.

Armour Class. [N] ([source])
Hit Points. [N] ([dice formula])
Speed. [N] ft.

[Saving Throws. ...]
[Skills. ...]
[Damage Resistances. ...]
[Damage Immunities. ...]
[Condition Immunities. ...]
Senses. [...]
[Languages. ...]

[TRAIT NAME]. [Description.]
[TRAIT NAME]. [Description.]

ACTIONS
[Action Name]. [Type]: [attack bonus] to hit, reach [N] ft., [target]. Hit: [N] ([formula]) [damage type] damage[plus additional].
```

Then:

```
Combat Description Prompts
On a hit: "[flavour text]"
On [special trigger]: "[flavour text]"
On death: "[flavour text]"
```

**Rules:**

- Every stat block must have at least 3 Combat Description Prompts: on a hit, one trigger-specific prompt, and on death
- Death descriptions are important. The death of a named character is a narrative moment. "He collapses. The green dims from his eyes slowly, like something stepping back through a door. His last expression is not pain. It is relief." — this is the standard.
- Include `DM NOTE` blocks after the stat block for key tactical or narrative information (e.g. what Ilya does during the fight)
- For boss encounters, include a section titled `### Before Initiative` with NPC speech/action before combat begins

---

## Raven appearances

The raven is Artos — a fragment of a druid's consciousness. It cannot speak or act directly. It can only point.

**Format:**

```
### Raven Appearance — It [Helps/Hinders]
🦅 [Description of what the raven does and what it means.]

DM NOTE: [What Artos is trying to communicate and why he fails or succeeds.]
```

**Rules:**

- Always use the 🦅 emoji at the start of the raven description
- The raven either helps (guides toward something useful) or hinders (tries to warn, fails to communicate)
- Always include a DM NOTE explaining what Artos intends vs what the party perceives
- The raven's limitations are the point. He cannot explain. He can only gesture. The tragedy is legible.

---

## Green Mark opportunities

These are moments where the corruption can infect a player character through physical contact, failed saves, or deliberate choice.

**Format:**

```
### Rot Opportunity — [Location/Trigger]
[Description of the hazard.]

[Crossing without care]: Con save DC 13. Fail — 1 Green Mark. [What happens.]
[Jumping across]: Athletics DC 11. [What this avoids.]
[Examining the water]: Nature DC 12 reveals [what].
[Drinking the water]: Gain 2 Green Marks. [Consequence]. Don't prompt this. Let them try.
```

**Rules:**

- Use consistent trigger phrasing: "[Action]: [consequence]."
- Include at least one "passive" option (what happens if they do nothing) and one "active" option (what a cautious player can do)
- Always include a Con save DC for direct physical contact with corruption
- Drinking/directly consuming corruption: always 2 Green Marks minimum
- Include a note for the DM about what **not** to prompt: "Don't prompt this. Let them try."

---

## Branching scenes

When a scene forks into two distinct paths, use the following conventions:

**In the session structure table:** List branches as `5a` and `5b` with their own rows.

**Scene headings:**
```
## Scene 5a — [Title] (Left Path)
## Scene 5b — [Title] (Right Path)
```

The path descriptor in parentheses is required.

**In the preceding scene:** End with a `### DM NOTE` explaining:
- What each path leads to
- What happens if the party splits
- Whether the raven appears (it does not appear at fork junctions)
- That the DM should not tip the scales

The application will automatically create branch links between Scene 4 and Scenes 5a/5b. No special markup is required beyond the `a`/`b` suffix on the scene number.

---

## NPC behaviour guidelines

### Ilya

Ilya is a cleric of Talona. He does not volunteer this. He does not lie directly when he can omit instead.

**In scenes where Ilya speaks:**
- Include a table of `Player Angle / Likely Questions / Ilya's Response`
- His responses give just enough to be useful, never enough to satisfy a cautious party
- He is warm. This is not a performance — it is calculated and genuine simultaneously
- Include a `DM NOTE` about what he is actually doing and what Insight DC would reveal it

**Format for Ilya response tables:**

| Player Angle | Likely Questions | Ilya's Response |
|---|---|---|
| What is this place? | Why are we here? | "The centre of a very old problem..." |

### Birna

Birna is not a villain. She is someone who stopped resisting a thing that was going to happen anyway.

- She does not apologise. She sometimes comes close.
- Her tells are small and physical: a pause, an expression that passes too quickly, a word chosen with unusual care
- When she says something true that conceals something worse, include a DM NOTE flagging the concealment and how a player could catch it

### The Raven (Artos)

Always write the raven as trying and failing to communicate. The pathos is in the gap between what he intends and what the party receives. He is not mysterious. He is tragic.

---

## Session close conventions

The final scene of every session must:

1. Include a **Level Up** beat if the party advances
2. End on a beat that is **quiet rather than loud** — not a cliffhanger action, but an image or a sound or an absence that lingers
3. Include `Session end.` as the final line of the document

**Standard Level Up beat:**

```
### Level Up & Close
[Brief description of what the advancement represents narratively — not just "you gain a level". The binding, the forest, the corruption — all of these should be felt in how the characters change.]

[Final image/sound/silence.]

Session end.
```

---

## Common errors to avoid

**Do not write exposition.** The party does not need to be told what the campaign is about. Show them what the forest does. They will understand.

**Do not write certainty where there should be ambiguity.** "The corruption is Talona" is something the party suspects, not something they know. Preserve that distinction in how you write NPC responses. Even DM notes should reflect degrees of knowledge.

**Do not write combat as the primary scene type.** Sessions typically have one or two combat encounters. Everything else is exploration, investigation, social interaction, or horror. If you find yourself writing a third combat, restructure.

**Do not resolve tension early.** Skill check tables should have consequences for both success and failure — not "on a fail, nothing happens." Something always happens. It might be smaller, or later, or stranger.

**Do not write Ilya warmly without also writing his agenda.** Every scene he appears in needs a DM NOTE about what he is doing underneath the warmth. Without this, he is just a helpful NPC.

**Do not pad.** A 25-minute scene should have 3–5 beats. A 40-minute boss fight scene might have 6–8. More beats than this usually means over-writing.

---

## Format checklist before submission

Before submitting any session document, verify:

- [ ] Document header uses exact format: `THE GREEN HUNGER` / `DM Guide — Session N` / `Chapter N: Title`
- [ ] Session structure table has all 5 columns: `#`, `Scene`, `Purpose`, `Time`, `Notes`
- [ ] Background section is present and ends before the first `## Scene` heading
- [ ] All scene headings use `## Scene N — Title` with an em dash
- [ ] All beat headings use `###` (three hashes only)
- [ ] All skill check tables have 4 columns: `Trigger`, `Skill / Save`, `DC`, `What They Learn`
- [ ] All outcome tables have 2 columns: `Outcome`, `Consequence`
- [ ] Every stat block has a `### Stat Block — [Name]` heading
- [ ] Every stat block includes Combat Description Prompts (on hit, trigger, on death)
- [ ] Every DM note uses `DM NOTE:` format (colon, no variant)
- [ ] Raven appearances use the 🦅 emoji and `### Raven Appearance — It Helps/Hinders` heading
- [ ] Branching scenes use `5a`/`5b` numbering with path descriptor in parentheses
- [ ] Document ends with `Session end.`
- [ ] No em dashes replaced with hyphens (— not -)
- [ ] No heading levels other than `##` for scenes and `###` for beats

---

## Reference: Session 2 and 3 as exemplars

Sessions 2 and 3 (*Into the Heart* and *The Thing That Was Held Back*) are the canonical reference documents for this format. When in doubt about any structural or stylistic question, refer to those documents first. This guide is derived from them — not the other way around.
