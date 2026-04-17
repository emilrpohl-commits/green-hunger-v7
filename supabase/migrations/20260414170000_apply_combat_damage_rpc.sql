do $$
begin
  if to_regclass('public.combat_state') is not null
     and to_regclass('public.combat_feed') is not null then
    alter table public.combat_state
      add column if not exists version bigint not null default 0;

    execute $fn$
      create or replace function public.apply_combat_damage(
        p_session_id text,
        p_combatant_id text,
        p_new_cur_hp int,
        p_new_temp_hp int,
        p_round int,
        p_message text,
        p_shared boolean default true,
        p_metadata jsonb default '{}'::jsonb,
        p_combat_active boolean default true,
        p_active_combatant_index int default 0,
        p_initiative_phase boolean default false,
        p_ilya_assigned_to text default null,
        p_ruleset_context jsonb default null
      )
      returns table (
        feed_id bigint,
        updated_combatants jsonb,
        updated_at timestamptz,
        version bigint
      )
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        v_state public.combat_state%rowtype;
        v_next_combatants jsonb;
        v_feed_id bigint;
        v_now timestamptz := now();
      begin
        select *
          into v_state
          from public.combat_state
         where id = p_session_id
         for update;

        if not found then
          raise exception 'combat_state row not found for session_id=%', p_session_id;
        end if;

        v_next_combatants := (
          select coalesce(
            jsonb_agg(
              case
                when elem->>'id' = p_combatant_id then
                  jsonb_set(
                    jsonb_set(elem, '{curHp}', to_jsonb(greatest(0, coalesce(p_new_cur_hp, 0))), true),
                    '{tempHp}', to_jsonb(greatest(0, coalesce(p_new_temp_hp, 0))), true
                  )
                else elem
              end
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(coalesce(v_state.combatants, '[]'::jsonb)) elem
        );

        update public.combat_state
           set combatants = v_next_combatants,
               round = coalesce(p_round, v_state.round),
               active = coalesce(p_combat_active, v_state.active),
               active_combatant_index = coalesce(p_active_combatant_index, v_state.active_combatant_index),
               initiative_phase = coalesce(p_initiative_phase, v_state.initiative_phase),
               ilya_assigned_to = coalesce(p_ilya_assigned_to, v_state.ilya_assigned_to),
               ruleset_context = coalesce(p_ruleset_context, v_state.ruleset_context),
               updated_at = v_now,
               version = coalesce(v_state.version, 0) + 1
         where id = p_session_id;

        insert into public.combat_feed (
          session_id,
          session_run_id,
          round,
          text,
          type,
          shared,
          metadata,
          timestamp
        ) values (
          p_session_id,
          p_session_id,
          coalesce(p_round, v_state.round),
          p_message,
          'damage',
          coalesce(p_shared, true),
          coalesce(p_metadata, '{}'::jsonb),
          v_now
        )
        returning id into v_feed_id;

        return query
        select
          v_feed_id,
          cs.combatants,
          cs.updated_at,
          cs.version
        from public.combat_state cs
        where cs.id = p_session_id;
      end;
      $body$;
    $fn$;
  end if;
end $$;
