-- Applied on remote 2026-04-09; keep in sync with supabase/schema.sql
DO $$
BEGIN
  IF to_regclass('public.combat_feed') IS NOT NULL THEN
    ALTER TABLE public.combat_feed
      ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.combat_resolution_events (
  id bigserial PRIMARY KEY,
  session_run_id text NOT NULL,
  round int DEFAULT 0,
  kind text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS combat_resolution_events_session_idx
  ON public.combat_resolution_events (session_run_id, created_at DESC);

ALTER TABLE public.combat_resolution_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'combat_resolution_events'
      AND policyname = 'allow_all_combat_resolution_events'
  ) THEN
    CREATE POLICY allow_all_combat_resolution_events
      ON public.combat_resolution_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.characters') IS NOT NULL THEN
    IF to_regclass('public.campaigns') IS NOT NULL THEN
      ALTER TABLE public.characters
        ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS characters_campaign_id_idx ON public.characters (campaign_id);
    END IF;

    ALTER TABLE public.characters
      ADD COLUMN IF NOT EXISTS notes text,
      ADD COLUMN IF NOT EXISTS srd_refs jsonb DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS homebrew_json jsonb DEFAULT '{}';

    UPDATE public.characters
    SET homebrew_json = jsonb_build_object('player_sheet_sanitized', true)
    WHERE id = 'ilya' AND (homebrew_json IS NULL OR homebrew_json = '{}'::jsonb);
  END IF;
END $$;
