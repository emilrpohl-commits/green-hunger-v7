# Green Hunger — layout

- `shared/` — content, types, Supabase client, future static assets
- `tools/` — DOCX/stat block/spell parsing (used by DM app)
- `supabase/` — `schema.sql` and browser-callable `migrate.js`
- `dm/` — DM Vite app (`src/features/*` + `stores/`)
- `players/` — player Vite app

Vite aliases: `@shared`, `@tools`, `@supabase-root` (see each app’s `vite.config.js`).
