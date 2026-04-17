-- Bootstrap-safe stub for runtime campaign helper + scoped RLS rollout.
-- Full policy rewrites are intentionally skipped when base runtime tables are
-- not yet available in this migration chain.

create or replace function public.gh_session_state_campaign_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select null::uuid;
$$;

grant execute on function public.gh_session_state_campaign_id() to anon, authenticated;
