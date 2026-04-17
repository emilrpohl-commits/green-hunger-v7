# project-fixes.md — normalized file map

Corrections to paths in [Project Instructions/project-fixes.md](../Project%20Instructions/project-fixes.md) for the **monorepo** layout (`dm/`, `players/`, `shared/`).

| Fix ID | Doc path (if stale) | Actual path in repo |
|--------|---------------------|---------------------|
| FIX-B01 | `dm/src/features/builder/SceneEditor.jsx` | [dm/src/features/sessions/SceneEditor.jsx](../dm/src/features/sessions/SceneEditor.jsx) |
| FIX-S04 | `dm/src/features/statblocks/ImportModal.jsx` | [dm/src/features/builder/ImportModal.jsx](../dm/src/features/builder/ImportModal.jsx) |
| FIX-B02 | `SessionsList.jsx` | [dm/src/features/sessions/SessionOutliner.jsx](../dm/src/features/sessions/SessionOutliner.jsx), [SceneRow.jsx](../dm/src/features/sessions/SceneRow.jsx), [SessionEditor.jsx](../dm/src/features/sessions/SessionEditor.jsx) |
| FIX-B03 | `SessionsList.jsx` | [SessionOutliner.jsx](../dm/src/features/sessions/SessionOutliner.jsx) |

Shared Supabase client: [shared/lib/supabase.js](../shared/lib/supabase.js) (used by both apps).
