-- 1. Create storage bucket for smartdine-images
insert into storage.buckets (id, name, public)
values ('smartdine-images', 'smartdine-images', true)
on conflict (id) do nothing;

-- 2. Enable row level security on storage.objects (if not already enabled)
alter table storage.objects enable row level security;

-- 3. Policy to allow public to view all images
drop policy if exists "Allow public read access to images" on storage.objects;
create policy "Allow public read access to images"
on storage.objects for select
using (bucket_id = 'smartdine-images');

-- 4. Policy to allow authenticated restaurant users to upload images to their own folder
drop policy if exists "Allow staff to upload images" on storage.objects;
create policy "Allow staff to upload images"
on storage.objects for insert
with check (
  bucket_id = 'smartdine-images'
  and auth.role() = 'authenticated'
  and (
    (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  )
);

-- 5. Policy to allow authenticated restaurant users to update/overwrite their own images
drop policy if exists "Allow staff to update images" on storage.objects;
create policy "Allow staff to update images"
on storage.objects for update
using (
  bucket_id = 'smartdine-images'
  and auth.role() = 'authenticated'
  and (
    (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  )
);

-- 6. Policy to allow authenticated restaurant users to delete their own images
drop policy if exists "Allow staff to delete images" on storage.objects;
create policy "Allow staff to delete images"
on storage.objects for delete
using (
  bucket_id = 'smartdine-images'
  and auth.role() = 'authenticated'
  and (
    (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  )
);
