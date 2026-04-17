-- Runtime RLS helper functions.
-- Note: policy hardening is intentionally guarded/no-op in clean bootstrap
-- environments where legacy runtime tables may not exist yet.

create or replace function public.gh_is_dm_jwt()
returns boolean
language sql
stable
set search_path = public
as $$
  select nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '') is not null;
$$;

create or replace function public.gh_is_party_observer_jwt()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'gh_party_observer', '') = 'true';
$$;

create or replace function public.gh_player_session_run_id()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'gh_session_run_id', '')), '');
$$;

create or replace function public.gh_player_character_id()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'gh_character_id', '')), '');
$$;

create or replace function public.gh_is_player_character_jwt()
returns boolean
language sql
stable
set search_path = public
as $$
  select not public.gh_is_dm_jwt()
    and not public.gh_is_party_observer_jwt()
    and public.gh_player_session_run_id() is not null
    and public.gh_player_character_id() is not null;
$$;

grant execute on function public.gh_is_dm_jwt() to anon, authenticated;
grant execute on function public.gh_is_party_observer_jwt() to anon, authenticated;
grant execute on function public.gh_player_session_run_id() to anon, authenticated;
grant execute on function public.gh_player_character_id() to anon, authenticated;
grant execute on function public.gh_is_player_character_jwt() to anon, authenticated;
