-- Allow unlimited Instagram links per pin (remove 24-link cap from 017).

alter table public.visited_cities
  drop constraint if exists visited_cities_instagram_urls_max;

alter table public.visited_parks
  drop constraint if exists visited_parks_instagram_urls_max;

notify pgrst, 'reload schema';
