do $$
begin
  if to_regclass('public.reveals') is not null then
    alter table public.reveals
      add column if not exists reveal_type text default 'handout',
      add column if not exists image_url text;
  end if;
end $$;

create table if not exists public.green_marks_log (
  id bigserial primary key,
  session_run_id text not null,
  character_id text not null,
  delta int not null,
  marks_after int not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists green_marks_log_session_idx
  on public.green_marks_log(session_run_id, created_at desc);
