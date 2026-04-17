-- Stage 6: trace campaign stat blocks cloned from SRD reference monsters.

do $$
begin
  if to_regclass('public.stat_blocks') is not null then
    alter table public.stat_blocks
      add column if not exists cloned_from_reference_id uuid references public.reference_monsters(id) on delete set null;

    create index if not exists stat_blocks_cloned_from_reference_id_idx
      on public.stat_blocks (cloned_from_reference_id)
      where cloned_from_reference_id is not null;
  end if;
end $$;
