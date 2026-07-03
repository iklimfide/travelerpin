-- Profile follows and in-app notifications.

create table public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self check (follower_id <> following_id)
);

create index profile_follows_following_id_idx on public.profile_follows (following_id);
create index profile_follows_follower_id_idx on public.profile_follows (follower_id);

alter table public.profile_follows enable row level security;

create policy "Follows are publicly readable"
  on public.profile_follows for select using (true);

create policy "Users can follow others"
  on public.profile_follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.profile_follows for delete
  using (auth.uid() = follower_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in (
    'follow',
    'pin_country',
    'pin_city',
    'pin_park',
    'pin_media'
  )),
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Users mark own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'not authorized';
  end if;

  if p_recipient_id = p_actor_id then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    payload
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into notification_id;

  return notification_id;
end;
$$;

create or replace function public.notify_profile_followers(
  p_actor_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id text,
  p_payload jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    payload
  )
  select
    f.follower_id,
    p_actor_id,
    p_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb)
  from public.profile_follows f
  where f.following_id = p_actor_id
    and f.follower_id <> p_actor_id;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.follow_profile(p_following_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  following_username text;
  inserted integer;
begin
  if actor_id is null then
    raise exception 'not authenticated';
  end if;

  if actor_id = p_following_id then
    raise exception 'cannot follow yourself';
  end if;

  insert into public.profile_follows (follower_id, following_id)
  values (actor_id, p_following_id)
  on conflict do nothing;

  get diagnostics inserted = row_count;

  if inserted = 0 then
    return false;
  end if;

  select username into following_username
  from public.profiles
  where id = p_following_id;

  perform public.create_notification(
    p_following_id,
    actor_id,
    'follow',
    'profile',
    following_username,
    jsonb_build_object(
      'actorUsername',
      (select username from public.profiles where id = actor_id)
    )
  );

  return true;
end;
$$;

create or replace function public.unfollow_profile(p_following_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'not authenticated';
  end if;

  delete from public.profile_follows
  where follower_id = actor_id
    and following_id = p_following_id;

  return found;
end;
$$;

revoke all on function public.create_notification(uuid, uuid, text, text, text, jsonb) from public;
revoke all on function public.notify_profile_followers(uuid, text, text, text, jsonb) from public;
revoke all on function public.follow_profile(uuid) from public;
revoke all on function public.unfollow_profile(uuid) from public;

grant execute on function public.create_notification(uuid, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.notify_profile_followers(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.follow_profile(uuid) to authenticated;
grant execute on function public.unfollow_profile(uuid) to authenticated;
