-- Transactional DOCX import for DM builder.
-- Run this in Supabase SQL editor to enable one-shot imports.

create or replace function public.import_session_bundle_tx(
  p_adventure_id uuid,
  p_campaign_id uuid,
  p_payload jsonb,
  p_overwrite_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_session jsonb;
  v_session_id uuid;
  v_session_number int;
  v_session_order int;
  v_scene jsonb;
  v_scene_id uuid;
  v_scene_key text;
  v_scene_map jsonb := '{}'::jsonb;      -- scene_key -> scene uuid text
  v_sb_map jsonb := '{}'::jsonb;         -- lower(stat block name) -> stat block uuid text
  v_sb jsonb;
  v_sb_id uuid;
  v_sb_name text;
  v_beat jsonb;
  v_branch jsonb;
  v_target_scene_id uuid;
  v_stat_block_ref text;
  v_stat_block_id uuid;
begin
  if p_adventure_id is null then
    raise exception 'p_adventure_id is required';
  end if;

  if p_payload is null then
    raise exception 'p_payload is required';
  end if;

  if p_overwrite_session_id is not null then
    delete from public.sessions where id = p_overwrite_session_id;
  end if;

  v_session := coalesce(p_payload->'session', '{}'::jsonb);
  v_session_number := case
    when (v_session->>'session_number') ~ '^\d+$' then (v_session->>'session_number')::int
    else null
  end;
  v_session_order := coalesce(
    case when (v_session->>'order') ~ '^\d+$' then (v_session->>'order')::int else null end,
    v_session_number,
    0
  );

  insert into public.sessions (
    adventure_id, "order", session_number, title, subtitle, notes, estimated_duration, objectives
  ) values (
    p_adventure_id,
    v_session_order,
    v_session_number,
    coalesce(v_session->>'title', 'Imported Session'),
    nullif(v_session->>'subtitle', ''),
    nullif(v_session->>'notes', ''),
    nullif(v_session->>'estimated_duration', ''),
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(coalesce(v_session->'objectives', '[]'::jsonb))),
      '{}'::text[]
    )
  )
  returning id into v_session_id;

  -- Stat blocks: resolve by name first, else create.
  for v_sb in
    select value from jsonb_array_elements(coalesce(p_payload->'stat_blocks', '[]'::jsonb))
  loop
    v_sb_name := trim(coalesce(v_sb->>'name', ''));
    if v_sb_name = '' then
      continue;
    end if;

    select id
      into v_sb_id
      from public.stat_blocks
      where lower(name) = lower(v_sb_name)
        and (campaign_id = p_campaign_id or campaign_id is null)
      order by case when campaign_id = p_campaign_id then 0 else 1 end
      limit 1;

    if v_sb_id is null then
      insert into public.stat_blocks (
        campaign_id, slug, name, source, creature_type, size, alignment, cr, proficiency_bonus,
        ac, ac_note, max_hp, hit_dice, speed, ability_scores, saving_throws, skills,
        resistances, immunities, vulnerabilities, senses, languages, traits, actions,
        bonus_actions, reactions, legendary_actions, combat_prompts, dm_notes, tags
      ) values (
        p_campaign_id,
        nullif(v_sb->>'slug', ''),
        v_sb_name,
        nullif(v_sb->>'source', ''),
        nullif(v_sb->>'creature_type', ''),
        nullif(v_sb->>'size', ''),
        nullif(v_sb->>'alignment', ''),
        nullif(v_sb->>'cr', ''),
        case when (v_sb->>'proficiency_bonus') ~ '^\-?\d+$' then (v_sb->>'proficiency_bonus')::int else null end,
        case when (v_sb->>'ac') ~ '^\-?\d+$' then (v_sb->>'ac')::int else null end,
        nullif(v_sb->>'ac_note', ''),
        case when (v_sb->>'max_hp') ~ '^\-?\d+$' then (v_sb->>'max_hp')::int else null end,
        nullif(v_sb->>'hit_dice', ''),
        nullif(v_sb->>'speed', ''),
        coalesce(v_sb->'ability_scores', '{"STR":10,"DEX":10,"CON":10,"INT":10,"WIS":10,"CHA":10}'::jsonb),
        coalesce(v_sb->'saving_throws', '[]'::jsonb),
        coalesce(v_sb->'skills', '[]'::jsonb),
        coalesce(
          (select array_agg(value::text) from jsonb_array_elements_text(coalesce(v_sb->'resistances', '[]'::jsonb))),
          '{}'::text[]
        ),
        coalesce(v_sb->'immunities', '{"damage":[],"condition":[]}'::jsonb),
        coalesce(
          (select array_agg(value::text) from jsonb_array_elements_text(coalesce(v_sb->'vulnerabilities', '[]'::jsonb))),
          '{}'::text[]
        ),
        nullif(v_sb->>'senses', ''),
        nullif(v_sb->>'languages', ''),
        coalesce(v_sb->'traits', '[]'::jsonb),
        coalesce(v_sb->'actions', '[]'::jsonb),
        coalesce(v_sb->'bonus_actions', '[]'::jsonb),
        coalesce(v_sb->'reactions', '[]'::jsonb),
        coalesce(v_sb->'legendary_actions', '[]'::jsonb),
        coalesce(v_sb->'combat_prompts', '[]'::jsonb),
        coalesce(
          (select array_agg(value::text) from jsonb_array_elements_text(coalesce(v_sb->'dm_notes', '[]'::jsonb))),
          '{}'::text[]
        ),
        coalesce(
          (select array_agg(value::text) from jsonb_array_elements_text(coalesce(v_sb->'tags', '[]'::jsonb))),
          '{}'::text[]
        )
      )
      returning id into v_sb_id;
    end if;

    v_sb_map := v_sb_map || jsonb_build_object(lower(v_sb_name), v_sb_id::text);
  end loop;

  -- Scenes + beats
  for v_scene in
    select value from jsonb_array_elements(coalesce(p_payload->'scenes', '[]'::jsonb))
  loop
    v_scene_key := coalesce(v_scene->>'scene_key', md5(random()::text));

    insert into public.scenes (
      session_id, "order", slug, title, scene_type, purpose, estimated_time,
      fallback_notes, dm_notes, outcomes, is_published
    ) values (
      v_session_id,
      coalesce(case when (v_scene->>'order') ~ '^\d+$' then (v_scene->>'order')::int else 0 end, 0),
      nullif(v_scene->>'slug', ''),
      coalesce(v_scene->>'title', 'Untitled Scene'),
      nullif(v_scene->>'scene_type', ''),
      nullif(v_scene->>'purpose', ''),
      nullif(v_scene->>'estimated_time', ''),
      nullif(v_scene->>'fallback_notes', ''),
      nullif(v_scene->>'dm_notes', ''),
      coalesce(v_scene->'outcomes', '[]'::jsonb),
      coalesce((v_scene->>'is_published')::boolean, false)
    )
    returning id into v_scene_id;

    v_scene_map := v_scene_map || jsonb_build_object(v_scene_key, v_scene_id::text);

    for v_beat in
      select value from jsonb_array_elements(coalesce(v_scene->'beats', '[]'::jsonb))
    loop
      v_stat_block_ref := lower(trim(coalesce(v_beat->>'stat_block_ref', '')));
      v_stat_block_id := null;
      if v_stat_block_ref <> '' then
        if v_sb_map ? v_stat_block_ref then
          v_stat_block_id := (v_sb_map->>v_stat_block_ref)::uuid;
        else
          select id into v_stat_block_id
          from public.stat_blocks
          where lower(name) = v_stat_block_ref
            and (campaign_id = p_campaign_id or campaign_id is null)
          order by case when campaign_id = p_campaign_id then 0 else 1 end
          limit 1;
        end if;
      end if;

      insert into public.beats (
        scene_id, "order", slug, title, type, trigger_text, content, player_text,
        dm_notes, mechanical_effect, stat_block_id
      ) values (
        v_scene_id,
        coalesce(case when (v_beat->>'order') ~ '^\d+$' then (v_beat->>'order')::int else 0 end, 0),
        nullif(v_beat->>'slug', ''),
        coalesce(v_beat->>'title', 'Untitled Beat'),
        coalesce(nullif(v_beat->>'type', ''), 'narrative'),
        nullif(v_beat->>'trigger_text', ''),
        nullif(v_beat->>'content', ''),
        nullif(v_beat->>'player_text', ''),
        nullif(v_beat->>'dm_notes', ''),
        nullif(v_beat->>'mechanical_effect', ''),
        v_stat_block_id
      );
    end loop;
  end loop;

  -- Branches (second pass so targets exist)
  for v_scene in
    select value from jsonb_array_elements(coalesce(p_payload->'scenes', '[]'::jsonb))
  loop
    v_scene_key := coalesce(v_scene->>'scene_key', '');
    if v_scene_key = '' or not (v_scene_map ? v_scene_key) then
      continue;
    end if;
    v_scene_id := (v_scene_map->>v_scene_key)::uuid;

    for v_branch in
      select value from jsonb_array_elements(coalesce(v_scene->'branches', '[]'::jsonb))
    loop
      v_target_scene_id := null;
      if coalesce(v_branch->>'target_scene_key', '') <> '' and (v_scene_map ? (v_branch->>'target_scene_key')) then
        v_target_scene_id := (v_scene_map->>(v_branch->>'target_scene_key'))::uuid;
      end if;

      insert into public.scene_branches (
        scene_id, "order", label, description, condition_text, condition_type,
        target_scene_id, target_slug, is_dm_only
      ) values (
        v_scene_id,
        coalesce(case when (v_branch->>'order') ~ '^\d+$' then (v_branch->>'order')::int else 0 end, 0),
        coalesce(v_branch->>'label', 'Branch'),
        nullif(v_branch->>'description', ''),
        nullif(v_branch->>'condition_text', ''),
        coalesce(nullif(v_branch->>'condition_type', ''), 'explicit'),
        v_target_scene_id,
        null,
        coalesce((v_branch->>'is_dm_only')::boolean, false)
      );
    end loop;
  end loop;

  return jsonb_build_object('session_id', v_session_id);
end;
$$;

