alter table public.profiles
  add column if not exists cover_url text;

comment on column public.profiles.cover_url is
  'Optional profile hero cover image URL (Supabase storage covers bucket).';

-- Public bucket for profile cover photos ({user_id}/cover.webp)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Cover images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "Users can upload own cover"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own cover"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own cover"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
