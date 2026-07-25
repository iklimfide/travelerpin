-- Drop ASCII "Liege" YP catalog row; canonical city name is "Liège" (static catalog).

delete from public.yp_catalog_cities
where upper(country_code) = 'BE'
  and lower(trim(name)) = 'liege';

delete from public.yp_catalog_exclusions
where kind = 'city'
  and upper(country_code) = 'BE'
  and name_key in ('liege', 'liège');

-- Merge YP overlay rows keyed as "liege" into "liège" where needed.
delete from public.yp_city_popularity old
using public.yp_city_popularity keep
where upper(old.country_code) = 'BE'
  and upper(keep.country_code) = 'BE'
  and old.name_key = 'liege'
  and keep.name_key = 'liège';

update public.yp_city_popularity
set name_key = 'liège', updated_at = now()
where upper(country_code) = 'BE'
  and name_key = 'liege';

delete from public.yp_city_name_tr old
using public.yp_city_name_tr keep
where upper(old.country_code) = 'BE'
  and upper(keep.country_code) = 'BE'
  and old.name_key = 'liege'
  and keep.name_key = 'liège';

update public.yp_city_name_tr
set name_key = 'liège', updated_at = now()
where upper(country_code) = 'BE'
  and name_key = 'liege';

delete from public.yp_city_hero_image old
using public.yp_city_hero_image keep
where upper(old.country_code) = 'BE'
  and upper(keep.country_code) = 'BE'
  and old.name_key = 'liege'
  and keep.name_key = 'liège';

update public.yp_city_hero_image
set name_key = 'liège', city_name = 'Liège', updated_at = now()
where upper(country_code) = 'BE'
  and name_key = 'liege';

update public.visited_cities
set city_name = 'Liège', updated_at = now()
where upper(country_code) = 'BE'
  and lower(trim(city_name)) = 'liege'
  and trim(city_name) <> 'Liège';
