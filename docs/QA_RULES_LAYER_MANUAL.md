# QA — Rules layer (“felt” gameplay pass)

Manual checks after changes to `@shared/lib/rules`, DM combat UI, and the player app. Run in an environment where DM and Player apps both talk to the same session.

## Feature flag: `VITE_RULES_DAMAGE_PIPELINE`

- **Default:** leave **off** in production until you have verified typed damage across real play.
- **When on:** manual damage from DM (`CompactCard`, `QuickAdjustPanel`, `CombatTracker`) uses resistance / vulnerability / immunity for the selected damage type; feed lines include human-readable factor text (immunity → 0, resistance → half, vulnerability → double).
- **Rollout:** enable for focused playtests after typed-damage paths and scenarios 1–5 below pass. Prefer **default on** only after a full session or broader regression without silent mismatches.

---

## 1. Conditions and modifiers

- [ ] DM: toggle **Exhaustion**, set level 1–6 on a combatant; chip shows **Exhaustion N** where applicable.
- [ ] Player: skill checks, saves, and attacks respect **advantage / disadvantage** from conditions (e.g. poisoned, frightened, prone vs melee/ranged).
- [ ] Player: **exhaustion** reduces the d20 total (after the roll) and the roll log notes the penalty.
- [ ] Player: incoming save from DM feed uses the same save modifiers + exhaustion when not using manual total.
- [ ] **ConditionsBar** (player): chip colours match the shared catalog; expanded text matches **CONDITION_DESC** and can show longer **glossary** text when available.

## 2. Glossary and rules lookup

- [ ] DM: **Rules** in the top bar opens **Rules lookup**; search finds entries such as “Concentration” and “Bonus Action”.
- [ ] DM: **Quick rulings** drawer → **Open rules search** opens the same panel.
- [ ] Player: **Rules** on the character sheet opens the panel; search behaves the same.
- [ ] Condition tooltips do not contradict obvious SRD glossary wording for the same term.

## 3. DC labels

- [ ] DM **ActionsList** save prompts include a DC label when applicable (e.g. DC 15 (Medium)).
- [ ] Player spell saves and **incoming save** logs use the same **formatDcWithLabel** pattern.
- [ ] DM **Character editor**: **Spell save DC** field shows the ladder label under the input when a numeric DC is set.
- [ ] Player tactical strip: **DC** mini-stat tooltip shows the ladder label.

## 4. Rest

- [ ] Player: **Short rest** persists `lastShortRestAt` in tactical JSON and, if combat is active, adds a **combat_feed** line (Hit Dice / features are manual per SRD).
- [ ] Player: **Long rest** sets HP to max, clears temp HP, resets spell slot **used** counts, clears concentration, reduces **exhaustion** in tactical JSON, syncs **Exhaustion** in `conditions`, and writes **combat_feed** when combat is active.

## 5. Concentration

- [ ] Player: when the character has **concentration** and takes HP damage (after temp HP), **combat_feed** includes a line with **CON save** and DC from `concentrationSaveDc` (with ladder label).

## 6. Typed damage (flag **on**)

- [ ] Immunity → 0 damage; resistance → half; vulnerability → double; untyped damage skips the pipeline.
- [ ] Legacy type strings (e.g. “Fire”, “fire”) coerce via `coerceDamageTypeForPipeline`.

## 7. Duplicate glossary file

- [ ] `shared/content/rules-glossary.json` is an empty stub; canonical data is **`data/rules/rules-glossary.json`** via `@rules-data` only.

---

## Files to touch if something fails

| Area | Primary locations |
|------|-------------------|
| Modifiers / hydration | `shared/lib/rules/conditionRollModifiers.js`, `conditionHydration.js` |
| Typed damage | `shared/lib/rules/damagePipeline.js`, `dm/.../actionsSlice.js`, `players/.../combatSlice.js` |
| Glossary UI | `shared/lib/rules/glossaryService.js`, `shared/components/rules/RulesLookupPanel.jsx` |
| DC display | `shared/lib/rules/dcDisplay.js`, `dmTable.js` |
| Rest | `players/.../dataSlice.js` (`takeShortRest`, `takeLongRest`), `shared/lib/rules/restOrchestrator.js` |
| Concentration | `players/.../combatSlice.js` (`applyDamageToCharacter`), `shared/lib/rules/spellcastingRules.js` |
