-- Speed up campaign-scoped stat block list queries.
do $$
begin
  if to_regclass('public.stat_blocks') is not null then
    create index if not exists stat_blocks_campaign_name_idx
      on public.stat_blocks (campaign_id, name);
  end if;
end $$;
