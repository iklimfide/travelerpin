-- Allow actors to remove pin notifications when they unpin a place.

create or replace function public.delete_pin_notifications(
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'not authorized';
  end if;

  if p_entity_type is null or p_entity_id is null then
    return 0;
  end if;

  delete from public.notifications
  where actor_id = p_actor_id
    and entity_type = p_entity_type
    and entity_id = p_entity_id
    and type in ('pin_country', 'pin_city', 'pin_park', 'pin_media');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_pin_notifications(uuid, text, text) from public;
grant execute on function public.delete_pin_notifications(uuid, text, text) to authenticated;
