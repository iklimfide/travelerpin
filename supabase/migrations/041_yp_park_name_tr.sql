-- Optional Turkish display labels for catalog parks (static or YP).
-- Keyed by country + folded EN catalog name key + park type.

create table if not exists public.yp_park_name_tr (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  name_key text not null,
  park_type text not null,
  name_tr text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yp_park_name_tr_country_code_len check (char_length(country_code) = 2),
  constraint yp_park_name_tr_name_key_len check (char_length(trim(name_key)) between 1 and 200),
  constraint yp_park_name_tr_name_tr_len check (char_length(trim(name_tr)) between 1 and 120),
  constraint yp_park_name_tr_park_type check (
    park_type in ('national_park', 'theme_park', 'botanical_garden')
  )
);

create unique index if not exists yp_park_name_tr_unique
  on public.yp_park_name_tr (upper(country_code), name_key, park_type);

create index if not exists yp_park_name_tr_country_idx
  on public.yp_park_name_tr (country_code);

alter table public.yp_park_name_tr enable row level security;

drop policy if exists "YP park name_tr is publicly readable" on public.yp_park_name_tr;
create policy "YP park name_tr is publicly readable"
  on public.yp_park_name_tr for select
  using (true);
