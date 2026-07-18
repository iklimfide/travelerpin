-- Preferred UI / share-preview locale for the profile owner.

alter table public.profiles
  add column if not exists locale text;

update public.profiles
set locale = 'en'
where locale is null;

alter table public.profiles
  alter column locale set default 'en';

alter table public.profiles
  alter column locale set not null;

alter table public.profiles
  drop constraint if exists profiles_locale_check;

alter table public.profiles
  add constraint profiles_locale_check
  check (locale in ('en', 'tr'));

comment on column public.profiles.locale is
  'Owner preferred locale for UI and Open Graph / link-preview copy (en|tr).';
