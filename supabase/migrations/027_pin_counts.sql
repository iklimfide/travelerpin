-- Materialized pinner counts: increment on pin, read directly (no recount scans).

alter table public.published_hubs
  add column if not exists pinner_count int not null default 0 check (pinner_count >= 0);

create table if not exists public.country_pinners (
  user_id uuid not null references auth.users (id) on delete cascade,
  country_code text not null,
  primary key (user_id, country_code)
);

create table if not exists public.country_pinner_stats (
  country_code text primary key,
  pinner_count int not null default 0 check (pinner_count >= 0)
);

create or replace function public.hub_slug_from_name(p_name text)
returns text
language sql
immutable
as $$
  select left(
    trim(both '-' from lower(
      regexp_replace(
        regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'),
        '-+',
        '-',
        'g'
      )
    )),
    50
  );
$$;

create or replace function public.try_add_country_pinner(p_user_id uuid, p_country_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_country_code));
  v_rows int;
begin
  insert into public.country_pinners (user_id, country_code)
  values (p_user_id, v_code)
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    insert into public.country_pinner_stats (country_code, pinner_count)
    values (v_code, 1)
    on conflict (country_code) do update
      set pinner_count = country_pinner_stats.pinner_count + 1;
  end if;
end;
$$;

create or replace function public.try_remove_country_pinner(p_user_id uuid, p_country_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_country_code));
  v_rows int;
  v_still_has boolean;
begin
  select exists (
    select 1 from public.visited_countries
    where user_id = p_user_id and country_code = v_code
    union all
    select 1 from public.visited_cities
    where user_id = p_user_id and country_code = v_code
    union all
    select 1 from public.visited_parks
    where user_id = p_user_id and country_code = v_code
  ) into v_still_has;

  if v_still_has then
    return;
  end if;

  delete from public.country_pinners
  where user_id = p_user_id and country_code = v_code;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.country_pinner_stats
    set pinner_count = greatest(pinner_count - 1, 0)
    where country_code = v_code;
  end if;
end;
$$;

create or replace function public.bump_city_hub_pinner_count(p_city_name text, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := public.hub_slug_from_name(p_city_name);
begin
  if v_slug = '' or p_delta = 0 then
    return;
  end if;

  update public.published_hubs
  set pinner_count = greatest(pinner_count + p_delta, 0)
  where hub_kind = 'city' and slug = v_slug;
end;
$$;

create or replace function public.bump_park_hub_pinner_count(p_park_name text, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := public.hub_slug_from_name(p_park_name);
begin
  if v_slug = '' or p_delta = 0 then
    return;
  end if;

  update public.published_hubs
  set pinner_count = greatest(pinner_count + p_delta, 0)
  where hub_kind = 'park' and slug = v_slug;
end;
$$;

create or replace function public.on_visited_country_pin_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_add_country_pinner(new.user_id, new.country_code);
  return new;
end;
$$;

create or replace function public.on_visited_country_pin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_remove_country_pinner(old.user_id, old.country_code);
  return old;
end;
$$;

create or replace function public.on_visited_city_pin_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_add_country_pinner(new.user_id, new.country_code);
  perform public.bump_city_hub_pinner_count(new.city_name, 1);
  return new;
end;
$$;

create or replace function public.on_visited_city_pin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_remove_country_pinner(old.user_id, old.country_code);
  perform public.bump_city_hub_pinner_count(old.city_name, -1);
  return old;
end;
$$;

create or replace function public.on_visited_park_pin_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_add_country_pinner(new.user_id, new.country_code);
  perform public.bump_park_hub_pinner_count(new.park_name, 1);
  return new;
end;
$$;

create or replace function public.on_visited_park_pin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_remove_country_pinner(old.user_id, old.country_code);
  perform public.bump_park_hub_pinner_count(old.park_name, -1);
  return old;
end;
$$;

drop trigger if exists visited_countries_pinner_insert on public.visited_countries;
create trigger visited_countries_pinner_insert
  after insert on public.visited_countries
  for each row execute function public.on_visited_country_pin_insert();

drop trigger if exists visited_countries_pinner_delete on public.visited_countries;
create trigger visited_countries_pinner_delete
  after delete on public.visited_countries
  for each row execute function public.on_visited_country_pin_delete();

drop trigger if exists visited_cities_pinner_insert on public.visited_cities;
create trigger visited_cities_pinner_insert
  after insert on public.visited_cities
  for each row execute function public.on_visited_city_pin_insert();

drop trigger if exists visited_cities_pinner_delete on public.visited_cities;
create trigger visited_cities_pinner_delete
  after delete on public.visited_cities
  for each row execute function public.on_visited_city_pin_delete();

drop trigger if exists visited_parks_pinner_insert on public.visited_parks;
create trigger visited_parks_pinner_insert
  after insert on public.visited_parks
  for each row execute function public.on_visited_park_pin_insert();

drop trigger if exists visited_parks_pinner_delete on public.visited_parks;
create trigger visited_parks_pinner_delete
  after delete on public.visited_parks
  for each row execute function public.on_visited_park_pin_delete();

-- publish_hub: first pin on a new hub starts at 1 (trigger may not find the row yet).
create or replace function public.publish_hub(
  p_hub_kind text,
  p_slug text,
  p_country_code text,
  p_place_name text,
  p_country_name text default null,
  p_park_type text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_hub_kind not in ('city', 'park') then
    raise exception 'invalid hub kind';
  end if;

  insert into public.published_hubs (
    hub_kind,
    slug,
    country_code,
    place_name,
    country_name,
    park_type,
    pinner_count
  )
  values (
    p_hub_kind,
    lower(trim(p_slug)),
    upper(trim(p_country_code)),
    trim(p_place_name),
    nullif(trim(coalesce(p_country_name, '')), ''),
    nullif(trim(coalesce(p_park_type, '')), ''),
    1
  )
  on conflict (hub_kind, slug) do update set
    country_code = excluded.country_code,
    place_name = excluded.place_name,
    country_name = coalesce(excluded.country_name, published_hubs.country_name),
    park_type = coalesce(excluded.park_type, published_hubs.park_type);
end;
$$;

-- Backfill country pinners from existing pins.
insert into public.country_pinners (user_id, country_code)
select distinct user_id, upper(country_code) from public.visited_countries
union
select distinct user_id, upper(country_code) from public.visited_cities
union
select distinct user_id, upper(country_code) from public.visited_parks
on conflict do nothing;

insert into public.country_pinner_stats (country_code, pinner_count)
select country_code, count(*)::int
from public.country_pinners
group by country_code
on conflict (country_code) do update
  set pinner_count = excluded.pinner_count;

update public.published_hubs ph
set pinner_count = src.cnt
from (
  select public.hub_slug_from_name(city_name) as slug, count(*)::int as cnt
  from public.visited_cities
  where trim(city_name) <> ''
  group by 1
) src
where ph.hub_kind = 'city' and ph.slug = src.slug;

update public.published_hubs ph
set pinner_count = src.cnt
from (
  select public.hub_slug_from_name(park_name) as slug, count(*)::int as cnt
  from public.visited_parks
  where trim(park_name) <> ''
  group by 1
) src
where ph.hub_kind = 'park' and ph.slug = src.slug;

alter table public.country_pinners enable row level security;
alter table public.country_pinner_stats enable row level security;

create policy "Country pinners are publicly readable"
  on public.country_pinners for select using (true);

create policy "Country pinner stats are publicly readable"
  on public.country_pinner_stats for select using (true);
