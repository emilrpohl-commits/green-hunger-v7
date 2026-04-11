-- PDF import / DM upserts use the anon key. If `characters` has RLS enabled but no
-- permissive policy (e.g. DB was migrated without running schema.sql's policy DO block),
-- inserts fail with: new row violates row-level security policy for table "characters".

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'characters'
      AND policyname = 'allow_all_characters'
  ) THEN
    CREATE POLICY allow_all_characters
      ON public.characters
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Same pattern for spell links created right after character save.
ALTER TABLE public.character_spells ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'character_spells'
      AND policyname = 'allow_all_character_spells'
  ) THEN
    CREATE POLICY allow_all_character_spells
      ON public.character_spells
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.spells ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'spells'
      AND policyname = 'allow_all_spells'
  ) THEN
    CREATE POLICY allow_all_spells
      ON public.spells
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
