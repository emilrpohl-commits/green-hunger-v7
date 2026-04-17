-- SRD reference expansion: classes, races, equipment, import log, etc.
-- Populate via dm/scripts/reference-import.mjs (see docs/reference-import-contract.md).

-- ---------------------------------------------------------------------------
-- srd_import_log
-- ---------------------------------------------------------------------------
create table if not exists public.srd_import_log (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  ruleset text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_rows int,
  success_rows int,
  error_rows int,
  errors jsonb default '[]'::jsonb,
  dry_run boolean not null default false
);

create index if not exists srd_import_log_category_ruleset_idx
  on public.srd_import_log (category, ruleset, completed_at desc nulls last);

alter table public.srd_import_log enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'srd_import_log' and policyname = 'allow_all_srd_import_log'
  ) then
    create policy allow_all_srd_import_log on public.srd_import_log for all using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- reference_classes
-- ---------------------------------------------------------------------------
create table if not exists public.reference_classes (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  hit_die int not null,
  primary_ability text[],
  saving_throw_proficiencies text[],
  armor_proficiencies text[],
  weapon_proficiencies text[],
  tool_proficiencies text[],
  skill_choices int,
  skill_options text[],
  spellcasting_ability text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_classes_ruleset_name_idx
  on public.reference_classes (ruleset, lower(name));

-- ---------------------------------------------------------------------------
-- reference_class_features
-- ---------------------------------------------------------------------------
create table if not exists public.reference_class_features (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  class_index text not null,
  subclass_index text,
  level int not null,
  name text not null,
  description text,
  feature_type text not null,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_class_features_class_level_idx
  on public.reference_class_features (ruleset, class_index, level);
create index if not exists reference_class_features_subclass_level_idx
  on public.reference_class_features (ruleset, subclass_index, level);

-- ---------------------------------------------------------------------------
-- reference_subclasses
-- ---------------------------------------------------------------------------
create table if not exists public.reference_subclasses (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  class_index text not null,
  name text not null,
  flavor text,
  description text,
  granted_spells jsonb,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_subclasses_class_idx
  on public.reference_subclasses (ruleset, class_index);

-- ---------------------------------------------------------------------------
-- reference_races
-- ---------------------------------------------------------------------------
create table if not exists public.reference_races (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  speed int,
  size text,
  ability_bonuses jsonb,
  starting_languages text[],
  trait_indices text[],
  subrace_indices text[],
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_races_ruleset_name_idx
  on public.reference_races (ruleset, lower(name));

-- ---------------------------------------------------------------------------
-- reference_traits
-- ---------------------------------------------------------------------------
create table if not exists public.reference_traits (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  description text,
  race_indices text[],
  subrace_indices text[],
  proficiency_grants jsonb,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_traits_ruleset_name_idx
  on public.reference_traits (ruleset, lower(name));

-- ---------------------------------------------------------------------------
-- reference_equipment
-- ---------------------------------------------------------------------------
create table if not exists public.reference_equipment (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  equipment_category text,
  weapon_category text,
  weapon_range text,
  damage_dice text,
  damage_type text,
  range_normal int,
  range_long int,
  ac_base int,
  ac_add_dex_modifier boolean,
  ac_max_dex_bonus int,
  strength_minimum int,
  stealth_disadvantage boolean,
  cost_quantity int,
  cost_unit text,
  weight_lb numeric,
  properties text[],
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_equipment_ruleset_name_idx
  on public.reference_equipment (ruleset, lower(name));
create index if not exists reference_equipment_category_idx
  on public.reference_equipment (ruleset, equipment_category);

-- ---------------------------------------------------------------------------
-- reference_magic_items
-- ---------------------------------------------------------------------------
create table if not exists public.reference_magic_items (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  equipment_category text,
  rarity text,
  requires_attunement boolean default false,
  attunement_conditions text,
  description text,
  is_variant boolean default false,
  variant_of_index text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_magic_items_ruleset_name_idx
  on public.reference_magic_items (ruleset, lower(name));
create index if not exists reference_magic_items_rarity_idx
  on public.reference_magic_items (ruleset, rarity);

-- ---------------------------------------------------------------------------
-- reference_backgrounds
-- ---------------------------------------------------------------------------
create table if not exists public.reference_backgrounds (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  skill_proficiencies text[],
  tool_proficiencies text[],
  language_choices int,
  starting_equipment jsonb,
  feature_name text,
  feature_description text,
  personality_traits jsonb,
  ideals jsonb,
  bonds jsonb,
  flaws jsonb,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_backgrounds_ruleset_name_idx
  on public.reference_backgrounds (ruleset, lower(name));

-- ---------------------------------------------------------------------------
-- reference_proficiencies
-- ---------------------------------------------------------------------------
create table if not exists public.reference_proficiencies (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  proficiency_type text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_proficiencies_type_idx
  on public.reference_proficiencies (ruleset, proficiency_type);

-- ---------------------------------------------------------------------------
-- reference_languages
-- ---------------------------------------------------------------------------
create table if not exists public.reference_languages (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  language_type text,
  typical_speakers text[],
  script text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

-- ---------------------------------------------------------------------------
-- reference_skills
-- ---------------------------------------------------------------------------
create table if not exists public.reference_skills (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  ability_index text,
  description text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

-- ---------------------------------------------------------------------------
-- reference_damage_types
-- ---------------------------------------------------------------------------
create table if not exists public.reference_damage_types (
  id uuid primary key default gen_random_uuid(),
  ruleset text not null,
  source_index text not null,
  name text not null,
  description text,
  raw_json jsonb not null default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

-- ---------------------------------------------------------------------------
-- RLS (dev-friendly)
-- ---------------------------------------------------------------------------
alter table public.reference_classes enable row level security;
alter table public.reference_class_features enable row level security;
alter table public.reference_subclasses enable row level security;
alter table public.reference_races enable row level security;
alter table public.reference_traits enable row level security;
alter table public.reference_equipment enable row level security;
alter table public.reference_magic_items enable row level security;
alter table public.reference_backgrounds enable row level security;
alter table public.reference_proficiencies enable row level security;
alter table public.reference_languages enable row level security;
alter table public.reference_skills enable row level security;
alter table public.reference_damage_types enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_classes' and policyname = 'allow_all_reference_classes') then
    create policy allow_all_reference_classes on public.reference_classes for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_class_features' and policyname = 'allow_all_reference_class_features') then
    create policy allow_all_reference_class_features on public.reference_class_features for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_subclasses' and policyname = 'allow_all_reference_subclasses') then
    create policy allow_all_reference_subclasses on public.reference_subclasses for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_races' and policyname = 'allow_all_reference_races') then
    create policy allow_all_reference_races on public.reference_races for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_traits' and policyname = 'allow_all_reference_traits') then
    create policy allow_all_reference_traits on public.reference_traits for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_equipment' and policyname = 'allow_all_reference_equipment') then
    create policy allow_all_reference_equipment on public.reference_equipment for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_magic_items' and policyname = 'allow_all_reference_magic_items') then
    create policy allow_all_reference_magic_items on public.reference_magic_items for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_backgrounds' and policyname = 'allow_all_reference_backgrounds') then
    create policy allow_all_reference_backgrounds on public.reference_backgrounds for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_proficiencies' and policyname = 'allow_all_reference_proficiencies') then
    create policy allow_all_reference_proficiencies on public.reference_proficiencies for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_languages' and policyname = 'allow_all_reference_languages') then
    create policy allow_all_reference_languages on public.reference_languages for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_skills' and policyname = 'allow_all_reference_skills') then
    create policy allow_all_reference_skills on public.reference_skills for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reference_damage_types' and policyname = 'allow_all_reference_damage_types') then
    create policy allow_all_reference_damage_types on public.reference_damage_types for all using (true) with check (true);
  end if;
end $$;
