-- =====================================================================
-- 0002_storage.sql — Bucket privat pentru pozele comenzilor.
-- Fiecare utilizator are acces doar la folderul lui: <user_id>/<fișier>
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poze-comenzi', 'poze-comenzi', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

drop policy if exists "poze_select_own" on storage.objects;
create policy "poze_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'poze-comenzi' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "poze_insert_own" on storage.objects;
create policy "poze_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'poze-comenzi' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "poze_update_own" on storage.objects;
create policy "poze_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'poze-comenzi' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "poze_delete_own" on storage.objects;
create policy "poze_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'poze-comenzi' and (storage.foldername(name))[1] = (select auth.uid())::text);
