# Stage 2 — Seedless platform (implemented)

This document records what shipped for **Stage 2** so later stages can assume stable flags and UX entry points.

## Environment variables

| Variable | Default | Effect |
|----------|---------|--------|
| `VITE_SEEDLESS_PLATFORM` | off (`0`) | When **on** and demo is **off**, the DM app lists campaigns from Supabase instead of implicitly loading `green-hunger`. Zero rows → empty states; one row → auto-load that slug; two or more → pick list in Run mode and Builder. |
| `VITE_DEMO_CAMPAIGN` | off | When **on**, implicit slug stays `green-hunger` (and bundled player defaults remain available when combined with default seedless off). |
| `VITE_APP_TITLE` | `Campaign Console` | Replaces hard-coded product title in DM and player chrome. |

Legacy behaviour is unchanged when `VITE_SEEDLESS_PLATFORM` is not set: `loadCampaign()` without arguments still resolves to `green-hunger`.

## DM UX

- **Run (`/` → run layout):** seedless + no loaded campaign shows `SeedlessCampaignHome` with Builder link and optional multi-campaign buttons.
- **Builder:** same pick list when `campaignChoices` is populated; empty DB message mentions seedless when the flag is on.
- **Top bar:** shows `VITE_APP_TITLE` and campaign title when loaded.

## Player UX

- With **seedless on** and **demo off**, initial `characters` / `playerCharacters` start empty until `loadCharacters` succeeds.
- If the DB returns no valid character rows in that mode, the store clears runtime party data instead of keeping stale bundled sheets.
- **Login:** always offers **Party observer**; when no PCs exist, shows guidance and mentions `VITE_DEMO_CAMPAIGN`.
- **Character profile:** missing sheet for the logged-in id shows “No character assigned” and **Back to login**.
- **Scene errors:** copy mentions seedless / campaign load where relevant.

## Not in scope (follow-up)

- In-app “Create campaign” (insert into `campaigns`) — still manual or via migration/scripts.
- Removing `shared/content/*` files — gated by flags only; deletion waits for DB parity (per plan).

See also [`architecture.md`](./architecture.md), [`schema-migration-checklist.md`](./schema-migration-checklist.md), and Stage 3 notes in [`stage-3-reference-library.md`](./stage-3-reference-library.md).
