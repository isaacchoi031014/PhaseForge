-- PhaseForge — document-camera photo storage for exam answers.
--
-- Private bucket, size/type limits enforced natively by Storage. The upload
-- path is fixed as `{attempt_id}/{question_id}.jpg` (matches WorkCapture's
-- `toDataURL('image/jpeg', …)` output, so the extension is never ambiguous).
--
-- The insert/update policy checks THREE things together: the attempt named
-- in the path is in_progress, AND the question named in the path is actually
-- assigned to that attempt (via exam_attempt_questions) — knowing an
-- attempt_id alone is not enough to write into an arbitrary question's slot.
-- Apply via Supabase SQL Editor (paste + Run) after 0013_exam_attempts.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exam-work', 'exam-work', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "exam-work: assigned question insert" on storage.objects;
create policy "exam-work: assigned question insert"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'exam-work'
    and exists (
      select 1
      from public.exam_attempts a
      join public.exam_attempt_questions q on q.attempt_id = a.id
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'in_progress'
        and q.question_id::text = regexp_replace(storage.filename(name), '\.jpg$', '')
    )
  );

-- Retakes upload with `{ upsert: true }`, which requires update, not just insert.
drop policy if exists "exam-work: assigned question update" on storage.objects;
create policy "exam-work: assigned question update"
  on storage.objects for update to anon
  using (
    bucket_id = 'exam-work'
    and exists (
      select 1
      from public.exam_attempts a
      join public.exam_attempt_questions q on q.attempt_id = a.id
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'in_progress'
        and q.question_id::text = regexp_replace(storage.filename(name), '\.jpg$', '')
    )
  )
  with check (
    bucket_id = 'exam-work'
    and exists (
      select 1
      from public.exam_attempts a
      join public.exam_attempt_questions q on q.attempt_id = a.id
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'in_progress'
        and q.question_id::text = regexp_replace(storage.filename(name), '\.jpg$', '')
    )
  );

drop policy if exists "exam-work: professor read" on storage.objects;
create policy "exam-work: professor read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exam-work'
    and exists (
      select 1
      from public.exam_attempts a
      join public.assessments ass on ass.id = a.assessment_id
      join public.courses c on c.id = ass.course_id
      where a.id::text = (storage.foldername(name))[1]
        and c.professor_id = auth.uid()
    )
  );
