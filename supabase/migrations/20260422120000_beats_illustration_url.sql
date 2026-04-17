-- Optional image for a beat (Supabase Storage path in scene-media bucket).
do $$
begin
  if to_regclass('public.beats') is not null then
    alter table public.beats add column if not exists illustration_url text;
  end if;
end $$;
