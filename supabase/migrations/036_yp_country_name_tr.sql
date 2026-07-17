-- Optional Turkish display labels for countries (ISO + supplemental KT).
-- Keyed by country_code only (unlike city TR which also needs name_key).

create table if not exists public.yp_country_name_tr (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  name_tr text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yp_country_name_tr_code_len check (char_length(country_code) = 2),
  constraint yp_country_name_tr_name_tr_len check (char_length(trim(name_tr)) between 1 and 120)
);

create unique index if not exists yp_country_name_tr_unique
  on public.yp_country_name_tr (upper(country_code));

create index if not exists yp_country_name_tr_code_idx
  on public.yp_country_name_tr (country_code);

alter table public.yp_country_name_tr enable row level security;

drop policy if exists "YP country name_tr is publicly readable" on public.yp_country_name_tr;
create policy "YP country name_tr is publicly readable"
  on public.yp_country_name_tr for select
  using (true);
