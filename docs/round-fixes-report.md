# Green Hunger — Next-round fixes (verification report)

**Date:** 2026-04-16  
**Scope:** Plan checkpoints A–C (immediate, next-wave, stabilize, time-allowed) per `Project Instructions/project-fixes.md` + normalized map `docs/project-fixes-path-map.md`.

## Verification gates (local)

| Gate | Command | Result |
|------|---------|--------|
| DM production build | `cd dm && npm run build` | ✅ Pass |
| Players production build | `cd players && npm run build` | ✅ Pass |
| Shared + players tests | `cd players && npm test -- --run` | ✅ 52 tests |
| DM ESLint | `cd dm && npm run lint` | ✅ 0 errors (warnings pre-existing / incremental) |

## Notable fixes during verification

1. **`dompurify` + shared imports** — Rollup could not resolve `dompurify` from `../shared` in DM/Players Vite builds. **Fix:** `resolve.alias.dompurify` → each app’s `node_modules/dompurify` in `dm/vite.config.js` and `players/vite.config.js`.
2. **DOMPurify v3 API** — Default export is `createDOMPurify`, not `sanitize` directly. **`shared/lib/sanitizeUserText.js`** uses `createDOMPurify(window)` in the browser; on SSR/tests without `window`, falls back to stripping `<…>` tags so Vitest (`DiceInlineText`) stays green.
3. **Rules of hooks** — **`SceneEditor.jsx`:** moved `useMemo` / refs / autosave `useEffect` before the `!scene` early return. **`SpellCompendiumBrowser.jsx`:** `useCombatStore` moved before `if (!spell)` in `SpellCompendiumDetail`.

## Follow-ups (manual / DB)

- Apply new Supabase migrations on a **copy** of production data before prod; slug dedupe migration deletes duplicate rows.
- Smoke-test RLS for `characters` / `character_spells` with DM JWT + player session after migration.
- If real session imports fail Zod validation, relax `shared/lib/validation/importPayloadSchema.js` with nullable/optional fields as needed (keep structured errors in UI).

## Plan deltas

- **FIX-P02:** Plan listed `react-window` for large scenes; current implementation uses **`React.memo(BeatRow)`** and related optimizations without adding `react-window` to `dm/package.json` (avoids new dep surface until measured need).
