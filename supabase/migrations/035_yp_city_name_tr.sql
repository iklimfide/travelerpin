-- Optional Turkish display labels for catalog cities (static or YP).
-- Keyed by country + folded EN catalog name key (same as popularity/exclusions).

create table if not exists public.yp_city_name_tr (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  name_key text not null,
  name_tr text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yp_city_name_tr_country_code_len check (char_length(country_code) = 2),
  constraint yp_city_name_tr_name_key_len check (char_length(trim(name_key)) between 1 and 200),
  constraint yp_city_name_tr_name_tr_len check (char_length(trim(name_tr)) between 1 and 120)
);

create unique index if not exists yp_city_name_tr_unique
  on public.yp_city_name_tr (upper(country_code), name_key);

create index if not exists yp_city_name_tr_country_idx
  on public.yp_city_name_tr (country_code);

alter table public.yp_city_name_tr enable row level security;

drop policy if exists "YP city name_tr is publicly readable" on public.yp_city_name_tr;
create policy "YP city name_tr is publicly readable"
  on public.yp_city_name_tr for select
  using (true);
