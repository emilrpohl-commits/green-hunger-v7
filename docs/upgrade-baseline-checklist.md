# Upgrade baseline checklist

Maps [Project Instructions/project-upgrade.md](../Project%20Instructions/project-upgrade.md) to this repo. Update statuses as work completes.

## Priority 1 — Security

| Item | Acceptance | Status |
|------|------------|--------|
| 1.1 No hardcoded DM / party passwords | No secrets in `dm/`, `players/`, or GitHub Actions HTML | Done (env / Supabase) |
| 1.2 RLS scoped | New migrations replace `allow_all_*` on runtime tables | Done — apply `20260424100000_*` |
| 1.3 Player writes bound to identity | JWT `user_metadata` + RLS + `apply_combat_damage` guard | Done |
| 1.4 DM unlock | TTL JSON token or Supabase session; dev bypass = Vite dev only | Done |
| 1.5 Supabase env | `.env.example` in both apps; prod build needs env (no hardcoded fallback) | Done |

## Priority 2 — Quality

| Item | Acceptance | Status |
|------|------------|--------|
| 2.1 CharacterProfile split | Shell + tabs; &lt; ~500 lines shell | Mostly done |
| 2.2 Campaign store split | Focused slices under `dm/src/stores/campaignStore/` | Track in PR |
| 2.3 Error surfacing | User-visible errors on critical async paths | Track in PR |
| 2.4 Error boundaries | Root + major panels | Track in PR |
| 2.5 Player loading | Store `loading` + UI | Track in PR |
| 2.6 Player CSS | Priority components use classes | Track in PR |

## Priority 3 — Architecture

| Item | Acceptance | Status |
|------|------------|--------|
| 3.1 Seedless | DB campaign/session primary; `green-hunger` demo-only | Track in PR |
| 3.2 Feature flags | Stale flags removed; remaining documented | Track in PR |
| 3.3 Multi-session | `active_session_uuid` + `session_run_id` aligned | Track in PR |

## Priority 4 — DX

| Item | Acceptance | Status |
|------|------------|--------|
| 4.1 ESLint / Prettier | Both apps `lint` / `format` | Track in PR |
| 4.2 TypeScript | `tsconfig` + incremental `checkJs` | Track in PR |
| 4.3 Tests | Order: combat → rules → store → login | Track in PR |

## Verification commands

```bash
cd dm && npm ci && npm run build
cd players && npm ci && npm run build && npm test
```

## Definition of Done (release)

- [ ] No new hardcoded credentials or campaign slugs
- [ ] Errors surfaced where applicable
- [ ] Tests pass in `players/` (`shared/**/*.test.js` + app tests)
- [ ] ESLint clean (once configured)
- [ ] `dist/` not committed (gitignored)
