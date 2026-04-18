-- character_spells.spell_id is required for DM Spell Library bulk-assign and player compendium resolution.
-- Some databases predate this column; PostgREST then errors with "column character_spells.spell_id does not exist".

alter table if exists public.character_spells
  add column if not exists spell_id text,
  add column if not exists spell_data jsonb default '{}',
  add column if not exists overrides_json jsonb default '{}',
  add column if not exists order_index int not null default 0,
  add column if not exists updated_at timestamptz default now();

create index if not exists character_spells_spell_id_idx on public.character_spells (spell_id);
