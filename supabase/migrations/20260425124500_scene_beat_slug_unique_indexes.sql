-- Rollback: drop the two unique indexes created below (manual).

do $$
begin
  if to_regclass('public.scenes') is not null then
    -- Remove duplicate scene slugs per session (keep oldest row by created_at).
    delete from public.scenes s
    using (
      select id,
             row_number() over (
               partition by session_id, lower(btrim(slug))
               order by created_at asc nulls first, id asc
             ) as rn
      from public.scenes
      where slug is not null and btrim(slug) <> ''
    ) d
    where s.id = d.id and d.rn > 1;

    create unique index if not exists scenes_session_slug_unique
      on public.scenes (session_id, lower(btrim(slug)))
      where slug is not null and btrim(slug) <> '';
  end if;

  if to_regclass('public.beats') is not null then
    -- Remove duplicate beat slugs per scene (keep oldest).
    delete from public.beats b
    using (
      select id,
             row_number() over (
               partition by scene_id, lower(btrim(slug))
               order by created_at asc nulls first, id asc
             ) as rn
      from public.beats
      where slug is not null and btrim(slug) <> ''
    ) d
    where b.id = d.id and d.rn > 1;

    create unique index if not exists beats_scene_slug_unique
      on public.beats (scene_id, lower(btrim(slug)))
      where slug is not null and btrim(slug) <> '';
  end if;
end $$;
