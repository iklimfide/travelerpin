-- Up to N photos per pin (see LIMITS.maxPinPhotos); photo_url stays first/thumbnail.

alter table public.visited_cities
  add column if not exists photo_urls text[] not null default '{}';

alter table public.visited_parks
  add column if not exists photo_urls text[] not null default '{}';

update public.visited_cities
set photo_urls = array[photo_url]
where photo_url is not null
  and coalesce(array_length(photo_urls, 1), 0) = 0;

update public.visited_parks
set photo_urls = array[photo_url]
where photo_url is not null
  and coalesce(array_length(photo_urls, 1), 0) = 0;

notify pgrst, 'reload schema';
