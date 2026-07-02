-- Minimal fix when 014 was not applied: visit_dates column + updated_at trigger support

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

-- Refresh PostgREST schema cache so API sees visit_dates
notify pgrst, 'reload schema';
