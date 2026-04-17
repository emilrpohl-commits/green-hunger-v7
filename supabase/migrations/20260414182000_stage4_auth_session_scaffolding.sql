create table if not exists public.session_invites (
  id uuid primary key default gen_random_uuid(),
  session_run_id text not null,
  invite_code text not null unique,
  created_by text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.encounter_templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid,
  name text not null,
  template jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists encounter_templates_campaign_idx
  on public.encounter_templates(campaign_id, updated_at desc);
