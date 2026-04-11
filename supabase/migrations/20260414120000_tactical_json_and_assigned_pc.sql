-- Tactical extras (concentration spell, inspiration, class resources, action economy snapshot)
alter table public.character_states
  add column if not exists tactical_json jsonb default '{}';

comment on column public.character_states.tactical_json is
  'Optional: { concentrationSpell?, inspiration?, classResources?, actionEconomy?: { action, bonusAction, reaction } }';

-- Companion / NPC sheet assigned to a PC (nullable)
alter table public.characters
  add column if not exists assigned_pc_id text references public.characters(id) on delete set null;

create index if not exists characters_assigned_pc_id_idx
  on public.characters(assigned_pc_id)
  where assigned_pc_id is not null;

comment on column public.characters.assigned_pc_id is
  'When set on an is_npc row, this companion appears under that PC in party UIs.';
