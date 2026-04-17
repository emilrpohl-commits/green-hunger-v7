-- Improve stat_blocks campaign load performance:
-- active list (archived_at is null) and archived list (archived_at is not null).

do $$
begin
  if to_regclass('public.stat_blocks') is not null then
    create index if not exists stat_blocks_campaign_active_partial_idx
      on public.stat_blocks (campaign_id, name)
      where archived_at is null;

    create index if not exists stat_blocks_campaign_archived_partial_idx
      on public.stat_blocks (campaign_id, archived_at desc)
      where archived_at is not null;
  end if;
end $$;

