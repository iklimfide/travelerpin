-- Wishlist is public on the profile map by default (new signups + legacy false defaults).
alter table public.profiles
  alter column wishlist_public set default true;

update public.profiles
  set wishlist_public = true
  where wishlist_public = false;
