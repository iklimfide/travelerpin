-- Custom hero images for park hub pages (YP-managed; falls back to type default).

create table if not exists public.yp_park_hero_image (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  park_type text not null,
  name_key text not null,
  park_name text not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yp_park_hero_image_country_code_len check (char_length(country_code) = 2),
  constraint yp_park_hero_image_name_key_len check (char_length(trim(name_key)) between 1 and 200),
  constraint yp_park_hero_image_park_name_len check (char_length(trim(park_name)) between 1 and 120),
  constraint yp_park_hero_image_image_url_len check (char_length(trim(image_url)) between 1 and 2048),
  constraint yp_park_hero_image_park_type check (
    park_type in ('national_park', 'theme_park', 'botanical_garden')
  )
);

create unique index if not exists yp_park_hero_image_unique
  on public.yp_park_hero_image (upper(country_code), park_type, name_key);

create index if not exists yp_park_hero_image_country_idx
  on public.yp_park_hero_image (country_code);

alter table public.yp_park_hero_image enable row level security;

drop policy if exists "YP park hero image is publicly readable" on public.yp_park_hero_image;
create policy "YP park hero image is publicly readable"
  on public.yp_park_hero_image for select
  using (true);
