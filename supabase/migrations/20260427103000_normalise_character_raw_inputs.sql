ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS saving_throw_proficiencies jsonb,
  ADD COLUMN IF NOT EXISTS skill_proficiencies jsonb,
  ADD COLUMN IF NOT EXISTS spellcasting_ability text,
  ADD COLUMN IF NOT EXISTS ac_config jsonb;

COMMENT ON COLUMN characters.ability_scores IS
  'Raw ability scores as integers: {"STR": 16, "DEX": 12, ...}. Modifiers are computed client-side.';

COMMENT ON COLUMN characters.saving_throw_proficiencies IS
  'Which saves are proficient: {"STR": false, "DEX": false, "CON": false, "INT": false, "WIS": false, "CHA": true}';

COMMENT ON COLUMN characters.skill_proficiencies IS
  'Array: [{name, ability, proficient, expertise}]. Modifiers are computed client-side.';

COMMENT ON COLUMN characters.ac_config IS
  'AC breakdown: {base, addDex, maxDex, shield, magicBonus}. Final AC computed client-side.';

UPDATE characters
SET saving_throw_proficiencies = (
  SELECT jsonb_object_agg(
    upper(left(elem->>'name', 3)),
    COALESCE((elem->>'proficient')::boolean, false)
  )
  FROM jsonb_array_elements(saving_throws) AS elem
)
WHERE saving_throw_proficiencies IS NULL
  AND saving_throws IS NOT NULL;

UPDATE characters
SET skill_proficiencies = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', elem->>'name',
      'ability', upper(left(elem->>'ability', 3)),
      'proficient', COALESCE((elem->>'proficient')::boolean, false),
      'expertise', COALESCE((elem->>'expertise')::boolean, false)
    )
  )
  FROM jsonb_array_elements(skills) AS elem
)
WHERE skill_proficiencies IS NULL
  AND skills IS NOT NULL;

UPDATE characters
SET spellcasting_ability = upper(left(stats->>'spellcastingAbility', 3))
WHERE spellcasting_ability IS NULL
  AND stats ? 'spellcastingAbility';

UPDATE characters
SET ability_scores = (
  SELECT jsonb_object_agg(
    upper(key),
    CASE
      WHEN jsonb_typeof(value) = 'object' AND value ? 'score' THEN to_jsonb((value->>'score')::int)
      WHEN jsonb_typeof(value) = 'number' THEN to_jsonb((value::text)::int)
      ELSE to_jsonb(10)
    END
  )
  FROM jsonb_each(ability_scores)
)
WHERE ability_scores IS NOT NULL;

UPDATE characters
SET ac_config = jsonb_strip_nulls(
  jsonb_build_object(
    'base', COALESCE((stats->>'ac')::int, 10),
    'addDex', true,
    'maxDex', NULL,
    'shield', false,
    'magicBonus', 0
  )
)
WHERE ac_config IS NULL;
