-- Rollback: drop function public.reorder_beats(jsonb); restore client-side multi-update from prior app revision.

create or replace function public.reorder_beats(p_updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i int;
  item jsonb;
  expected_scene uuid;
  updated_rows int;
begin
  if p_updates is null or jsonb_typeof(p_updates) <> 'array' or jsonb_array_length(p_updates) = 0 then
    return;
  end if;

  expected_scene := (p_updates -> 0 ->> 'scene_id')::uuid;
  if expected_scene is null then
    raise exception 'reorder_beats: scene_id required on each payload row';
  end if;

  for i in 0 .. jsonb_array_length(p_updates) - 1 loop
    item := p_updates -> i;
    if (item ->> 'scene_id')::uuid is distinct from expected_scene then
      raise exception 'reorder_beats: mixed scene_id in batch';
    end if;

    update public.beats
    set
      "order" = (item ->> 'order')::int,
      updated_at = now()
    where id = (item ->> 'id')::uuid
      and scene_id = expected_scene;

    get diagnostics updated_rows = row_count;
    if updated_rows = 0 then
      raise exception 'reorder_beats: beat % not found for scene', (item ->> 'id');
    end if;
  end loop;
end;
$$;

grant execute on function public.reorder_beats(jsonb) to anon, authenticated;

comment on function public.reorder_beats(jsonb) is
  'Atomic beat reorder: pass jsonb array of {id, order, scene_id} for one scene.';
