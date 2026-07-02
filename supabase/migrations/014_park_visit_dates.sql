-- visited_parks bootstrap (if 008 was never applied) + visit_dates column

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

create table if not exists public.visited_parks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  park_name text not null,
  park_type text not null,
  country_code char(2) not null,
  country_name text not null,
  latitude double precision,
  longitude double precision,
  note text,
  media_type text check (media_type in ('photo', 'instagram')),
  media_url text,
  visit_dates text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint visited_parks_note_length check (note is null or char_length(note) <= 1000),
  constraint visited_parks_single_media check (
    (media_type is null and media_url is null)
    or (media_type is not null and media_url is not null)
  )
);

alter table public.visited_parks
  drop constraint if exists visited_parks_park_type_check;

alter table public.visited_parks
  add constraint visited_parks_park_type_check
  check (park_type in ('national_park', 'theme_park', 'botanical_garden'));

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

create index if not exists visited_parks_user_id_idx on public.visited_parks(user_id);
create index if not exists visited_parks_country_code_idx on public.visited_parks(country_code);

drop trigger if exists visited_parks_updated_at on public.visited_parks;
create trigger visited_parks_updated_at
  before update on public.visited_parks
  for each row execute procedure public.set_updated_at();

alter table public.visited_parks enable row level security;

do $$
begin
  create policy "Visited parks are publicly readable"
    on public.visited_parks for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can insert own parks"
    on public.visited_parks for insert with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update own parks"
    on public.visited_parks for update using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete own parks"
    on public.visited_parks for delete using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;
