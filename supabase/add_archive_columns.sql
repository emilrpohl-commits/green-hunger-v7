-- Add soft-archive support for key content tables.
-- Run once in Supabase SQL editor.

alter table public.sessions
  add column if not exists archived_at timestamptz;

alter table public.stat_blocks
  add column if not exists archived_at timestamptz;

