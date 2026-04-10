---
name: Architecture product report
overview: "Follow-up to the structural refactor: a repository-grounded architecture and product-direction assessment, with a concrete prioritized roadmap and workstreams (Parts 7–9 of the requested report)."
todos:
  - id: validate-boundaries
    content: Add runtime validation (e.g. Zod) at Supabase→store boundaries for combatants, characters, spells, beats
    status: completed
  - id: player-session-source
    content: "Resolve player session content: DB-hydrate vs index-only; align with DM syncContentFromDb"
    status: completed
  - id: legacy-session-run
    content: Audit/remove session-1 and combat/combat-trigger special cases; standardize on session_run_id
    status: completed
  - id: styling-system
    content: Introduce CSS modules or Tailwind; migrate high-churn components with breakpoints
    status: completed
  - id: import-unify
    content: Extract shared parse+validate used by SessionImportModal and CLI tools
    status: completed
  - id: supabase-auth
    content: Replace client password gates with Supabase Auth and tighten RLS
    status: completed
isProject: false
---

# Prioritized roadmap and workstreams (extract)

This complements the full narrative report in the chat. Items assume current code in [dm/](dm/), [players/](players/), [shared/](shared/), [supabase/schema.sql](supabase/schema.sql).

## Do now (foundational)

1. **Boundary validation (Zod or similar) at store boundaries** — Parse `combatants` JSONB, `character_states` rows, and critical `characters` / `spells` shapes before merging into Zustand. *Why:* cryptic UI failures today. *Unlocks:* safer schema evolution and clearer bugs.

2. **Single source of truth for player session narrative** — Today [players/src/stores/playerStore/index.js](players/src/stores/playerStore/index.js) seeds `session` from [shared/content/session1.js](shared/content/session1.js) while [players/src/stores/playerStore/realtimeSlice.js](players/src/stores/playerStore/realtimeSlice.js) only syncs indices from `session_state`. Decide: either hydrate player session from DB (like DM `syncContentFromDb`) or document and enforce “indices only” as intentional. *Why:* DM and player can disagree on content. *Unlocks:* trustworthy player-facing beat/scene text.

3. **Remove or quarantine legacy hacks** — e.g. `session_id === 'session-1'` in DM roll feed filtering ([players/src/stores/playerStore/realtimeSlice.js](players/src/stores/playerStore/realtimeSlice.js)), dual naming `combat` vs `combat trigger` ([dm/src/stores/sessionStore.js](dm/src/stores/sessionStore.js)). *Why:* silent wrong-target bugs when `session_run_id` diverges. *Unlocks:* multi-table / multi-campaign readiness.

## Do next (major features)

4. **Styling system (CSS modules or Tailwind) + breakpoints** — Incremental migration off inline styles in highest-churn components. *Why:* responsive DM console and consistent theming. *Unlocks:* tablet DM, denser combat UI.

5. **Unify import pipeline** — [dm/src/features/builder/SessionImportModal.jsx](dm/src/features/builder/SessionImportModal.jsx) imports `@tools/parseDocxSession.js` in the browser; CLI tools use parallel paths. Shared package for parse + validate + preview model. *Why:* one grammar for session markdown. *Unlocks:* reliable authoring loop.

6. **Auth (Supabase Auth) + RLS hardening** — Replace client-only gates ([players/src/components/LoginScreen.jsx](players/src/components/LoginScreen.jsx), DM gate in [dm/src/App.jsx](dm/src/App.jsx)). *Why:* current model is obfuscation, not security. *Unlocks:* any shared hosting or multi-group use.

## Do later

7. **Combat lifecycle as explicit state machine** — Formalize transitions (initiative, rounds, end) and invariants; keep [shared/lib/combatRules.js](shared/lib/combatRules.js) as rule helpers. *Unlocks:* legendary/lair, phases, automated tests.

8. **TypeScript in `shared/` first** — Types that match DB and runtime. *Unlocks:* fewer drift bugs between JSDoc and reality.

---

## Suggested workstreams

| Track | Purpose | Current state | Next |
|-------|---------|---------------|------|
| Core schemas / validation | One canonical shape per entity at boundaries | JSDoc + implicit store shapes | Zod (or similar) + shared parsers |
| Combat | Shared live combat across DM and players | [dm/src/stores/combatStore/](dm/src/stores/combatStore/), [players/.../combatSlice.js](players/src/stores/playerStore/combatSlice.js), `combat_state` table | State machine + test harness; tighten `session_run_id` semantics |
| Content (spells, monsters) | Libraries + engine | [shared/lib/engine/](shared/lib/engine/), `spells` / `stat_blocks` in DB | Validation; reduce static fallbacks in [partyRoster.js](shared/lib/partyRoster.js) |
| Session builder | Author sessions in app | Sliced outliner under [dm/src/features/sessions/](dm/src/features/sessions/) | Optional: consequences table UI; preview mode |
| Import pipeline | Markdown → DB | [SessionImportModal.jsx](dm/src/features/builder/SessionImportModal.jsx) + [tools/parseDocxSession.js](tools/parseDocxSession.js) | Shared module; golden tests on parse output |
| Realtime / multiplayer | Firehose of truth | `session_state`, `character_states`, `combat_state`, `combat_feed` + channels | Single subscription policy doc; remove legacy ID branches |
| UI / design system | Tokens + components | [players/dm]/styles.css + heavy inline | Extract patterns from outliner refactor; breakpoints |
| Testing | Regression safety | Sparse tests | Vitest: parsers, combatRules, store reducers (pure slices) |

## Rebuild vs refactor (summary)

**Keep refactoring in place; do not rewrite.** Schema, shared engine, and working play loops are the expensive assets. Next investments: validation, auth, narrative sync honesty, and import unification—not a greenfield app.
