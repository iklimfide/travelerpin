-- Pin media: one photo_url + many instagram_urls.
-- Bootstraps visited_cities when missing (same pattern as 014 for visited_parks).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.visit_year_month_dates_are_valid(dates text[])
returns boolean
language plpgsql
immutable
strict
as $$
declare
  d text;
begin
  if dates is null then
    return true;
  end if;

  foreach d in array dates loop
    if d !~ '^\d{4}-(0[1-9]|1[0-2])$' then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- visited_cities (create if this project never ran 001)
-- ---------------------------------------------------------------------------

create table if not exists public.visited_cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  city_name text not null,
  country_code char(2) not null,
  country_name text not null,
  latitude double precision,
  longitude double precision,
  note text,
  media_type text check (media_type in ('photo', 'instagram')),
  media_url text,
  media_preview_url text,
  photo_url text,
  instagram_urls text[] not null default '{}',
  visit_dates text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint visited_cities_note_length check (note is null or char_length(note) <= 1000)
);

create index if not exists visited_cities_user_id_idx on public.visited_cities(user_id);

alter table public.visited_cities
  alter column latitude drop not null,
  alter column longitude drop not null;

alter table public.visited_cities
  add column if not exists media_preview_url text;

alter table public.visited_cities
  add column if not exists visit_dates text[] not null default '{}';

alter table public.visited_cities
  add column if not exists photo_url text;

alter table public.visited_cities
  add column if not exists instagram_urls text[] not null default '{}';

do $$
begin
  alter table public.visited_cities
    add constraint visited_cities_visit_dates_format
    check (public.visit_year_month_dates_are_valid(visit_dates));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.visited_cities
    add constraint visited_cities_visit_dates_max check (
      coalesce(array_length(visit_dates, 1), 0) <= 24
    );
exception
  when duplicate_object then null;
end $$;

alter table public.visited_cities enable row level security;

do $$
begin
  create policy "Visited cities are publicly readable"
    on public.visited_cities for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can insert own cities"
    on public.visited_cities for insert with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update own cities"
    on public.visited_cities for update using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete own cities"
    on public.visited_cities for delete using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

drop trigger if exists visited_cities_updated_at on public.visited_cities;
create trigger visited_cities_updated_at
  before update on public.visited_cities
  for each row execute procedure public.set_updated_at();

update public.visited_cities
set photo_url = media_url
where photo_url is null
  and media_type = 'photo'
  and media_url is not null;

update public.visited_cities
set instagram_urls = array[media_url]
where coalesce(array_length(instagram_urls, 1), 0) = 0
  and media_type = 'instagram'
  and media_url is not null;

alter table public.visited_cities
  drop constraint if exists single_media;

alter table public.visited_parks
  drop constraint if exists visited_parks_single_media;

-- ---------------------------------------------------------------------------
-- visited_parks (columns only; table assumed from 008/014)
-- ---------------------------------------------------------------------------

alter table public.visited_parks
  add column if not exists visit_dates text[] not null default '{}';

do $$
begin
  alter table public.visited_parks
    add constraint visited_parks_visit_dates_format
    check (public.visit_year_month_dates_are_valid(visit_dates));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.visited_parks
    add constraint visited_parks_visit_dates_max check (
      coalesce(array_length(visit_dates, 1), 0) <= 24
    );
exception
  when duplicate_object then null;
end $$;

alter table public.visited_parks
  add column if not exists photo_url text;

alter table public.visited_parks
  add column if not exists instagram_urls text[] not null default '{}';

update public.visited_parks
set photo_url = media_url
where photo_url is null
  and media_type = 'photo'
  and media_url is not null;

update public.visited_parks
set instagram_urls = array[media_url]
where coalesce(array_length(instagram_urls, 1), 0) = 0
  and media_type = 'instagram'
  and media_url is not null;

alter table public.visited_parks
  drop constraint if exists visited_parks_single_media;

notify pgrst, 'reload schema';
