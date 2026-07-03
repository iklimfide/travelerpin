-- Optional Instagram profile link for public traveler profiles.

alter table public.profiles
  add column if not exists instagram_url text;

