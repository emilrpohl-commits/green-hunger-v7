-- Green Hunger corruption progression (integer count; extended meta in tactical_json.greenMarksState)
do $$
begin
  if to_regclass('public.character_states') is not null then
    alter table public.character_states
      add column if not exists green_marks integer not null default 0;

    comment on column public.character_states.green_marks is
      'Green Mark count (0–5+). Effect definitions live in app; tactical_json.greenMarksState may hold max, lastTriggeredAt.';
  end if;
end $$;
