-- Speed up campaign-scoped stat block list queries.
create index if not exists stat_blocks_campaign_name_idx
  on public.stat_blocks (campaign_id, name);
