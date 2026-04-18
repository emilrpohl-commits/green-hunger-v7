-- Content entry system foundation: source metadata + feats table.

-- Add source metadata fields to existing reference tables.
alter table if exists public.reference_spells
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_monsters
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_conditions
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_classes
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_class_features
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_subclasses
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_races
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_traits
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_equipment
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_magic_items
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_backgrounds
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_proficiencies
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_languages
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_skills
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

alter table if exists public.reference_damage_types
  add column if not exists source_type text not null default 'srd-2014',
  add column if not exists source_book text not null default 'SRD 5.1';

-- New reference_feats table.
create table if not exists public.reference_feats (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'srd-2014',
  source_book text not null default 'SRD 5.1',
  ruleset text not null default '2014',
  source_index text not null,
  name text not null,
  prerequisite text,
  ability_score_minimum jsonb,
  level_minimum integer,
  class_requirement text,
  description text not null,
  raw_json jsonb default '{}',
  imported_at timestamptz default now(),
  unique (ruleset, source_index)
);

create index if not exists reference_feats_name_idx
  on public.reference_feats using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));
create index if not exists reference_feats_ruleset_name_idx
  on public.reference_feats (ruleset, lower(name));

alter table public.reference_feats enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reference_feats' and policyname = 'allow_all_reference_feats'
  ) then
    create policy allow_all_reference_feats
      on public.reference_feats
      for all
      using (true)
      with check (true);
  end if;
end $$;
