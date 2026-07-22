-- YP overrides for park "Popular" badges in the add-destination catalog.

create table if not exists public.yp_park_popularity (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  name_key text not null,
  park_type text not null,
  is_popular boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yp_park_popularity_country_code_len check (char_length(country_code) = 2),
  constraint yp_park_popularity_name_key_len check (char_length(trim(name_key)) between 1 and 200),
  constraint yp_park_popularity_park_type check (
    park_type in ('national_park', 'theme_park', 'botanical_garden')
  )
);

create unique index if not exists yp_park_popularity_unique
  on public.yp_park_popularity (upper(country_code), name_key, park_type);

create index if not exists yp_park_popularity_country_idx
  on public.yp_park_popularity (country_code);

alter table public.yp_park_popularity enable row level security;

drop policy if exists "YP park popularity is publicly readable" on public.yp_park_popularity;
create policy "YP park popularity is publicly readable"
  on public.yp_park_popularity for select
  using (true);
