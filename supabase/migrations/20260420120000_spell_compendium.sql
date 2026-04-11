-- Canonical spell compendium (full dataset, campaign-agnostic).
-- Imported from spreadsheet; idempotent upsert on spell_id.

create table if not exists public.spell_compendium (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  spell_id text not null,
  name text not null,
  level int not null default 0,
  school text,
  casting_time text,
  duration text,
  range text,
  area text,
  attack text,
  save text,
  damage_effect text,
  ritual boolean default false,
  concentration boolean default false,
  verbal boolean default false,
  somatic boolean default false,
  material boolean default false,
  material_text text,
  source text,
  details text,
  source_link text,
  summon_stat_block text,
  targeting text,
  max_targets text,
  tags text[] default array[]::text[],
  search_text text,
  sound_effect_url text,
  source_type text not null default 'compendium',
  resolution_type text,
  target_mode text,
  save_ability text,
  attack_type text,
  components jsonb default '{"V":false,"S":false,"M":null}',
  rules_json jsonb default '{}',
  import_batch text,
  imported_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint spell_compendium_source_type_chk check (source_type in ('compendium', 'custom', 'legacy'))
);

create unique index if not exists spell_compendium_slug_unique on public.spell_compendium (slug);
create unique index if not exists spell_compendium_spell_id_unique on public.spell_compendium (spell_id);
create index if not exists spell_compendium_level_idx on public.spell_compendium (level);
create index if not exists spell_compendium_school_lower_idx on public.spell_compendium (lower(school));
create index if not exists spell_compendium_source_idx on public.spell_compendium (lower(source));
create index if not exists spell_compendium_search_idx
  on public.spell_compendium using gin (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(details, '') || ' ' || coalesce(damage_effect, '') || ' ' || coalesce(school, '') || ' ' || coalesce(source, '') || ' ' || coalesce(search_text, '')
    )
  );

alter table public.spell_compendium enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'spell_compendium' and policyname = 'allow_all_spell_compendium'
  ) then
    create policy allow_all_spell_compendium on public.spell_compendium for all using (true) with check (true);
  end if;
end $$;
