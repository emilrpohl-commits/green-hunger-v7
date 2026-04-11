-- Scene imagery, session map videos, spell SFX URL, beat flavour text

alter table public.scenes add column if not exists image_url text;
alter table public.scenes add column if not exists scene_images jsonb default '[]'::jsonb;

alter table public.sessions add column if not exists session_maps jsonb default '[]'::jsonb;

alter table public.spells add column if not exists sound_effect_url text;

alter table public.beats add column if not exists flavour_text text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scene-media',
  'scene-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-maps',
  'session-maps',
  true,
  104857600,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'scene_media_public_read'
  ) then
    create policy scene_media_public_read on storage.objects
      for select using (bucket_id = 'scene-media');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'scene_media_authenticated_write'
  ) then
    create policy scene_media_authenticated_write on storage.objects
      for all using (bucket_id = 'scene-media') with check (bucket_id = 'scene-media');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'session_maps_public_read'
  ) then
    create policy session_maps_public_read on storage.objects
      for select using (bucket_id = 'session-maps');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'session_maps_authenticated_write'
  ) then
    create policy session_maps_authenticated_write on storage.objects
      for all using (bucket_id = 'session-maps') with check (bucket_id = 'session-maps');
  end if;
end $$;
