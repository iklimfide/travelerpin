-- Public bucket for city/park photos ({user_id}/{filename}.webp)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'city-media',
  'city-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  create policy "City media images are publicly readable"
    on storage.objects for select
    using (bucket_id = 'city-media');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can upload own city media"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'city-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update own city media"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'city-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete own city media"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'city-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception
  when duplicate_object then null;
end $$;
