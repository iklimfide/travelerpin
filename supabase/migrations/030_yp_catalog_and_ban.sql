-- YP (kamikaze) catalog overlays + profile ban fields

alter table public.profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

create table if not exists public.yp_catalog_cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null,
  country_name text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  constraint yp_catalog_cities_country_code_len check (char_length(country_code) = 2),
  constraint yp_catalog_cities_name_len check (char_length(trim(name)) between 1 and 120),
  constraint yp_catalog_cities_coords_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  )
);

create unique index if not exists yp_catalog_cities_country_name_uidx
  on public.yp_catalog_cities (upper(country_code), lower(trim(name)));

create index if not exists yp_catalog_cities_country_idx
  on public.yp_catalog_cities (country_code);

create table if not exists public.yp_catalog_parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  park_type text not null,
  country_code text not null,
  country_name text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  constraint yp_catalog_parks_country_code_len check (char_length(country_code) = 2),
  constraint yp_catalog_parks_name_len check (char_length(trim(name)) between 1 and 160),
  constraint yp_catalog_parks_park_type_check check (
    park_type in ('national_park', 'theme_park', 'botanical_garden')
  ),
  constraint yp_catalog_parks_coords_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  )
);

create unique index if not exists yp_catalog_parks_country_name_uidx
  on public.yp_catalog_parks (upper(country_code), lower(trim(name)));

create index if not exists yp_catalog_parks_country_idx
  on public.yp_catalog_parks (country_code);

create table if not exists public.yp_catalog_exclusions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  country_code text not null,
  name_key text not null,
  created_at timestamptz not null default now(),
  constraint yp_catalog_exclusions_kind_check check (kind in ('city', 'park')),
  constraint yp_catalog_exclusions_country_code_len check (char_length(country_code) = 2),
  constraint yp_catalog_exclusions_name_key_len check (char_length(trim(name_key)) between 1 and 200)
);

create unique index if not exists yp_catalog_exclusions_unique
  on public.yp_catalog_exclusions (kind, upper(country_code), name_key);

alter table public.yp_catalog_cities enable row level security;
alter table public.yp_catalog_parks enable row level security;
alter table public.yp_catalog_exclusions enable row level security;

drop policy if exists "YP catalog cities are publicly readable" on public.yp_catalog_cities;
create policy "YP catalog cities are publicly readable"
  on public.yp_catalog_cities for select
  using (true);

drop policy if exists "YP catalog parks are publicly readable" on public.yp_catalog_parks;
create policy "YP catalog parks are publicly readable"
  on public.yp_catalog_parks for select
  using (true);

drop policy if exists "YP catalog exclusions are publicly readable" on public.yp_catalog_exclusions;
create policy "YP catalog exclusions are publicly readable"
  on public.yp_catalog_exclusions for select
  using (true);
