-- =========================
-- Pretty Bites: Supabase Storage Setup (pb-images bucket)
-- Allow ADMIN uploads using x-admin-key header
-- =========================

-- 1) Create bucket (run once)
insert into storage.buckets (id, name, public)
values ('pb-images','pb-images', true)
on conflict (id) do update set public = true;

-- 2) Enable RLS on storage.objects (usually enabled already)
alter table storage.objects enable row level security;

-- 3) Drop old policies if exist
drop policy if exists "pb_images_public_read" on storage.objects;
drop policy if exists "pb_images_admin_insert" on storage.objects;
drop policy if exists "pb_images_admin_update" on storage.objects;
drop policy if exists "pb_images_admin_delete" on storage.objects;

-- 4) Public can read objects in this bucket
create policy "pb_images_public_read"
on storage.objects for select
to anon
using (bucket_id = 'pb-images');

-- 5) Admin can upload/update/delete using x-admin-key header
-- IMPORTANT: PB_ADMIN_KEY must match window.PB_ADMIN_KEY in assets/config.js
create policy "pb_images_admin_insert"
on storage.objects for insert
to anon
with check (
  bucket_id = 'pb-images'
  and (current_setting('request.headers', true)::json ->> 'x-admin-key') = 'PB-ADMIN-2323'
);

create policy "pb_images_admin_update"
on storage.objects for update
to anon
using (
  bucket_id = 'pb-images'
  and (current_setting('request.headers', true)::json ->> 'x-admin-key') = 'PB-ADMIN-2323'
)
with check (
  bucket_id = 'pb-images'
  and (current_setting('request.headers', true)::json ->> 'x-admin-key') = 'PB-ADMIN-2323'
);

create policy "pb_images_admin_delete"
on storage.objects for delete
to anon
using (
  bucket_id = 'pb-images'
  and (current_setting('request.headers', true)::json ->> 'x-admin-key') = 'PB-ADMIN-2323'
);
