-- Ensure visited_cities has pin media columns (safe if 017 already ran).
alter table public.visited_cities
  add column if not exists photo_url text;

alter table public.visited_cities
  add column if not exists instagram_urls text[] not null default '{}';

notify pgrst, 'reload schema';
