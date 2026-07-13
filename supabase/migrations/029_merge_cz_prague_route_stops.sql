-- Merge Czech Prague district/alias city names into canonical "Prague"
-- in next_route stops and visited city pins.

create or replace function public.is_cz_prague_alias(city_name text, country_code text)
returns boolean
language sql
immutable
as $$
  select upper(coalesce(country_code, '')) = 'CZ'
    and (
      lower(trim(city_name)) in ('prague', 'praha')
      or lower(trim(city_name)) ~ '^prague [0-9]+$'
      or lower(trim(city_name)) ~ '^praha [0-9]+$'
    );
$$;

create or replace function public.normalize_cz_prague_city_name(city_name text, country_code text)
returns text
language sql
immutable
as $$
  select case
    when public.is_cz_prague_alias(city_name, country_code) then 'Prague'
    else city_name
  end;
$$;

create or replace function public.normalize_next_route_stops(stops jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '[]'::jsonb;
  stop jsonb;
  normalized jsonb;
  dedupe_keys text[] := '{}';
  dedupe_key text;
  kind text;
  code text;
  name text;
begin
  if stops is null or jsonb_typeof(stops) <> 'array' then
    return '[]'::jsonb;
  end if;

  for stop in
    select value
    from jsonb_array_elements(stops)
  loop
    kind := stop->>'kind';
    code := upper(coalesce(stop->>'countryCode', ''));
    name := coalesce(stop->>'name', '');

    if kind = 'city' and code = 'CZ' and public.is_cz_prague_alias(name, code) then
      normalized := stop
        || jsonb_build_object(
          'name', 'Prague',
          'slug', 'prague',
          'href', '/city/prague'
        );
      name := 'Prague';
    else
      normalized := stop;
    end if;

    if kind = 'city' and code <> '' then
      dedupe_key := 'city:' || code || ':' || lower(trim(name));
    elsif kind = 'country' and code <> '' then
      dedupe_key := 'country:' || code || ':' || lower(trim(coalesce(stop->>'name', '')));
    else
      dedupe_key := coalesce(kind, 'stop') || ':' || lower(trim(name));
    end if;

    if dedupe_key = any(dedupe_keys) then
      continue;
    end if;

    dedupe_keys := array_append(dedupe_keys, dedupe_key);
    result := result || jsonb_build_array(normalized);
  end loop;

  return result;
end;
$$;

update public.profiles
set next_route = public.normalize_next_route_stops(next_route)
where next_route is distinct from public.normalize_next_route_stops(next_route);

update public.visited_cities
set
  city_name = 'Prague',
  updated_at = now()
where country_code = 'CZ'
  and public.is_cz_prague_alias(city_name, country_code)
  and trim(city_name) <> 'Prague';

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, country_code, lower(trim(city_name))
      order by created_at asc, id asc
    ) as row_num
  from public.visited_cities
  where country_code = 'CZ'
    and lower(trim(city_name)) = 'prague'
)
delete from public.visited_cities visited
using ranked
where visited.id = ranked.id
  and ranked.row_num > 1;
