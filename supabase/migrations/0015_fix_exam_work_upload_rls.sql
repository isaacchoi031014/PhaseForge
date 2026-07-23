-- PhaseForge — fixes the exam-work upload policies from 0014.
--
-- Bug: the insert/update policies' `exists(...)` check queried
-- `exam_attempts`/`exam_attempt_questions` directly. Those tables have RLS
-- enabled with only a professor-read policy — anon has no SELECT policy on
-- them at all — so from the anon role's perspective the tables are empty,
-- the exists(...) is always false, and every upload failed with "new row
-- violates row-level security policy". A storage policy runs as the calling
-- role (unlike the security-definer RPCs elsewhere in this schema), so it
-- has no way to see past that RLS.
--
-- Fix: move the check into a `security definer` helper function, which (like
-- the other RPCs) bypasses RLS on the tables it queries, and returns only a
-- boolean — no data is exposed to anon beyond the yes/no answer.
-- Apply via Supabase SQL Editor (paste + Run) after 0014_exam_work_storage.sql.

create or replace function public.exam_work_upload_allowed(name text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exam_attempts a
    join public.exam_attempt_questions q on q.attempt_id = a.id
    where a.id::text = (storage.foldername(name))[1]
      and a.status = 'in_progress'
      and q.question_id::text = regexp_replace(storage.filename(name), '\.jpg$', '')
  );
$$;

grant execute on function public.exam_work_upload_allowed(text) to anon, authenticated;

drop policy if exists "exam-work: assigned question insert" on storage.objects;
create policy "exam-work: assigned question insert"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'exam-work'
    and public.exam_work_upload_allowed(name)
  );

drop policy if exists "exam-work: assigned question update" on storage.objects;
create policy "exam-work: assigned question update"
  on storage.objects for update to anon
  using (
    bucket_id = 'exam-work'
    and public.exam_work_upload_allowed(name)
  )
  with check (
    bucket_id = 'exam-work'
    and public.exam_work_upload_allowed(name)
  );
