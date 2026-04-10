-- Stage 7: portrait storage + crop metadata for characters, stat blocks, and NPCs.

alter table public.characters
  add column if not exists portrait_original_storage_path text,
  add column if not exists portrait_crop jsonb default '{}'::jsonb,
  add column if not exists portrait_thumb_storage_path text;

alter table public.stat_blocks
  add column if not exists portrait_original_storage_path text,
  add column if not exists portrait_crop jsonb default '{}'::jsonb,
  add column if not exists portrait_thumb_storage_path text;

alter table public.npcs
  add column if not exists portrait_original_storage_path text,
  add column if not exists portrait_crop jsonb default '{}'::jsonb,
  add column if not exists portrait_thumb_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portraits', 'portraits', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_read_portraits'
  ) then
    create policy allow_public_read_portraits
      on storage.objects
      for select
      using (bucket_id = 'portraits');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_write_portraits'
  ) then
    create policy allow_public_write_portraits
      on storage.objects
      for insert
      with check (bucket_id = 'portraits');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_update_portraits'
  ) then
    create policy allow_public_update_portraits
      on storage.objects
      for update
      using (bucket_id = 'portraits')
      with check (bucket_id = 'portraits');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'allow_public_delete_portraits'
  ) then
    create policy allow_public_delete_portraits
      on storage.objects
      for delete
      using (bucket_id = 'portraits');
  end if;
end $$;
