-- Hub pages that were opened by at least one pin stay public even if all pins are removed.
create table public.published_hubs (
  hub_kind text not null check (hub_kind in ('city', 'park')),
  slug text not null,
  country_code text not null,
  place_name text not null,
  country_name text,
  park_type text check (park_type is null or park_type in ('national_park', 'theme_park', 'botanical_garden')),
  published_at timestamptz not null default now(),
  primary key (hub_kind, slug)
);

create index published_hubs_kind_slug_idx on public.published_hubs (hub_kind, slug);

alter table public.published_hubs enable row level security;

create policy "Published hubs are publicly readable"
  on public.published_hubs for select using (true);

-- Upsert from API after a successful pin insert (authenticated users only).
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
    park_type
  )
  values (
    p_hub_kind,
    lower(trim(p_slug)),
    upper(trim(p_country_code)),
    trim(p_place_name),
    nullif(trim(coalesce(p_country_name, '')), ''),
    nullif(trim(coalesce(p_park_type, '')), '')
  )
  on conflict (hub_kind, slug) do update set
    country_code = excluded.country_code,
    place_name = excluded.place_name,
    country_name = coalesce(excluded.country_name, published_hubs.country_name),
    park_type = coalesce(excluded.park_type, published_hubs.park_type);
end;
$$;

revoke all on function public.publish_hub(text, text, text, text, text, text) from public;
grant execute on function public.publish_hub(text, text, text, text, text, text) to authenticated;

-- Backfill hubs that already have pins (approximate slug; app uses exact slug on new pins).
insert into public.published_hubs (hub_kind, slug, country_code, place_name, country_name, park_type)
select distinct
  'city',
  trim(both '-' from lower(regexp_replace(regexp_replace(trim(city_name), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))),
  country_code,
  city_name,
  country_name,
  null
from public.visited_cities
where trim(city_name) <> ''
on conflict (hub_kind, slug) do nothing;

insert into public.published_hubs (hub_kind, slug, country_code, place_name, country_name, park_type)
select distinct
  'park',
  trim(both '-' from lower(regexp_replace(regexp_replace(trim(park_name), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))),
  country_code,
  park_name,
  country_name,
  park_type
from public.visited_parks
where trim(park_name) <> ''
on conflict (hub_kind, slug) do nothing;
