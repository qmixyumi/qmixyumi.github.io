-- Additional migration: run this entire file in Supabase SQL Editor.
-- Requires setup.sql to have been completed. No emails or keys need editing.
-- Does not delete or overwrite existing files. Re-running is safe.
begin;
insert into storage.buckets (id,name,public,file_size_limit)
values ('adventure-attachments','adventure-attachments',false,20971520)
on conflict (id) do update set public=false,file_size_limit=20971520;
-- Private bucket: only the existing adventure_members whitelist can read/upload.
-- No UPDATE or DELETE permission: content-addressed original files are immutable.
do $$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='adventure_attachments_read') then
  create policy adventure_attachments_read on storage.objects for select to authenticated
  using (bucket_id='adventure-attachments' and public.is_adventure_member());
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='adventure_attachments_upload') then
  create policy adventure_attachments_upload on storage.objects for insert to authenticated
  with check (bucket_id='adventure-attachments' and public.is_adventure_member() and name ~ '^attachments/[a-f0-9]{64}$');
 end if;
end $$;
commit;
