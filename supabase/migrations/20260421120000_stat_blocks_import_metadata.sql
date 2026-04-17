-- Audit / import provenance for stat blocks (e.g. SRD JSON pipeline).
do $$
begin
  if to_regclass('public.stat_blocks') is not null then
    alter table public.stat_blocks
      add column if not exists import_metadata jsonb not null default '{}'::jsonb;

    comment on column public.stat_blocks.import_metadata is
      'Structured import audit: e.g. { "srd": { "parse_quality", "warnings", "raw_block", "monster_id", ... } }';
  end if;
end $$;
