-- Run this in Supabase SQL Editor
-- Phase 2: Combat System tables

-- ============================================
-- TABLE: combat_state
-- Tracks live combat: who's active, round, combatants
-- ============================================
create table if not exists combat_state (
  id text primary key,
  active boolean default false,
  round integer default 1,
  active_combatant_index integer default 0,
  combatants jsonb default '[]',
  updated_at timestamptz default now()
);

insert into combat_state (id, active, round, active_combatant_index, combatants)
values ('session-1', false, 1, 0, '[]')
on conflict (id) do nothing;

-- ============================================
-- TABLE: combat_feed
-- Log of combat events, some shared with players
-- ============================================
create table if not exists combat_feed (
  id bigserial primary key,
  session_id text not null,
  round integer default 1,
  text text not null,
  type text default 'action',
  shared boolean default false,
  timestamp timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table combat_state enable row level security;
alter table combat_feed enable row level security;

create policy "Allow public read on combat_state"
  on combat_state for select using (true);

create policy "Allow public insert on combat_state"
  on combat_state for insert with check (true);

create policy "Allow public update on combat_state"
  on combat_state for update using (true);

create policy "Allow public read on combat_feed"
  on combat_feed for select using (true);

create policy "Allow public insert on combat_feed"
  on combat_feed for insert with check (true);

create policy "Allow public delete on combat_feed"
  on combat_feed for delete using (true);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table combat_state;
alter publication supabase_realtime add table combat_feed;
