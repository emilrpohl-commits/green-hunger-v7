-- =============================================================================
-- Auth & RLS hardening (template — run manually after enabling Supabase Auth)
-- =============================================================================
-- Today the app uses the anon key with permissive "allow all" policies in
-- schema.sql. To tighten:
--   1. Enable Email (and/or Anonymous) auth in Supabase Dashboard.
--   2. Create DM users; optionally enable anonymous sign-in for players.
--   3. Replace broad policies with role-specific rules, e.g.:
--
--   drop policy if exists allow_all_campaigns on campaigns;
--   create policy campaigns_read_authenticated on campaigns
--     for select using (auth.role() = 'authenticated');
--
--   Keep or add separate anon read policies only for tables the player SPA
--   must read without a logged-in user (session_state, combat_state, etc.).
--
-- Do not run this file as-is: it is documentation and a starting point.

do $$
begin
  if to_regclass('public.campaigns') is not null then
    comment on table campaigns is 'RLS: tighten with auth.uid() / roles when moving off anon-only deployment.';
  end if;
end $$;
