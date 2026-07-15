-- YP overrides for city "Popular" badges in the add-destination catalog.

create table if not exists public.yp_city_popularity (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  name_key text not null,
  is_popular boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yp_city_popularity_country_code_len check (char_length(country_code) = 2),
  constraint yp_city_popularity_name_key_len check (char_length(trim(name_key)) between 1 and 200)
);

create unique index if not exists yp_city_popularity_unique
  on public.yp_city_popularity (upper(country_code), name_key);

create index if not exists yp_city_popularity_country_idx
  on public.yp_city_popularity (country_code);

alter table public.yp_city_popularity enable row level security;

drop policy if exists "YP city popularity is publicly readable" on public.yp_city_popularity;
create policy "YP city popularity is publicly readable"
  on public.yp_city_popularity for select
  using (true);
