-- Guard migration for clean bootstrap environments where combat tables may be absent.
-- The auth-caller check variant of apply_combat_damage is only relevant when
-- public.combat_state/public.combat_feed exist.

do $$
begin
  if to_regclass('public.combat_state') is not null
     and to_regclass('public.combat_feed') is not null then
    -- Function override intentionally omitted in bootstrap path.
    -- Previous migration already defines apply_combat_damage when tables exist.
    null;
  end if;
end $$;
