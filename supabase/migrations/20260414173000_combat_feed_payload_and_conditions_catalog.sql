alter table public.combat_feed
  add column if not exists payload jsonb default '{}'::jsonb;

create table if not exists public.conditions_catalog (
  id text primary key,
  label text not null,
  affects_saves boolean not null default false,
  affects_attacks boolean not null default false,
  is_stackable boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.conditions_catalog (id, label, affects_saves, affects_attacks, is_stackable)
values
  ('blinded', 'Blinded', false, true, false),
  ('charmed', 'Charmed', false, false, false),
  ('deafened', 'Deafened', false, false, false),
  ('frightened', 'Frightened', false, true, false),
  ('grappled', 'Grappled', false, false, false),
  ('incapacitated', 'Incapacitated', false, false, false),
  ('invisible', 'Invisible', false, true, false),
  ('paralyzed', 'Paralyzed', true, true, false),
  ('petrified', 'Petrified', true, true, false),
  ('poisoned', 'Poisoned', false, true, false),
  ('prone', 'Prone', false, true, false),
  ('restrained', 'Restrained', true, true, false),
  ('stunned', 'Stunned', true, true, false),
  ('unconscious', 'Unconscious', true, true, false),
  ('exhaustion', 'Exhaustion', false, false, true)
on conflict (id) do update
set label = excluded.label,
    affects_saves = excluded.affects_saves,
    affects_attacks = excluded.affects_attacks,
    is_stackable = excluded.is_stackable;
