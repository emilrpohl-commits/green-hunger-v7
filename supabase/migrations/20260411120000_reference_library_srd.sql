-- Stage 3: Internal SRD reference library (Postgres). Populate via dm/scripts/reference-import.mjs (npm run reference:import).

-- ---------------------------------------------------------------------------
-- reference_conditions
-- ---------------------------------------------------------------------------
create table if not exists public.reference_conditions (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  description text not null default '',
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_conditions_ruleset_name_idx
  on public.reference_conditions (ruleset, lower(name));

-- ---------------------------------------------------------------------------
-- reference_spells
-- ---------------------------------------------------------------------------
create table if not exists public.reference_spells (
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

create index if not exists reference_spells_ruleset_level_name_idx
  on public.reference_spells (ruleset, level, lower(name));
create index if not exists reference_spells_search_idx
  on public.reference_spells using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ---------------------------------------------------------------------------
-- reference_monsters
-- ---------------------------------------------------------------------------
create table if not exists public.reference_monsters (
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

create index if not exists reference_monsters_ruleset_name_idx
  on public.reference_monsters (ruleset, lower(name));
create index if not exists reference_monsters_search_idx
  on public.reference_monsters using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(creature_type, '')));

-- ---------------------------------------------------------------------------
-- RLS (dev-friendly: open policies — tighten when you add real auth)
-- ---------------------------------------------------------------------------
alter table public.reference_conditions enable row level security;
alter table public.reference_spells enable row level security;
alter table public.reference_monsters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_conditions' and policyname = 'allow_all_reference_conditions'
  ) then
    create policy allow_all_reference_conditions on public.reference_conditions for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_spells' and policyname = 'allow_all_reference_spells'
  ) then
    create policy allow_all_reference_spells on public.reference_spells for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_monsters' and policyname = 'allow_all_reference_monsters'
  ) then
    create policy allow_all_reference_monsters on public.reference_monsters for all using (true) with check (true);
  end if;
end $$;
