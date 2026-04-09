-- Run this in Supabase SQL Editor
-- Phase 3: Reveal System

-- ============================================
-- TABLE: reveals
-- Cards the DM pushes to the player screen
-- ============================================
create table if not exists reveals (
  id bigserial primary key,
  session_id text not null,
  card_id text not null,
  category text,
  title text not null,
  content text not null,
  tone text default 'narrative',
  revealed_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table reveals enable row level security;

create policy "Allow public read on reveals"
  on reveals for select using (true);

create policy "Allow public insert on reveals"
  on reveals for insert with check (true);

create policy "Allow public delete on reveals"
  on reveals for delete using (true);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table reveals;
