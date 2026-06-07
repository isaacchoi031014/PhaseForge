-- PhaseForge — Phase 1 storage
-- Private bucket for uploaded course materials. Files are stored under
-- `{user_id}/{course_id}/{filename}`; RLS ties each object to its owner.
-- Apply via Supabase SQL Editor (paste + Run) after 0001_init.sql.

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

-- A professor can only touch objects whose top-level folder is their own user id.
create policy "materials: own insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "materials: own read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "materials: own delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
