-- Allow YP catalog cities/parks without coordinates (name + country is enough).

alter table public.yp_catalog_cities
  alter column latitude drop not null,
  alter column longitude drop not null;

alter table public.yp_catalog_parks
  alter column latitude drop not null,
  alter column longitude drop not null;

alter table public.yp_catalog_cities
  drop constraint if exists yp_catalog_cities_coords_pair;

alter table public.yp_catalog_cities
  add constraint yp_catalog_cities_coords_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  );

alter table public.yp_catalog_parks
  drop constraint if exists yp_catalog_parks_coords_pair;

alter table public.yp_catalog_parks
  add constraint yp_catalog_parks_coords_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  );
