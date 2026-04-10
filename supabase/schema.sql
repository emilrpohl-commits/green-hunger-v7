-- =============================================================================
-- GREEN HUNGER CAMPAIGN ENGINE — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CAMPAIGN STRUCTURE
-- ---------------------------------------------------------------------------

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                  -- e.g. 'green-hunger'
  title text not null,
  subtitle text,
  premise text,
  themes text[],
  tone text,
  setting text,
  rules_edition text default '5e',
  house_rules text,
  party_profile jsonb default '{}',           -- { size, level, composition notes }
  notes text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists arcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  "order" int not null default 0,
  title text not null,
  premise text,
  objective text,
  antagonist text,
  themes text[],
  key_locations text[],
  key_npc_ids uuid[],
  revelations text[],
  branch_points jsonb default '[]',
  clocks jsonb default '[]',                  -- [{ name, max, current, visible }]
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists adventures (
  id uuid primary key default gen_random_uuid(),
  arc_id uuid references arcs(id) on delete cascade not null,
  "order" int not null default 0,
  title text not null,
  hook text,
  objectives text[],
  stakes text,
  structure_type text,                        -- 'linear' | 'sandbox' | 'heist' | etc.
  completion_conditions text[],
  failure_conditions text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid references adventures(id) on delete cascade not null,
  "order" int not null default 0,
  session_number int,
  title text not null,
  subtitle text,
  estimated_duration text,
  recap text,
  objectives text[],
  contingency_notes text,
  post_session_notes text,
  archived_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  "order" int not null default 0,
  slug text,                                  -- stable identifier for branches (e.g. 's2-fork')
  title text not null,
  subtitle text,
  scene_type text,                            -- 'narrative' | 'combat' | 'exploration' | 'social' | 'puzzle' | 'transition'
  subtype text,
  purpose text,
  summary text,
  player_description text,                    -- what gets sent to player app
  dm_notes text,
  entry_conditions text,
  environment text,
  map_asset_id uuid,                          -- fk to assets
  estimated_time text,
  outcomes jsonb default '[]',               -- [{ label, consequence_ids[] }]
  fallback_notes text,
  fail_forward_notes text,
  scaling_notes text,
  is_published boolean default false,         -- controls player app visibility
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Branches live in their own table for clean relational queries
create table if not exists scene_branches (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references scenes(id) on delete cascade not null,
  "order" int not null default 0,
  label text not null,
  description text,
  condition_text text,                        -- human-readable condition
  condition_type text default 'explicit',     -- 'explicit' | 'implicit' | 'conditional'
  target_scene_id uuid references scenes(id),
  target_slug text,                           -- fallback if target not yet created
  is_dm_only boolean default false,
  created_at timestamptz default now()
);

-- Structured consequences: what happens when a branch is taken
create table if not exists consequences (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references scene_branches(id) on delete cascade,
  "order" int not null default 0,
  type text not null,                         -- 'npc_attitude' | 'scene_unlock' | 'scene_block' | 'clock_advance' | 'encounter_modify' | 'reveal' | 'custom'
  description text,
  target_id uuid,                             -- what entity is affected (npc_id, scene_id, etc.)
  target_type text,                           -- 'npc' | 'scene' | 'clock' | 'encounter'
  data jsonb default '{}',                    -- flexible payload: { new_attitude: 'hostile' } etc.
  is_player_visible boolean default false,
  created_at timestamptz default now()
);

create table if not exists beats (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references scenes(id) on delete cascade not null,
  "order" int not null default 0,
  slug text,
  title text not null,
  trigger_text text,
  type text not null default 'narrative',     -- 'narrative' | 'prompt' | 'check' | 'decision' | 'combat' | 'reveal' | 'transition'
  content text,                               -- main read-aloud or DM description
  player_text text,                           -- player-safe version if different
  dm_notes text,
  mechanical_effect text,
  stat_block_id uuid,                         -- fk to stat_blocks
  encounter_id uuid,                          -- fk to encounters
  asset_ids uuid[],                           -- maps/handouts to reveal
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- LIBRARIES / COMPENDIUMS
-- ---------------------------------------------------------------------------

create table if not exists stat_blocks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,  -- null = global
  slug text,                                  -- stable reference key
  name text not null,
  source text,
  creature_type text,
  size text,
  alignment text,
  cr text,
  proficiency_bonus int,
  ac int,
  ac_note text,
  max_hp int,
  hit_dice text,
  speed text,
  ability_scores jsonb default '{"STR":10,"DEX":10,"CON":10,"INT":10,"WIS":10,"CHA":10}',
  saving_throws jsonb default '[]',           -- [{ name, mod }]
  skills jsonb default '[]',                  -- [{ name, mod }]
  resistances text[],
  immunities jsonb default '{"damage":[],"condition":[]}',
  vulnerabilities text[],
  senses text,
  languages text,
  traits jsonb default '[]',                  -- [{ name, desc }]
  actions jsonb default '[]',                 -- [{ name, type, toHit, reach, damage, effect, desc }]
  bonus_actions jsonb default '[]',
  reactions jsonb default '[]',
  legendary_actions jsonb default '[]',
  lair_actions jsonb default '[]',
  spellcasting jsonb default '{}',
  combat_prompts jsonb default '[]',          -- [{ trigger, text }]
  dm_notes text[],
  loot_ids uuid[],
  portrait_url text,
  token_url text,
  cloned_from_reference_id uuid,
  tags text[],
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists spells (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  spell_id text,
  name text not null,
  level int not null,                         -- 0 = cantrip
  school text,
  casting_time text,
  range text,
  components jsonb default '{"V":false,"S":false,"M":null}',
  duration text,
  ritual boolean default false,
  concentration boolean default false,
  description text,
  higher_level_effect text,
  damage_dice text,
  damage_type text,
  healing_dice text,
  save_type text,                             -- 'STR'|'DEX'|'CON'|'INT'|'WIS'|'CHA'
  attack_type text,                           -- 'melee'|'ranged'|null
  resolution_type text,                       -- 'attack'|'save'|'auto'|'heal'|'utility'|'special'
  target_mode text,                           -- 'single'|'multi_select'|'area_all'|'area'|'special'|...
  save_ability text,                          -- 'STR'|'DEX'|'CON'|'INT'|'WIS'|'CHA'|null
  area jsonb default '{}',                    -- { shape, size, origin }
  scaling jsonb default '{}',                 -- parsed scaling metadata
  rules_json jsonb default '{}',              -- enriched parser output + confidence flags
  tags text[],
  source text,
  ruleset text default '2024',
  source_index text,
  source_url text,
  source_version text,
  imported_at timestamptz,
  classes text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists spells_raw (
  id uuid primary key default gen_random_uuid(),
  spell_id text not null,
  source_file text not null default 'docs/Green_Hunger_Spells_App_Ready.json',
  raw_json jsonb not null,
  normalized_hash text,
  imported_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Player-side character spell mapping (used by players/src/stores/playerStore.js)
create table if not exists character_spells (
  id uuid primary key default gen_random_uuid(),
  character_id text not null,
  slot_level text not null,                   -- 'cantrip' | '1' | '2' ...
  order_index int not null default 0,
  spell_id text,                              -- canonical link to spells.spell_id
  spell_data jsonb default '{}',              -- fallback/legacy payload
  overrides_json jsonb default '{}',          -- per-character tuning
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table character_spells
  add column if not exists spell_id text,
  add column if not exists spell_data jsonb default '{}',
  add column if not exists overrides_json jsonb default '{}',
  add column if not exists order_index int not null default 0,
  add column if not exists updated_at timestamptz default now();

alter table spells
  add column if not exists ruleset text default '2024',
  add column if not exists source_index text,
  add column if not exists source_url text,
  add column if not exists source_version text,
  add column if not exists imported_at timestamptz,
  alter column spell_id set not null;
create unique index if not exists spells_spell_id_unique on spells(spell_id);
create unique index if not exists spells_raw_spell_id_unique on spells_raw(spell_id);
create index if not exists spells_resolution_type_idx on spells(resolution_type);
create index if not exists spells_level_name_idx on spells(level, name);
create index if not exists character_spells_character_slot_order_idx on character_spells(character_id, slot_level, order_index);
create index if not exists character_spells_spell_id_idx on character_spells(spell_id);

-- Static PC / companion sheets (players/src/stores/playerStore.js loadCharacters + party roster)
create table if not exists characters (
  id text primary key,
  campaign_id uuid references campaigns(id) on delete set null,
  name text not null,
  password text,
  class text not null,
  subclass text,
  level int not null default 1,
  species text,
  background text,
  player text,
  image text,
  colour text,
  is_npc boolean default false,
  is_active boolean default true,
  notes text,
  stats jsonb default '{}',
  ability_scores jsonb default '{}',
  saving_throws jsonb default '[]',
  skills jsonb default '[]',
  spell_slots jsonb default '{}',
  sorcery_points jsonb,
  features jsonb default '[]',
  weapons jsonb default '[]',
  healing_actions jsonb default '[]',
  buff_actions jsonb default '[]',
  equipment jsonb default '[]',
  magic_items jsonb default '[]',
  passive_scores jsonb default '{}',
  senses text,
  languages text,
  backstory text,
  srd_refs jsonb default '{}',
  homebrew_json jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists characters_campaign_id_idx on characters(campaign_id);

create table if not exists npcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  role text,
  affiliation text,
  description text,
  personality text,
  motivation text,
  secret text,
  stat_block_id uuid references stat_blocks(id) on delete set null,
  portrait_url text,
  faction_id uuid,
  tags text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  title text not null,
  type text,                                  -- 'combat' | 'social' | 'skill' | 'chase' | 'puzzle'
  difficulty text,                            -- 'easy' | 'medium' | 'hard' | 'deadly'
  participants jsonb default '[]',            -- [{ stat_block_id, count, role }]
  terrain_features text[],
  hazards text[],
  objectives text[],
  tactics text,
  scaling_options jsonb default '[]',
  rewards jsonb default '{}',
  fail_conditions text,
  escape_conditions text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Phase 2F: DM lore card catalog (replaces static LORE_CARDS when populated)
create table if not exists lore_cards (
  id text primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  category text,
  title text not null,
  content text not null,
  tone text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stage 3: SRD reference library (import via dm: npm run reference:import)
create table if not exists reference_conditions (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  description text not null default '',
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);
create index if not exists reference_conditions_ruleset_name_idx on reference_conditions (ruleset, lower(name));

create table if not exists reference_spells (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  level int not null default 0,
  school text,
  casting_time text,
  range text,
  components jsonb default '{"V":false,"S":false,"M":null}',
  duration text,
  ritual boolean default false,
  concentration boolean default false,
  description text,
  higher_level text,
  attack_type text,
  damage_dice text,
  damage_type text,
  save_ability text,
  classes text[],
  raw_json jsonb not null default '{}',
  source_url text,
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);
create index if not exists reference_spells_ruleset_level_name_idx on reference_spells (ruleset, level, lower(name));
create index if not exists reference_spells_search_idx
  on reference_spells using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

create table if not exists reference_monsters (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  size text,
  creature_type text,
  alignment text,
  challenge_rating text,
  xp int,
  ac int,
  max_hp int,
  hit_dice text,
  speed text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);
create index if not exists reference_monsters_ruleset_name_idx on reference_monsters (ruleset, lower(name));
create index if not exists reference_monsters_search_idx
  on reference_monsters using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(creature_type, '')));

-- stat_blocks.cloned_from_reference_id: column created with stat_blocks; FK after reference_monsters exists
alter table stat_blocks drop constraint if exists stat_blocks_cloned_from_reference_id_fkey;
alter table stat_blocks
  add constraint stat_blocks_cloned_from_reference_id_fkey
  foreign key (cloned_from_reference_id) references reference_monsters(id) on delete set null;
create index if not exists stat_blocks_cloned_from_reference_id_idx
  on stat_blocks (cloned_from_reference_id)
  where cloned_from_reference_id is not null;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  name text not null,
  type text,                                  -- 'weapon' | 'armor' | 'magic' | 'mundane' | 'key' | 'consumable'
  rarity text,
  description text,
  mechanics text,
  attunement boolean default false,
  value text,
  image_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  type text,
  description text,
  dm_notes text,
  map_asset_id uuid,
  faction_id uuid,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists factions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  description text,
  goals text,
  attitude text default 'neutral',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  title text not null,
  type text not null,                         -- 'battle-map' | 'regional-map' | 'portrait' | 'handout' | 'letter' | 'item-image' | 'audio'
  file_url text,
  thumbnail_url text,
  visibility text default 'dm',              -- 'dm' | 'public' | 'revealable'
  reveal_condition text,
  linked_entity_type text,
  linked_entity_id uuid,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- RUNTIME / LIVE SESSION STATE (extends existing tables)
-- ---------------------------------------------------------------------------

-- Legacy runtime tables kept for compatibility with current DM/player stores.
create table if not exists session_state (
  id text primary key,
  session_run_id text,
  campaign_id uuid references campaigns(id) on delete set null,
  current_scene_index int default 0,
  current_beat_index int default 0,
  active_session_uuid uuid,
  active_scene_uuid uuid,
  active_beat_uuid uuid,
  mode text default 'run',
  revealed_asset_ids uuid[] default '{}',
  active_ruleset text default '2024',
  fallback_allowed boolean default true,
  source_of_truth text default 'canonical',
  updated_at timestamptz default now()
);

create table if not exists character_states (
  id text primary key,
  cur_hp int default 0,
  temp_hp int default 0,
  concentration boolean default false,
  spell_slots jsonb default '{}',
  death_saves jsonb default '{"successes":0,"failures":0}',
  conditions text[] default '{}',
  updated_at timestamptz default now()
);

create table if not exists combat_state (
  id text primary key,
  session_run_id text,
  active boolean default false,
  round int default 1,
  active_combatant_index int default 0,
  combatants jsonb default '[]',
  ilya_assigned_to text,
  initiative_phase boolean default false,
  ruleset_context jsonb default '{"active_ruleset":"2024","fallback_allowed":true,"source_of_truth":"canonical"}',
  updated_at timestamptz default now()
);

create table if not exists combat_feed (
  id bigserial primary key,
  session_id text not null,
  session_run_id text,
  round int default 0,
  text text not null,
  type text default 'action',
  shared boolean default false,
  visibility text default 'player_visible',
  prompt_status text,
  target_id text,
  ruleset text,
  source_of_truth text,
  metadata jsonb default '{}',
  timestamp timestamptz default now()
);

alter table combat_feed
  add column if not exists metadata jsonb default '{}';

-- Structured resolution / QA (optional; combat_feed remains primary narrative log)
create table if not exists combat_resolution_events (
  id bigserial primary key,
  session_run_id text not null,
  round int default 0,
  kind text not null,
  payload jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists combat_resolution_events_session_idx
  on combat_resolution_events(session_run_id, created_at desc);

create table if not exists reveals (
  id bigserial primary key,
  session_id text not null,
  session_run_id text,
  card_id text not null,
  category text,
  title text not null,
  content text not null,
  tone text default 'narrative',
  visibility text default 'player_visible',
  target_id text,
  revealed_at timestamptz default now()
);

-- Extend existing session_state to reference the new schema
-- (We keep the old integer-index columns for backward compat during migration)
alter table session_state
  add column if not exists campaign_id uuid,
  add column if not exists session_run_id text,
  add column if not exists active_session_uuid uuid,
  add column if not exists active_scene_uuid uuid,
  add column if not exists active_beat_uuid uuid,
  add column if not exists mode text default 'run',
  add column if not exists revealed_asset_ids uuid[] default '{}',
  add column if not exists active_ruleset text default '2024',
  add column if not exists fallback_allowed boolean default true,
  add column if not exists source_of_truth text default 'canonical';

alter table combat_state
  add column if not exists session_run_id text,
  add column if not exists ruleset_context jsonb default '{"active_ruleset":"2024","fallback_allowed":true,"source_of_truth":"canonical"}';

alter table combat_feed
  add column if not exists session_run_id text,
  add column if not exists visibility text default 'player_visible',
  add column if not exists prompt_status text,
  add column if not exists target_id text,
  add column if not exists ruleset text,
  add column if not exists source_of_truth text;

alter table reveals
  add column if not exists session_run_id text,
  add column if not exists visibility text default 'player_visible',
  add column if not exists target_id text;

create table if not exists revealed_content (
  id uuid primary key default gen_random_uuid(),
  session_run_id text not null,               -- 'session-1' or a uuid for live run
  content_type text not null,                 -- 'asset' | 'clue' | 'npc' | 'handout'
  content_id uuid not null,
  revealed_at timestamptz default now(),
  revealed_by text,
  is_player_visible boolean default true
);

alter table revealed_content
  add column if not exists visibility text default 'player_visible',
  add column if not exists target_id text;

create index if not exists session_state_session_run_idx on session_state(session_run_id);
create index if not exists combat_state_session_run_idx on combat_state(session_run_id);
create index if not exists combat_feed_session_run_idx on combat_feed(session_run_id, timestamp desc);
create index if not exists combat_feed_visibility_idx on combat_feed(visibility, target_id);
create index if not exists reveals_session_run_idx on reveals(session_run_id, revealed_at desc);

-- ---------------------------------------------------------------------------
-- CANONICAL 5E ENGINE CONTENT (2024-FIRST WITH 2014 FALLBACK)
-- ---------------------------------------------------------------------------

create table if not exists rules_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null,                 -- '5e-srd-api'
  base_url text not null,
  primary_ruleset text not null default '2024',
  fallback_ruleset text not null default '2014',
  source_version text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rules_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,                       -- spell|monster|condition|class|species|trait|equipment|...
  ruleset text not null,                           -- 2024|2014
  source_index text not null,                      -- canonical stable index from source API
  name text not null,
  source_url text,
  source_version text,
  is_fallback boolean default false,               -- true when 2014 fallback is used for 2024 gaps
  payload jsonb not null default '{}',
  imported_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists rules_entities_unique_key
  on rules_entities(entity_type, ruleset, source_index);
create index if not exists rules_entities_entity_type_idx on rules_entities(entity_type);
create index if not exists rules_entities_ruleset_idx on rules_entities(ruleset);

create table if not exists rules_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  ruleset text not null,
  status text not null default 'running',          -- running|success|failed
  totals jsonb default '{}',
  error_text text,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- ---------------------------------------------------------------------------
-- HOMEBREW OVERLAY SYSTEM
-- ---------------------------------------------------------------------------

create table if not exists homebrew_overlays (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  entity_type text not null,                        -- spell|item|monster|condition|mechanic
  canonical_ref text,                               -- rules_entities.source_index (nullable for net-new custom entities)
  overlay_payload jsonb not null default '{}',
  is_active boolean default true,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists homebrew_overlays_campaign_idx on homebrew_overlays(campaign_id, entity_type, is_active);
create index if not exists homebrew_overlays_canonical_idx on homebrew_overlays(entity_type, canonical_ref);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

create index if not exists arcs_campaign_id_order on arcs(campaign_id, "order");
create index if not exists adventures_arc_id_order on adventures(arc_id, "order");
create index if not exists sessions_adventure_id_order on sessions(adventure_id, "order");
create index if not exists scenes_session_id_order on scenes(session_id, "order");
create index if not exists beats_scene_id_order on beats(scene_id, "order");
create index if not exists scene_branches_scene_id on scene_branches(scene_id, "order");
create index if not exists stat_blocks_slug on stat_blocks(slug);
create index if not exists stat_blocks_campaign on stat_blocks(campaign_id);
create index if not exists npcs_campaign_id on npcs(campaign_id);
create index if not exists assets_campaign_id on assets(campaign_id);
create index if not exists rules_sync_runs_source_started_idx on rules_sync_runs(source_key, started_at desc);

-- ---------------------------------------------------------------------------
-- ROW-LEVEL SECURITY (enable but allow all for now — add auth later)
-- ---------------------------------------------------------------------------

alter table campaigns enable row level security;
alter table arcs enable row level security;
alter table adventures enable row level security;
alter table sessions enable row level security;
alter table scenes enable row level security;
alter table beats enable row level security;
alter table scene_branches enable row level security;
alter table consequences enable row level security;
alter table stat_blocks enable row level security;
alter table spells enable row level security;
alter table spells_raw enable row level security;
alter table npcs enable row level security;
alter table encounters enable row level security;
alter table lore_cards enable row level security;
alter table items enable row level security;
alter table locations enable row level security;
alter table factions enable row level security;
alter table assets enable row level security;
alter table session_state enable row level security;
alter table character_states enable row level security;
alter table combat_state enable row level security;
alter table combat_feed enable row level security;
alter table reveals enable row level security;
alter table character_spells enable row level security;
alter table characters enable row level security;
alter table revealed_content enable row level security;
alter table combat_resolution_events enable row level security;
alter table rules_sources enable row level security;
alter table rules_entities enable row level security;
alter table rules_sync_runs enable row level security;
alter table homebrew_overlays enable row level security;
alter table reference_conditions enable row level security;
alter table reference_spells enable row level security;
alter table reference_monsters enable row level security;

-- Allow all while running without auth (remove when adding auth)
-- Uses DO block because CREATE POLICY does not support IF NOT EXISTS
do $$
declare
  t text;
  p text;
begin
  for t, p in values
    ('campaigns',       'allow_all_campaigns'),
    ('arcs',            'allow_all_arcs'),
    ('adventures',      'allow_all_adventures'),
    ('sessions',        'allow_all_sessions'),
    ('scenes',          'allow_all_scenes'),
    ('beats',           'allow_all_beats'),
    ('scene_branches',  'allow_all_scene_branches'),
    ('consequences',    'allow_all_consequences'),
    ('stat_blocks',     'allow_all_stat_blocks'),
    ('spells',          'allow_all_spells'),
    ('spells_raw',      'allow_all_spells_raw'),
    ('npcs',            'allow_all_npcs'),
    ('encounters',      'allow_all_encounters'),
    ('lore_cards',      'allow_all_lore_cards'),
    ('items',           'allow_all_items'),
    ('locations',       'allow_all_locations'),
    ('factions',        'allow_all_factions'),
    ('assets',          'allow_all_assets'),
    ('session_state',   'allow_all_session_state'),
    ('character_states','allow_all_character_states'),
    ('combat_state',    'allow_all_combat_state'),
    ('combat_feed',     'allow_all_combat_feed'),
    ('reveals',         'allow_all_reveals'),
    ('character_spells','allow_all_character_spells'),
    ('characters',      'allow_all_characters'),
    ('revealed_content','allow_all_revealed_content'),
    ('combat_resolution_events','allow_all_combat_resolution_events'),
    ('rules_sources',   'allow_all_rules_sources'),
    ('rules_entities',  'allow_all_rules_entities'),
    ('rules_sync_runs', 'allow_all_rules_sync_runs'),
    ('homebrew_overlays','allow_all_homebrew_overlays'),
    ('reference_conditions','allow_all_reference_conditions'),
    ('reference_spells',    'allow_all_reference_spells'),
    ('reference_monsters',  'allow_all_reference_monsters')
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = p
    ) then
      execute format(
        'create policy %I on %I for all using (true) with check (true)',
        p, t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- REALTIME PUBLICATION (required for postgres_changes subscriptions)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_state'
  ) then
    execute 'alter publication supabase_realtime add table public.session_state';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_state'
  ) then
    execute 'alter publication supabase_realtime add table public.combat_state';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_feed'
  ) then
    execute 'alter publication supabase_realtime add table public.combat_feed';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reveals'
  ) then
    execute 'alter publication supabase_realtime add table public.reveals';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_states'
  ) then
    execute 'alter publication supabase_realtime add table public.character_states';
  end if;
end $$;
