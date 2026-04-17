# Green Hunger — Project Upgrade Guide for Cursor

This document is the authoritative reference for all improvement work on the Green Hunger platform. It covers both repositories:

- **`green-hunger-v7`** — DM Console (campaign builder + live session runner)
- **`greenhunger-players`** — Player App (character sheets, combat, narrative)

Both apps share a Supabase backend and a common `shared/` library inside `green-hunger-v7`.

Read this entire document before making changes. Follow the priority order. Do not introduce new patterns that contradict the existing architecture without flagging it.

---

## Platform Overview

Green Hunger is a custom D&D 5e campaign management platform. It has two user-facing apps:

1. **DM Console** — The Dungeon Master uses this to run sessions: navigating scenes/beats, managing combat, revealing information to players, and controlling the audio environment.
2. **Player App** — Players use this during sessions to view their character sheet, roll dice, cast spells, apply damage, track HP, and see what the DM reveals.

Both apps connect to a single Supabase project for real-time sync. The DM console writes session state; the player app reads it and writes player actions back.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| State | Zustand 4 |
| Backend/DB | Supabase (PostgreSQL + Realtime) |
| Validation | Zod 3 |
| Styling (DM) | TailwindCSS 3 |
| Styling (Players) | CSS variables + inline styles |
| Build | Vite |
| Tests | Vitest + Chai |

---

## Priority 1 — Security Fixes (Do These First)

These are not optional. They must be resolved before any feature work.

### 1.1 Remove Hardcoded Passwords

**Files:**
- `dm/src/App.jsx` — contains `DM_PASSWORD = 'Sherlock*123'` on approximately line 20
- `greenhunger-players/src/components/LoginScreen.jsx` — contains hardcoded party observer password `weald`

**What to do:**
- Remove the `DM_PASSWORD` constant from `dm/src/App.jsx` entirely. The legacy password check is a dead code path — the app already supports Supabase email/password auth via `signInDmWithEmailPassword()`. Remove the fallback check completely.
- Move the party observer password in the player app to a Supabase-managed config row or environment variable. It should never be a plaintext constant in source code.
- Do not replace hardcoded passwords with `.env` variables committed to the repo. Use `.env.local` which is gitignored.

### 1.2 Fix Row-Level Security Policies

**File:** `supabase/schema.sql` and all files in `supabase/migrations/`

**Problem:** All RLS policies currently use `USING (true) WITH CHECK (true)` — this means any client with the anon key can read and write any row in any table. There is no actual access control.

**What to do:**

Scope policies to the active session context. The recommended pattern is:

```sql
-- Example: players can only write combat events for the active session
CREATE POLICY "players_write_combat_own_session"
ON combat_resolution_events
FOR INSERT
WITH CHECK (
  session_run_id = (
    SELECT active_session_uuid FROM session_state LIMIT 1
  )
);
```

At minimum:
- `character_states` — only the owning player (matched by character ID) should be able to UPSERT their own row
- `combat_feed` — players can INSERT but not DELETE or UPDATE; DM can do all
- `combat_state` — only DM (authenticated Supabase user) should be able to UPDATE
- `reveals` — only DM can INSERT/DELETE; players can only SELECT
- `session_state` — only DM can UPDATE

Write new migrations for these policies. Do not modify the existing migration files — append new ones with the next timestamp.

### 1.3 Add Server-Side Character Authorization

**File:** `greenhunger-players/src/stores/playerStore.js`

**Problem:** Players can currently call `applyDamageToEnemy()`, `applyHealingToCharacter()`, and `useSpellSlot()` for any character — there is no check that they control the character they're acting on.

**What to do:**
- Add a `player_character_id` column to the relevant Supabase RLS policies so a row can only be written by the session participant it belongs to.
- In the player store, always include the active character ID in mutation payloads so the server can validate it.
- Do not rely on client-side checks alone.

### 1.4 Expire the DM Auth Flag

**File:** `dm/src/App.jsx`

**Problem:** The `gh_dm_unlocked` flag is written to `localStorage` and never expires. Anyone on a shared machine can open the DM console without re-authenticating.

**What to do:**
- Add a timestamp alongside the flag: `{ unlocked: true, timestamp: Date.now() }`
- On app load, check if the flag is older than a configurable threshold (e.g., 8 hours) and clear it if so
- Alternatively, drop the localStorage flag entirely and rely solely on the Supabase session, which handles token expiry natively

### 1.5 Move Supabase Keys to Environment Variables

**File:** `shared/lib/supabase.js`

**Problem:** Supabase URL and anon key are hardcoded as string constants.

**What to do:**
- Move to `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` environment variables
- Add `.env.example` files to both apps showing the required variable names with placeholder values
- The hardcoded values can remain as a final fallback for local dev only, clearly commented as such

---

## Priority 2 — Code Quality (Start After Security is Addressed)

### 2.1 Split CharacterProfile.jsx

**File:** `greenhunger-players/src/components/CharacterProfile.jsx` (~1,504 lines)

This is the largest and most critical refactor in the player app. The component handles too many concerns.

**Target structure:**

```
components/
├── CharacterProfile.jsx          # Shell: tab router only, ~100 lines
├── character/
│   ├── StatsTab.jsx              # Ability scores, saving throws, skills
│   ├── ActionsTab.jsx            # Weapons, heals, buffs, talent actions
│   ├── SpellsTab.jsx             # Spell list, slot tracker, casting UI
│   ├── RollResult.jsx            # Roll display with auto-dismiss
│   ├── DmRollNotification.jsx    # Incoming DM roll notifications
│   └── InitiativeSubmit.jsx      # Initiative submission during combat
```

**Rules for this refactor:**
- Do not change any logic during the split — only move code
- Each sub-component receives only the props it needs; use the Zustand store directly for store state
- Keep the Zustand store interface unchanged

### 2.2 Split the DM Campaign Store

**File:** `dm/src/stores/campaignStore/dataSlice.js` (~475 lines)

Break into focused modules:

```
stores/campaignStore/
├── index.js                # Combines slices via Zustand's combine or create pattern
├── sessionSlice.js         # Session/scene/beat navigation
├── combatSlice.js          # Combat state loading and sync
├── characterSlice.js       # Character and NPC data
├── audioSlice.js           # Audio playlist and track state
└── referenceSlice.js       # Spells, conditions, monsters reference data
```

### 2.3 Replace Silent Error Handling

**Both apps** — search for all occurrences of:
```javascript
catch (e) { console.log(...) }
catch (e) { console.error(...) }
```

Replace with patterns that surface errors to the user:
- For async data loads: set an `error` state variable and render an inline error message
- For user-initiated actions (casting spells, applying damage): show a toast or inline feedback
- Never swallow errors silently in action handlers

A simple toast utility is acceptable — do not bring in a full notification library.

### 2.4 Add React Error Boundaries

**Both apps** — add error boundaries at:
1. The app root (catches catastrophic failures)
2. Around each major panel/feature area (so one failure doesn't break the whole session)

```jsx
// Minimal implementation — do not use a library
class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return <div className="error-panel">Something went wrong in this panel. Please refresh.</div>
    return this.props.children
  }
}
```

### 2.5 Add Loading States

**Player app** — `playerStore.js` loads data asynchronously with no loading indicator.

Add a `loading` boolean to the store, set it `true` before fetching and `false` when done. Each component that reads from the store should render a minimal skeleton or spinner while `loading` is true.

### 2.6 Replace Inline Styles (Player App)

**File:** `greenhunger-players/src/` — inline styles are used throughout

Migrate styles to CSS classes defined in `styles.css` using the existing CSS variable system. Do not introduce Tailwind into the player app — keep it consistent with the current CSS variable approach.

Priority order for migration:
1. `CombatFeed.jsx` — most repeated patterns
2. `PartyStatus.jsx`
3. `RevealedCards.jsx`
4. `CharacterProfile.jsx` sub-components (do alongside the split in 2.1)

---

## Priority 3 — Architecture & Feature Completion

### 3.1 Complete the Seedless Platform Migration

**File:** `shared/lib/featureFlags.js` — `seedlessPlatform` flag

The app has significant hardcoded references to the "green-hunger" campaign that block multi-campaign support. The `seedlessPlatform` flag exists to enable this but the migration is incomplete.

**What needs to happen:**
- Audit every place that hardcodes `'green-hunger'` as a campaign slug and replace with a dynamic campaign context
- Ensure the DM console can select/switch campaigns from the database rather than relying on a hardcoded slug
- The player app's `data/session1.js` and `data/characters.js` are static fallbacks — these should only be used when Supabase data is unavailable, not as the primary data source
- Once complete, enable the flag by default and remove the flag + the old code path

### 3.2 Clean Up Feature Flags

**File:** `shared/lib/featureFlags.js`

There are 30+ flags. Many are likely stale. For each flag:
1. Check if both code paths (enabled/disabled) still exist
2. If the feature has fully shipped: remove the flag and the old code path
3. If the feature is abandoned: remove the flag and the new code path
4. Keep only flags that represent genuinely in-progress rollouts

Document the remaining active flags with a comment explaining what they control and what the expected cutover condition is.

### 3.3 Multi-Session Support (Player App)

**File:** `greenhunger-players/src/stores/playerStore.js`

The player app is hardcoded to load `session-1`. This needs to be driven by `session_state.active_session_uuid` from Supabase so it automatically reflects whichever session the DM activates.

### 3.4 Set Up CI/CD

The current deploy process is manual (build locally → commit `dist/` → push). This is fragile and means `dist/` is committed to source control.

**Recommended approach:**
1. Add `dist/` to `.gitignore` in both repos
2. Create a GitHub Actions workflow in each repo that:
   - Triggers on push to `main`
   - Runs `npm ci && npm run build`
   - Deploys the `dist/` output to GitHub Pages using the `actions/deploy-pages` action
3. Add a build status badge to each repo's README

---

## Priority 4 — Developer Experience

### 4.1 Add ESLint and Prettier

Add to both apps:

```json
// .eslintrc.json (minimal starting config)
{
  "extends": ["eslint:recommended", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  "rules": {
    "no-console": "warn",
    "react/prop-types": "off"
  }
}
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

Add `lint` and `format` scripts to `package.json` in both apps.

### 4.2 Add TypeScript (Incremental)

Do not attempt a full migration in one pass. Use the incremental approach:

1. Add `tsconfig.json` with `allowJs: true` and `checkJs: true` to get type checking on existing JS without renaming files
2. Rename files to `.ts`/`.tsx` starting with the shared library (`shared/lib/`) since it is consumed by both apps
3. Migrate the Zustand stores next — they have the most value from type safety
4. Migrate components last, starting with the smallest

Zod schemas already exist for runtime validation — reuse these as the source of truth for TypeScript types using `z.infer<typeof schema>`.

### 4.3 Add Tests

**Priority order:**
1. `shared/lib/combat/` — damage pipeline, dice expressions, condition application (highest risk if broken)
2. `shared/lib/rules/` — spell slots, rest mechanics, d20 resolution
3. Player store actions — damage, heal, spell cast (test the logic, mock Supabase)
4. LoginScreen — character selection, password validation

Use the existing Vitest + Chai setup. Do not introduce Jest or another runner.

---

## Patterns to Follow

### Zustand Stores

- Keep stores as slices combined at the top level
- Actions live in the store, not in components
- Components read from the store and call actions — they do not contain business logic
- Async actions use a `loading` + `error` pattern:

```javascript
loadCampaign: async (slug) => {
  set({ loading: true, error: null })
  try {
    const data = await fetchCampaign(slug)
    set({ campaign: data, loading: false })
  } catch (e) {
    set({ error: e.message, loading: false })
  }
}
```

### Supabase Queries

- Always handle the `{ data, error }` destructure — never ignore `error`
- Use `.select()` with explicit column lists — avoid `select('*')` in production paths
- Real-time subscriptions must be unsubscribed on component unmount
- Database mutations from the player app must match the RLS policy boundaries (see Priority 1)

### Components

- Keep components under 300 lines. If a component exceeds this, split it.
- No business logic in components — move it to the Zustand store or a `lib/` module
- No direct Supabase calls from components — all DB access goes through the store
- Use `React.memo` only when you have measured a real performance problem — not preemptively

### CSS (Player App)

- Use the existing CSS variable system defined in `styles.css`
- No new inline style objects in new code
- No new `!important` declarations
- Prefer adding a class to `styles.css` over adding an inline style

### CSS (DM App)

- Use Tailwind utility classes
- Avoid custom CSS classes unless Tailwind cannot express the style
- Keep the existing dark theme tokens consistent

### Migrations

- Never edit existing migration files — always create a new one
- Use the timestamp format already established: `YYYYMMDDHHMMSS_description.sql`
- All new tables must have RLS enabled and meaningful policies (not `USING (true)`)
- Include a rollback comment at the top of each migration

---

## What Not to Do

- Do not add new feature flags without a clear removal plan
- Do not add new hardcoded campaign references (`'green-hunger'`, `'session-1'`)
- Do not add `dist/` builds to git — these should be generated by CI
- Do not add external UI component libraries (no Radix, no shadcn, no MUI) — keep the existing styling approach
- Do not add a backend layer (Express, Next.js API routes, etc.) — Supabase Edge Functions are the right place for server-side logic if needed
- Do not modify the D&D rules engine (`shared/lib/rules/`) without running the full test suite — this is the most logic-dense and highest-risk code in the codebase
- Do not rename or restructure the `shared/` library without updating all imports in both `dm/` and `players/` apps
- Do not use `any` in TypeScript — use `unknown` and narrow it, or define a proper type

---

## File Map — Key Files to Know

| File | Purpose |
|---|---|
| `shared/lib/supabase.js` | Supabase client config — single instance shared across both apps |
| `shared/lib/featureFlags.js` | All feature flag definitions |
| `shared/lib/combat/` | Combat resolution engine |
| `shared/lib/rules/` | D&D 5e mechanics (damage, conditions, spells, rests) |
| `shared/content/` | Bundled static campaign data (fallback only) |
| `dm/src/App.jsx` | DM app root — auth gate, mode switching |
| `dm/src/stores/` | All DM Zustand stores |
| `dm/src/features/` | Feature modules (runtime, builder, combat, spells, etc.) |
| `supabase/schema.sql` | Full database schema |
| `supabase/migrations/` | Ordered SQL migrations |
| `players/src/App.jsx` | Player app root — character selection and view routing |
| `players/src/stores/playerStore.js` | All player state + Supabase subscriptions |
| `players/src/components/CharacterProfile.jsx` | Player action hub — needs splitting |
| `players/src/components/LoginScreen.jsx` | Character selection and auth |

---

## Definition of Done

A task is complete when:
- [ ] The code change works as intended
- [ ] No hardcoded credentials, campaign slugs, or magic strings have been introduced
- [ ] Error states are handled and surfaced to the user
- [ ] No `console.log` statements left in production paths
- [ ] Relevant tests pass (`npm test` in the affected app)
- [ ] ESLint passes with no new warnings (once ESLint is set up)
- [ ] The `dist/` folder has not been committed

---

*Last updated: April 2026. Based on full codebase audit of green-hunger-v7 and greenhunger-players.*
