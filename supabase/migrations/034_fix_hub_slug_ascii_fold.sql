-- Fix hub URL slugs: fold Latin letters (Düsseldorf → dusseldorf) instead of
-- stripping them to hyphens (d-sseldorf). Aligns with lib/utils/ascii-slug.ts.

create table if not exists public.published_hub_slug_redirects (
  hub_kind text not null check (hub_kind in ('city', 'park')),
  from_slug text not null,
  to_slug text not null,
  primary key (hub_kind, from_slug)
);

create index if not exists published_hub_slug_redirects_to_idx
  on public.published_hub_slug_redirects (hub_kind, to_slug);

alter table public.published_hub_slug_redirects enable row level security;

drop policy if exists "published_hub_slug_redirects_public_read"
  on public.published_hub_slug_redirects;
create policy "published_hub_slug_redirects_public_read"
  on public.published_hub_slug_redirects for select using (true);

create or replace function public.hub_slug_from_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v text := trim(coalesce(p_name, ''));
begin
  if v = '' then
    return '';
  end if;

  -- Letters that do not NFD-fold to ASCII on their own (mirror JS foldLatinLetters).
  v := replace(v, 'ß', 'ss');
  v := replace(v, 'ẞ', 'ss');
  v := replace(v, 'ı', 'i');
  v := replace(v, 'İ', 'i');
  v := replace(v, 'æ', 'ae');
  v := replace(v, 'Æ', 'ae');
  v := replace(v, 'œ', 'oe');
  v := replace(v, 'Œ', 'oe');
  v := replace(v, 'ø', 'o');
  v := replace(v, 'Ø', 'o');
  v := replace(v, 'ð', 'd');
  v := replace(v, 'Ð', 'd');
  v := replace(v, 'þ', 'th');
  v := replace(v, 'Þ', 'th');
  v := replace(v, 'ł', 'l');
  v := replace(v, 'Ł', 'l');
  v := replace(v, 'đ', 'd');
  v := replace(v, 'Đ', 'd');

  -- Common Latin diacritics → ASCII base (same outcome as NFD + strip marks).
  v := translate(
    v,
    'ÀÁÂÃÄÅĀĂĄàáâãäåāăąÈÉÊËĒĔĖĘĚèéêëēĕėęěÌÍÎÏĨĪĬĮìíîïĩīĭįÒÓÔÕÖŌŎŐòóôõöōŏőÙÚÛÜŨŪŬŮŰùúûüũūŭůűÝŸýÿĆĈĊČćĉċčÇçĎďĜĞĠĢĝğġģĤĥĴĵĶķĹĻĽĺļľŃŅŇńņňŔŖŘŕŗřŚŜŞŠśŝşšŢŤţťŴŵŶŷŹŻŽźżž',
    'AAAAAAAAAaaaaaaaaaEEEEEEEEEeeeeeeeeeIIIIIIIIiiiiiiiiOOOOOOOOooooooooUUUUUUUUUuuuuuuuuuYYyyCCCCccccCcDdGGGGggggHhJjKkLLLlllNNNnnnRRRrrrSSSSssssTTttWwYyZZZzzz'
  );

  v := lower(v);
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '-+', '-', 'g');
  v := trim(both '-' from v);

  return left(v, 50);
end;
$$;

-- Record redirects for rows whose slug will change, then rewrite slugs.
insert into public.published_hub_slug_redirects (hub_kind, from_slug, to_slug)
select
  hub_kind,
  slug,
  public.hub_slug_from_name(place_name)
from public.published_hubs
where
  trim(place_name) <> ''
  and slug is distinct from public.hub_slug_from_name(place_name)
  and public.hub_slug_from_name(place_name) <> ''
on conflict (hub_kind, from_slug) do update
  set to_slug = excluded.to_slug;

-- Prefer keeping the canonical-slug row when both old and new exist; merge counts.
with targets as (
  select
    h.ctid as row_id,
    h.hub_kind,
    h.slug as old_slug,
    public.hub_slug_from_name(h.place_name) as new_slug,
    h.pinner_count
  from public.published_hubs h
  where
    trim(h.place_name) <> ''
    and h.slug is distinct from public.hub_slug_from_name(h.place_name)
    and public.hub_slug_from_name(h.place_name) <> ''
),
merged as (
  update public.published_hubs existing
  set pinner_count = existing.pinner_count + t.pinner_count
  from targets t
  where
    existing.hub_kind = t.hub_kind
    and existing.slug = t.new_slug
  returning t.row_id
)
delete from public.published_hubs h
using merged m
where h.ctid = m.row_id;

update public.published_hubs h
set slug = public.hub_slug_from_name(h.place_name)
where
  trim(h.place_name) <> ''
  and h.slug is distinct from public.hub_slug_from_name(h.place_name)
  and public.hub_slug_from_name(h.place_name) <> ''
  and not exists (
    select 1
    from public.published_hubs other
    where other.hub_kind = h.hub_kind
      and other.slug = public.hub_slug_from_name(h.place_name)
      and other.ctid <> h.ctid
  );
