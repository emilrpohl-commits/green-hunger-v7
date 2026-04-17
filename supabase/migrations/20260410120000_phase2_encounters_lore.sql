-- Phase 2: lore_cards catalog + seed encounters for DB-backed quick launch (optional; run against existing Green Hunger DB).

create table if not exists public.lore_cards (
  id text primary key,
  campaign_id uuid,
  category text,
  title text not null,
  content text not null,
  tone text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lore_cards enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lore_cards' and policyname = 'allow_all_lore_cards'
  ) then
    create policy allow_all_lore_cards on public.lore_cards for all using (true) with check (true);
  end if;
end $$;

-- Sample rows (add more to match full campaign lore as needed)
insert into public.lore_cards (id, category, title, content, tone, sort_order) values
(
  'lore-weald-1',
  'Location',
  'The Weald of Sharp Teeth',
  'An ancient forest on the edge of Tethyr. Pre-kingdom old. The trees are bone-white, their bark smooth as bleached driftwood. The silence here has weight.',
  'location',
  1
),
(
  'lore-corruption-1',
  'Warning',
  'The Green Hunger',
  'It does not announce itself. It does not seek dominion in any conventional sense. It whispers. It reshapes.',
  'ominous',
  2
)
on conflict (id) do nothing;

-- Seed encounters when stat_blocks exist for this campaign (slug match)
do $$
begin
  if to_regclass('public.campaigns') is not null
     and to_regclass('public.encounters') is not null
     and to_regclass('public.stat_blocks') is not null then
    insert into public.encounters (campaign_id, title, type, participants)
    select c.id,
      'Corrupted Hunt',
      'combat',
      jsonb_build_array(
        jsonb_build_object(
          'stat_block_id', (select sb.id from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'corrupted-wolf' limit 1),
          'count', 2,
          'initiative', 20
        )
      )
    from public.campaigns c
    where c.slug = 'green-hunger'
      and exists (select 1 from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'corrupted-wolf')
      and not exists (
        select 1 from public.encounters e where e.campaign_id = c.id and e.title = 'Corrupted Hunt'
      );

    insert into public.encounters (campaign_id, title, type, participants)
    select c.id,
      'Darcy, Recombined',
      'combat',
      jsonb_build_array(
        jsonb_build_object(
          'stat_block_id', (select sb.id from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'darcy-recombined' limit 1),
          'count', 1,
          'initiative', 15
        )
      )
    from public.campaigns c
    where c.slug = 'green-hunger'
      and exists (select 1 from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'darcy-recombined')
      and not exists (
        select 1 from public.encounters e where e.campaign_id = c.id and e.title = 'Darcy, Recombined'
      );

    insert into public.encounters (campaign_id, title, type, participants)
    select c.id,
      'Rotting Bloom Encounter',
      'combat',
      jsonb_build_array(
        jsonb_build_object(
          'stat_block_id', (select sb.id from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'rotting-bloom' limit 1),
          'count', 3,
          'initiative', 8
        )
      )
    from public.campaigns c
    where c.slug = 'green-hunger'
      and exists (select 1 from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'rotting-bloom')
      and not exists (
        select 1 from public.encounters e where e.campaign_id = c.id and e.title = 'Rotting Bloom Encounter'
      );

    insert into public.encounters (campaign_id, title, type, participants)
    select c.id,
      'Damir, the Woven Grief',
      'combat',
      jsonb_build_array(
        jsonb_build_object(
          'stat_block_id', (select sb.id from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'damir-woven-grief' limit 1),
          'count', 1,
          'initiative', 18
        )
      )
    from public.campaigns c
    where c.slug = 'green-hunger'
      and exists (select 1 from public.stat_blocks sb where sb.campaign_id = c.id and sb.slug = 'damir-woven-grief')
      and not exists (
        select 1 from public.encounters e where e.campaign_id = c.id and e.title = 'Damir, the Woven Grief'
      );
  end if;
end $$;

-- Optional: one-time backfill live session pointer for legacy installs (uncomment if desired)
-- update public.session_state ss
-- set active_session_uuid = (
--   select s.id from public.sessions s
--   where s.archived_at is null
--   order by s.session_number nulls last, s."order" nulls last
--   limit 1
-- )
-- where ss.active_session_uuid is null
--   and exists (select 1 from public.sessions s2 where s2.archived_at is null);
