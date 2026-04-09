-- Run this entire script in the Supabase SQL Editor
-- Project: green-hunger
-- This creates all tables V7 needs

-- ============================================
-- TABLE: session_state
-- Tracks which scene and beat the DM is on
-- ============================================
create table if not exists session_state (
  id text primary key,
  current_scene_index integer default 0,
  current_beat_index integer default 0,
  updated_at timestamptz default now()
);

-- Insert the default session row
insert into session_state (id, current_scene_index, current_beat_index)
values ('session-1', 0, 0)
on conflict (id) do nothing;

-- ============================================
-- TABLE: character_states
-- Tracks live HP, spell slots, conditions etc
-- ============================================
create table if not exists character_states (
  id text primary key,
  cur_hp integer,
  max_hp integer,
  temp_hp integer default 0,
  concentration boolean default false,
  spell_slots jsonb,
  death_saves jsonb,
  conditions jsonb default '[]',
  updated_at timestamptz default now()
);

-- Insert default rows for each character
insert into character_states (id, cur_hp, max_hp, temp_hp, concentration, spell_slots, death_saves, conditions)
values
  ('dorothea', 43, 43, 0, false, '{"1": {"max": 4, "used": 0}, "2": {"max": 3, "used": 0}}', '{"successes": 0, "failures": 0}', '[]'),
  ('kanan',    26, 26, 0, false, '{"1": {"max": 4, "used": 0}, "2": {"max": 3, "used": 0}}', '{"successes": 0, "failures": 0}', '[]'),
  ('danil',    26, 26, 0, false, '{"1": {"max": 4, "used": 0}, "2": {"max": 3, "used": 0}}', '{"successes": 0, "failures": 0}', '[]')
on conflict (id) do nothing;

-- ============================================
-- ROW LEVEL SECURITY
-- Allow all reads and writes for now
-- (Simple setup — no auth required)
-- ============================================
alter table session_state enable row level security;
alter table character_states enable row level security;

-- Allow anyone to read
create policy "Allow public read on session_state"
  on session_state for select using (true);

create policy "Allow public read on character_states"
  on character_states for select using (true);

-- Allow anyone to write (DM app writes, no auth needed for now)
create policy "Allow public insert on session_state"
  on session_state for insert with check (true);

create policy "Allow public update on session_state"
  on session_state for update using (true);

create policy "Allow public insert on character_states"
  on character_states for insert with check (true);

create policy "Allow public update on character_states"
  on character_states for update using (true);

-- ============================================
-- REALTIME
-- Enable realtime for both tables
-- ============================================
alter publication supabase_realtime add table session_state;
alter publication supabase_realtime add table character_states;
