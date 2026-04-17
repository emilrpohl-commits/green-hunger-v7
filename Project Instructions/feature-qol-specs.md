# Green Hunger — QOL Feature Specs

Three features. All data and infrastructure already exists — these are UI additions and event hooks, not schema changes.

---

## Feature 1 — Inline Spell Reference (Player App)

### What it does
Tapping any spell in the Spells tab expands a full reference card inline — range, duration, components, concentration flag, full description, and higher-level scaling — without leaving the character sheet.

### Why it matters
Players currently tap a spell to cast it. There's no way to just *read* what it does. This causes constant out-of-app lookups and slows the table down.

### Data available
All spell data is already on the character object loaded by the player store. The `displaySpell` object (built by `compendiumRowToPlayerEntry()` in `shared/lib/spellCompendium/mappers.js`) already contains:

```javascript
{
  name, level, school, castingTime, range, duration,
  concentration, ritual, components, material,
  description,          // Full spell text
  higherLevel,          // Upcast description
  saveType,             // e.g. 'CON'
  attack_type,          // 'ranged' | 'melee' | null
  area: { shape, size, origin },
  mechanic,             // 'attack' | 'save' | 'heal' | 'utility' | 'special'
  targetMode,
  isBonusAction, isReaction
}
```

### Files to change

**`players/src/components/tabs/SpellsTab.jsx`**

Current behaviour: tapping a spell opens the cast panel.  
New behaviour: tapping the spell *name/row* expands a details panel; a separate Cast button initiates casting.

**Changes:**

1. Add `expandedSpellId` state:
   ```javascript
   const [expandedSpellId, setExpandedSpellId] = useState(null)
   ```

2. On spell row click, toggle `expandedSpellId`:
   ```javascript
   onClick={() => setExpandedSpellId(prev => prev === spell.id ? null : spell.id)
   ```

3. Render the expanded panel immediately below the spell row when `expandedSpellId === spell.id`:

```jsx
{expandedSpellId === spell.id && (
  <div className="spell-reference-panel">
    <div className="spell-ref-meta">
      <span>{displaySpell.castingTime}</span>
      <span>{displaySpell.range}</span>
      <span>{displaySpell.duration}</span>
      {displaySpell.concentration && <span className="conc-tag">Concentration</span>}
      {displaySpell.ritual && <span className="ritual-tag">Ritual</span>}
    </div>
    <div className="spell-ref-components">
      {displaySpell.components.join(', ')}
      {displaySpell.material && <span className="material-note">({displaySpell.material})</span>}
    </div>
    {displaySpell.area?.shape && (
      <div className="spell-ref-area">
        {displaySpell.area.size}ft {displaySpell.area.shape}
      </div>
    )}
    {displaySpell.saveType && (
      <div className="spell-ref-save">{displaySpell.saveType} saving throw</div>
    )}
    <p className="spell-ref-desc">{displaySpell.description}</p>
    {displaySpell.higherLevel && (
      <p className="spell-ref-higher">
        <strong>At higher levels:</strong> {displaySpell.higherLevel}
      </p>
    )}
    {/* Only show Cast button if spell is castable (player has slots, not a cantrip gate, etc.) */}
    <button className="spell-cast-btn" onClick={() => handleCastSpell(spell)}>
      Cast
    </button>
  </div>
)}
```

4. The existing cast flow (`handleCastSpell`) remains unchanged — the Cast button just calls it.

### New CSS classes (add to `players/src/styles.css`)

```css
.spell-reference-panel {
  padding: var(--space-sm) var(--space-md);
  background: var(--surface-raised);
  border-left: 2px solid var(--accent);
  margin: var(--space-xs) 0 var(--space-sm);
  border-radius: 0 var(--radius) var(--radius) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.spell-ref-meta {
  display: flex;
  gap: var(--space-sm);
  font-size: var(--text-xs);
  color: var(--text-muted);
  flex-wrap: wrap;
}

.spell-ref-components {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.material-note {
  font-style: italic;
  margin-left: var(--space-xs);
}

.conc-tag, .ritual-tag {
  font-size: var(--text-xs);
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent-muted);
  color: var(--accent);
}

.spell-ref-desc {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.spell-ref-higher {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.spell-ref-area, .spell-ref-save {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-style: italic;
}

.spell-cast-btn {
  align-self: flex-end;
  margin-top: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  background: var(--accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: var(--text-sm);
}
```

### Behaviour rules
- Only one spell can be expanded at a time — opening another collapses the previous
- Concentration tag uses the existing `--accent` colour to match the concentration badge elsewhere in the app
- If `description` is missing from the `displaySpell` object (shouldn't happen but guard it), show "No description available"
- The expand/collapse is purely local state — no store changes, no DB calls

### Testing
- Expand a cantrip (no slot display needed)
- Expand a concentration spell (tag must appear)
- Expand a ritual spell (tag must appear)
- Expand a spell with material components (must show material note)
- Expand a spell with higher level scaling (must show "At higher levels" block)
- Tap same spell twice — confirm it collapses
- Tap spell A then spell B — confirm A collapses

---

## Feature 2 — Concentration Save on Damage (Player App)

### What it does
When a player character who is concentrating takes damage, the app automatically surfaces the Constitution save DC and a pre-loaded "Roll CON Save" button. If they fail, concentration breaks. If they succeed, it's dismissed.

### Why it matters
This is a rule players forget constantly and DMs have to remind them of mid-combat. Currently the app tracks concentration but never prompts the player. The damage pipeline and concentration state are already wired — this is purely a notification trigger.

### DC Calculation (per D&D 5e rules)
```
DC = Math.max(10, Math.floor(totalDamage / 2))
```

### Data available

From `players/src/stores/playerStore/combatSlice.js` (or `dataSlice.js`):
- `myCharacter.concentration` — boolean
- `myCharacter.concentrationSpell` — name of the spell
- `myCharacter.tacticalJson.concentrationSpell` — same from combat state
- `myCharacter.stats.savingThrows.CON` — modifier (e.g. `+3`)

From `players/src/stores/playerStore/combatSlice.js` — `applyDamageToCharacter()`:
- Already receives `amount` (damage dealt after temp HP and resistance)
- Already updates `curHp` and writes to `combat_feed`

### Files to change

**`players/src/stores/playerStore/combatSlice.js`**

After applying damage, check if the target is the active player's character and they're concentrating. If so, set a new store field:

```javascript
// Add to initial state:
concentrationSavePrompt: null,
// Shape: { dc: number, spellName: string, roll: null | number, passed: null | boolean }

// In applyDamageToCharacter(), after HP update:
const myId = get().activeCharacterId
if (targetId === myId) {
  const char = get().myCharacter
  if (char?.concentration) {
    const dc = Math.max(10, Math.floor(actualDamage / 2))
    set({
      concentrationSavePrompt: {
        dc,
        spellName: char.tacticalJson?.concentrationSpell ?? 'your spell',
        roll: null,
        passed: null
      }
    })
  }
}
```

Add two new actions:

```javascript
rollConcentrationSave: () => {
  const { myCharacter, concentrationSavePrompt } = get()
  if (!concentrationSavePrompt) return

  const conMod = myCharacter?.stats?.savingThrows?.CON ?? 0
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + conMod
  const passed = total >= concentrationSavePrompt.dc

  set({
    concentrationSavePrompt: {
      ...concentrationSavePrompt,
      roll: total,
      d20,
      passed
    }
  })

  if (!passed) {
    // Break concentration
    get().setMyCharacterConcentration(null)
  }

  // Push result to combat feed
  get().pushRoll({
    type: 'save',
    label: `CON Save (Concentration DC ${concentrationSavePrompt.dc})`,
    roll: d20,
    modifier: conMod,
    total,
    result: passed ? 'success' : 'fail',
    public: true
  })
},

dismissConcentrationSave: () => {
  set({ concentrationSavePrompt: null })
}
```

**`players/src/components/CombatStrip.jsx`** (or wherever is most visible mid-combat)

Read `concentrationSavePrompt` from the store and render the prompt as an overlay panel when it is non-null:

```jsx
const { concentrationSavePrompt, rollConcentrationSave, dismissConcentrationSave } = usePlayerStore()

{concentrationSavePrompt && !concentrationSavePrompt.passed !== null && (
  <div className="conc-save-prompt">
    {concentrationSavePrompt.roll === null ? (
      // Pre-roll state
      <>
        <p className="conc-save-title">Concentration Check</p>
        <p className="conc-save-spell">
          You took damage while concentrating on <strong>{concentrationSavePrompt.spellName}</strong>.
        </p>
        <p className="conc-save-dc">DC {concentrationSavePrompt.dc} Constitution Save</p>
        <button className="conc-save-roll-btn" onClick={rollConcentrationSave}>
          Roll CON Save
        </button>
      </>
    ) : (
      // Post-roll state
      <>
        <p className="conc-save-title">
          {concentrationSavePrompt.passed ? 'Concentration Held' : 'Concentration Lost'}
        </p>
        <p className="conc-save-result">
          Rolled {concentrationSavePrompt.d20} + {myCharacter?.stats?.savingThrows?.CON ?? 0}
          {' '}= <strong>{concentrationSavePrompt.roll}</strong> vs DC {concentrationSavePrompt.dc}
        </p>
        {concentrationSavePrompt.passed ? (
          <p className="conc-save-spell">{concentrationSavePrompt.spellName} continues.</p>
        ) : (
          <p className="conc-save-spell">{concentrationSavePrompt.spellName} has ended.</p>
        )}
        <button className="conc-save-dismiss-btn" onClick={dismissConcentrationSave}>
          OK
        </button>
      </>
    )}
  </div>
)}
```

### New CSS classes (add to `players/src/styles.css`)

```css
.conc-save-prompt {
  position: fixed;
  bottom: calc(var(--dice-dock-height, 80px) + var(--space-md));
  left: 50%;
  transform: translateX(-50%);
  width: min(360px, 90vw);
  background: var(--surface-raised);
  border: 1px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  z-index: 200;
}

.conc-save-title {
  font-family: var(--font-display);
  font-size: var(--text-md);
  color: var(--accent);
  margin: 0;
}

.conc-save-spell {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.conc-save-dc {
  font-size: var(--text-lg);
  font-family: var(--font-mono);
  color: var(--text-primary);
  margin: 0;
}

.conc-save-result {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  color: var(--text-secondary);
  margin: 0;
}

.conc-save-roll-btn {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: var(--radius);
  font-size: var(--text-md);
  font-family: var(--font-display);
  cursor: pointer;
}

.conc-save-dismiss-btn {
  padding: var(--space-xs) var(--space-lg);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
}
```

### Behaviour rules
- Only triggers for the active player's own character — not when damage is applied to party members by the DM
- Prompt is non-blocking — the player can still read the combat feed while it is visible
- If the player takes multiple hits while concentrating before rolling, only one prompt shows (the second hit updates the DC if it's higher)
- Prompt auto-dismisses if concentration is broken by a condition (Incapacitated, Unconscious) — no need to also roll
- The roll result is pushed to the public combat feed so the DM can see it
- If `myCharacter.stats.savingThrows.CON` is missing, default modifier to 0

### Testing
- Apply damage to a concentrating character → prompt appears with correct DC
- Half damage DC: 14 damage → DC 10 (max(10, 7)); 24 damage → DC 12
- Roll and pass → "Concentration Held", spell name still shows in status, `concentration` stays true
- Roll and fail → "Concentration Lost", spell name cleared from tactical state, `concentration` set to false
- Dismiss after result → `concentrationSavePrompt` cleared, prompt gone
- Apply Incapacitated condition → prompt clears, concentration breaks without a save
- Non-concentrating character takes damage → no prompt

---

## Feature 3 — Condition Tracker on Combatants (DM App)

### What it does
Each combatant row in the DM's combat tracker shows active conditions as tappable, colour-coded chips. The DM can add conditions from a dropdown and remove them with a single tap. Changes sync to the player app in real time.

### Why it matters
Conditions are currently tracked in the data but the UI is minimal. The DM has to remember conditions mentally or use a separate tool. A glanceable, single-click condition manager on each row reduces cognitive load and speeds up play.

### Data available

From `dm/src/features/combat/CombatTracker.jsx` — each combatant already has:
```javascript
{
  conditions: string[],          // Array of canonical condition names
  concentration: boolean,
  exhaustionLevel: 0-6
}
```

From `shared/lib/rules/conditionCatalog.js`:
```javascript
CONDITIONS          // Ordered array of all condition names
CONDITION_DESC      // Map: name → one-line rules summary
CONDITION_COLOUR    // Map: name → hex colour string
```

From DM store — already exists:
```javascript
toggleCondition(combatantId, conditionName)
// Normalises name, handles concentration break, syncs to combat_state, broadcasts via Realtime
```

The full wiring is already in place. This feature is entirely a UI addition to `CombatantRow`.

### Files to change

**`dm/src/features/combat/CombatantRow.jsx`** (or equivalent combatant row component)

Add two pieces of local state per row:
```javascript
const [showConditionPicker, setShowConditionPicker] = useState(false)
const [hoveredCondition, setHoveredCondition] = useState(null)
```

**Active conditions bar** — render below the HP bar, above the damage/heal controls:

```jsx
<div className="combatant-conditions-bar">
  {/* Active condition chips */}
  {combatant.conditions.map(condition => (
    <button
      key={condition}
      className="condition-chip"
      style={{ '--chip-colour': CONDITION_COLOUR[condition] ?? '#888' }}
      title={CONDITION_DESC[condition]}
      onClick={() => toggleCondition(combatant.id, condition)}
    >
      {condition}
      <span className="condition-chip-remove">×</span>
    </button>
  ))}

  {/* Concentration badge (separate — not a removable condition) */}
  {combatant.concentration && (
    <span className="condition-chip condition-chip--conc" title="Concentrating">
      ◈ Conc.
    </span>
  )}

  {/* Add condition button */}
  <button
    className="condition-add-btn"
    onClick={() => setShowConditionPicker(p => !p)}
    title="Add condition"
  >
    + cond
  </button>
</div>

{/* Condition picker dropdown */}
{showConditionPicker && (
  <div className="condition-picker">
    {CONDITIONS.map(name => {
      const isActive = combatant.conditions.includes(name)
      return (
        <button
          key={name}
          className={`condition-picker-btn ${isActive ? 'condition-picker-btn--active' : ''}`}
          style={{ '--chip-colour': CONDITION_COLOUR[name] ?? '#888' }}
          title={CONDITION_DESC[name]}
          onClick={() => {
            toggleCondition(combatant.id, name)
            if (!isActive) setShowConditionPicker(false) // Close on add; stay open on remove
          }}
        >
          {name}
        </button>
      )
    })}
    <button
      className="condition-picker-close"
      onClick={() => setShowConditionPicker(false)}
    >
      Done
    </button>
  </div>
)}
```

### New CSS classes (add to DM app styles or TailwindCSS equivalents)

The DM app uses Tailwind. Where possible use utility classes; add component classes to a dedicated `combat.css` or inline via `className` strings.

```css
/* If adding a dedicated CSS file: dm/src/features/combat/combat.css */

.combatant-conditions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
  min-height: 28px;
}

.condition-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--chip-colour);
  color: var(--chip-colour);
  background: color-mix(in srgb, var(--chip-colour) 12%, transparent);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.1s;
}

.condition-chip:hover {
  background: color-mix(in srgb, var(--chip-colour) 25%, transparent);
}

.condition-chip-remove {
  font-size: 13px;
  opacity: 0.6;
  line-height: 1;
}

.condition-chip--conc {
  border-color: #a0c4ff;
  color: #a0c4ff;
  background: rgba(160, 196, 255, 0.1);
  cursor: default;
}

.condition-add-btn {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px dashed #555;
  color: #888;
  background: transparent;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s;
}

.condition-add-btn:hover {
  border-color: #aaa;
  color: #ccc;
}

.condition-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: var(--surface-2, #1e1e1e);
  border: 1px solid #333;
  border-radius: 8px;
  margin-top: 4px;
}

.condition-picker-btn {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--chip-colour);
  color: var(--chip-colour);
  background: transparent;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s;
}

.condition-picker-btn:hover {
  background: color-mix(in srgb, var(--chip-colour) 20%, transparent);
}

.condition-picker-btn--active {
  background: color-mix(in srgb, var(--chip-colour) 30%, transparent);
}

.condition-picker-close {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid #555;
  color: #888;
  background: transparent;
  font-size: 11px;
  cursor: pointer;
}
```

### Tooltip for condition rules

Each chip has `title={CONDITION_DESC[condition]}` for a native browser tooltip. This is sufficient for quick reference — no custom tooltip component needed unless preferred.

Optionally, add a hover panel if the team wants richer formatting:
```jsx
onMouseEnter={() => setHoveredCondition(condition)}
onMouseLeave={() => setHoveredCondition(null)}

{hoveredCondition && (
  <div className="condition-tooltip">
    <strong>{hoveredCondition}</strong>
    <p>{CONDITION_DESC[hoveredCondition]}</p>
  </div>
)}
```

### Realtime sync to player app
No additional work needed. The existing `toggleCondition()` in the DM store:
1. Updates local `combatants` state
2. Calls `syncCombatState()` → writes to `combat_state` table
3. Supabase Realtime broadcasts to the player app's `combat-state-changes-player` channel
4. Player store updates `combatCombatants`, and `ConditionsBar.jsx` re-renders

### Exhaustion special case
Exhaustion has levels (1–6) rather than a simple toggle. The DM store already tracks `exhaustionLevel`. For the condition picker:

```jsx
// In condition picker, replace Exhaustion button with a stepper:
{name === 'Exhaustion' ? (
  <div className="condition-exhaustion-stepper">
    <span style={{ color: CONDITION_COLOUR['Exhaustion'] }}>Exhaustion</span>
    <button onClick={() => adjustExhaustion(combatant.id, -1)}>−</button>
    <span>{combatant.exhaustionLevel}</span>
    <button onClick={() => adjustExhaustion(combatant.id, +1)}>+</button>
  </div>
) : (
  <button className="condition-picker-btn" ...>{name}</button>
)}
```

Use the existing `setExhaustionLevel(combatantId, level)` action from the DM store.

### Behaviour rules
- Clicking a chip removes that condition immediately (no confirmation — easy to re-add)
- Picker closes automatically when a condition is added; stays open if one is removed (so DM can add multiple at once, or remove and add a different one)
- If `Incapacitated` or `Unconscious` is added via the picker, the existing concentration-break logic in `toggleCondition()` fires automatically — no extra handling needed
- Concentration chip is read-only (display only) — concentration is managed via the existing save/break flow, not toggled manually
- Exhaustion shows its level number inside the chip: "Exhaustion 2"
- Condition picker is scoped per combatant row (each row has its own open/closed state)
- Picker closes when the DM clicks outside — add a `useEffect` with a document `mousedown` listener that calls `setShowConditionPicker(false)`

### Testing
- Open picker on an enemy row → all 16 conditions should appear
- Click a condition → chip appears on the row, picker closes, player app updates in real-time
- Click chip → condition removed from row, player app updates
- Add Incapacitated → concentration badge disappears from row (if concentrating), `combat_feed` logs concentration break
- Add Exhaustion → stepper appears at level 1; increment/decrement works
- Hover chip → browser tooltip shows the condition rule summary
- Multiple combatants open pickers simultaneously → each is independent

---

## Implementation Order

Build in this sequence — each feature is independent but this order lets you test the data flows progressively:

1. **Feature 3 first** (Condition Tracker — DM app) — purely additive, no new state, tests the real-time sync pipeline end to end
2. **Feature 1 next** (Inline Spell Reference — Player app) — local state only, no store changes, isolated to one component
3. **Feature 2 last** (Concentration Save — Player app) — depends on the damage pipeline and needs the most testing for edge cases

---

## Definition of Done

Each feature is complete when:

- [ ] Works correctly in `npm run dev` for the relevant app
- [ ] Syncs in real time between DM and player apps (Features 2 and 3)
- [ ] All behaviour rules above are verified
- [ ] All test cases above pass
- [ ] No `console.log` left in production paths
- [ ] No new inline `style={{}}` objects — use the CSS classes defined above
- [ ] `npm run lint` passes with no new warnings

---

*Spec written: April 2026. Based on full exploration of existing data structures, store actions, and component architecture.*
