-- DM soundboard core schema: audio assets, playlists, and storage bucket.

create table if not exists public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  name text not null,
  type text not null default 'sfx',
  storage_path text not null,
  duration_seconds numeric(10,2),
  tags text[] default '{}',
  loop_default boolean default false,
  volume_default numeric(5,4) default 1.0,
  favorite boolean default false,
  scene_id uuid references public.scenes(id) on delete set null,
  encounter_id uuid references public.encounters(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint audio_assets_type_check check (type in ('background', 'sfx'))
);

create table if not exists public.audio_playlists (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  name text not null,
  type text not null default 'sfx',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint audio_playlists_type_check check (type in ('background', 'sfx'))
);

create table if not exists public.audio_playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references public.audio_playlists(id) on delete cascade not null,
  asset_id uuid references public.audio_assets(id) on delete cascade not null,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scenes
  add column if not exists default_background_playlist_id uuid references public.audio_playlists(id) on delete set null,
  add column if not exists default_background_asset_id uuid references public.audio_assets(id) on delete set null,
  add column if not exists default_sfx_playlist_id uuid references public.audio_playlists(id) on delete set null;

alter table public.encounters
  add column if not exists default_background_playlist_id uuid references public.audio_playlists(id) on delete set null,
  add column if not exists default_background_asset_id uuid references public.audio_assets(id) on delete set null,
  add column if not exists default_sfx_playlist_id uuid references public.audio_playlists(id) on delete set null;

create index if not exists audio_assets_campaign_type_name_idx
  on public.audio_assets(campaign_id, type, name);
create index if not exists audio_assets_scene_idx on public.audio_assets(scene_id);
create index if not exists audio_assets_encounter_idx on public.audio_assets(encounter_id);
create index if not exists audio_playlists_campaign_type_name_idx
  on public.audio_playlists(campaign_id, type, name);
create unique index if not exists audio_playlist_items_playlist_asset_uniq
  on public.audio_playlist_items(playlist_id, asset_id);
create unique index if not exists audio_playlist_items_playlist_position_uniq
  on public.audio_playlist_items(playlist_id, position);

alter table public.audio_assets enable row level security;
alter table public.audio_playlists enable row level security;
alter table public.audio_playlist_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audio_assets' and policyname = 'allow_all_audio_assets'
  ) then
    create policy allow_all_audio_assets
      on public.audio_assets
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audio_playlists' and policyname = 'allow_all_audio_playlists'
  ) then
    create policy allow_all_audio_playlists
      on public.audio_playlists
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audio_playlist_items' and policyname = 'allow_all_audio_playlist_items'
  ) then
    create policy allow_all_audio_playlist_items
      on public.audio_playlist_items
      for all
      using (true)
      with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  true,
  31457280,
  array[
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_read_audio'
  ) then
    create policy allow_public_read_audio
      on storage.objects
      for select
      using (bucket_id = 'audio');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_write_audio'
  ) then
    create policy allow_public_write_audio
      on storage.objects
      for insert
      with check (bucket_id = 'audio');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_update_audio'
  ) then
    create policy allow_public_update_audio
      on storage.objects
      for update
      using (bucket_id = 'audio')
      with check (bucket_id = 'audio');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_delete_audio'
  ) then
    create policy allow_public_delete_audio
      on storage.objects
      for delete
      using (bucket_id = 'audio');
  end if;
end $$;
