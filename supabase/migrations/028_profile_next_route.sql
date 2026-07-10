-- Ordered upcoming route stops for the profile "Next Route" section.
alter table public.profiles
  add column if not exists next_route jsonb not null default '[]'::jsonb;

comment on column public.profiles.next_route is
  'Ordered upcoming route stops (country/city/park display names + optional slug/path).';
