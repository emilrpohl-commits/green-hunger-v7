# green-hunger-v7

Practice PR: repository and branch workflow validated.

## CI

GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, typecheck, tests, and build for DM + players, plus Supabase migration/policy smoke checks. Configure repo secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` for the Pages workflow build.

## Commit message convention

Use concise, intent-first commit messages to keep history searchable:

- `feat(dm): add combat turn-order lock for manual overrides`
- `fix(players): guard null stat block in runtime card`
- `chore(ci): add supabase migration smoke check`
- `test(dm): cover session import payload mapping`

Format: `<type>(<scope>): <why + what>`, where `type` is typically one of `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`.

