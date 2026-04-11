-- Optional image for a beat (Supabase Storage path in scene-media bucket).
alter table public.beats add column if not exists illustration_url text;
