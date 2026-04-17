# Release hardening (upgrade rollout)

Use after merging security + RLS migrations.

## Pre-deploy

1. **Supabase**
   - Enable **Anonymous sign-ins** (Authentication → Providers) so player JWT `user_metadata` claims apply.
   - Apply new migrations (`20260424100000_*`, `20260424103000_*`).
   - Create GitHub Actions secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (anon key) for Pages builds.

2. **Environment**
   - DM: `.env.local` from [`dm/.env.example`](../dm/.env.example).
   - Players: `.env.local` from [`players/.env.example`](../players/.env.example); set `VITE_PARTY_OBSERVER_PASSWORD` if using party observer.

3. **Verify**
   - `cd dm && npm ci && npm run lint && npm run typecheck && npm run build`
   - `cd players && npm ci && npm run lint && npm run typecheck && npm test && npm run build`

## Rollback (RLS)

If player/DM clients fail after policy deploy:

1. Re-apply permissive policies from [`supabase/schema.sql`](../supabase/schema.sql) `allow_all_*` DO block (manual SQL in Supabase SQL editor), **or**
2. Restore DB from backup taken immediately before migration.

## Definition of Done

See [Project Instructions/project-upgrade.md](../Project%20Instructions/project-upgrade.md) checklist and [docs/upgrade-baseline-checklist.md](./upgrade-baseline-checklist.md).
