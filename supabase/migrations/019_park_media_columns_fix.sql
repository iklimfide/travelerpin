-- Park pin: visit_dates + photo_url + instagram_urls (run once in Supabase SQL Editor).

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

alter table public.visited_parks
  add column if not exists visit_dates text[] not null default '{}';

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

do $$
begin
  alter table public.visited_parks
    add constraint visited_parks_visit_dates_format
    check (public.visit_year_month_dates_are_valid(visit_dates));
exception
  when duplicate_object then null;
end $$;

drop trigger if exists visited_parks_updated_at on public.visited_parks;
create trigger visited_parks_updated_at
  before update on public.visited_parks
  for each row execute procedure public.set_updated_at();

notify pgrst, 'reload schema';
