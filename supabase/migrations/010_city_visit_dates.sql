-- Month-year visit dates per city (stored as YYYY-MM text, e.g. 2024-11)

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

alter table public.visited_cities
  add column if not exists visit_dates text[] not null default '{}';

alter table public.visited_cities
  drop constraint if exists visited_cities_visit_dates_format;

alter table public.visited_cities
  add constraint visited_cities_visit_dates_format
  check (public.visit_year_month_dates_are_valid(visit_dates));

alter table public.visited_cities
  drop constraint if exists visited_cities_visit_dates_max;

alter table public.visited_cities
  add constraint visited_cities_visit_dates_max check (
    coalesce(array_length(visit_dates, 1), 0) <= 24
  );
