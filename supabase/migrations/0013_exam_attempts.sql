-- PhaseForge — personalized, resumable exam attempts + answer/photo write-back.
--
-- Replaces the "every student gets the identical full approved set" behavior
-- of `exam_questions_for_assessment` (0011) with a per-student draw sized by
-- `assessments.config_json.perStudent` ([{ id: category_id, name, count }]).
--
-- Question content is SNAPSHOTTED into exam_attempt_questions at draw time so
-- a professor editing/re-approving questions after a student has started
-- can't change what that student sees mid-exam or on kiosk resume. The
-- answer key/rubric are never snapshotted or sent to the kiosk — they stay in
-- `questions`, joined by question_id only for (future) grading.
--
-- `exam_answer_grades` is a stub: schema only, nothing writes to it yet. A
-- later task wires up the actual AI grading call.
--
-- Apply via Supabase SQL Editor (paste + Run) after 0012_students.sql.

create table if not exists public.exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,
  started_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  status        text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  submitted_at  timestamptz,
  unique (assessment_id, student_id)
);
create index if not exists exam_attempts_assessment_id_idx on public.exam_attempts (assessment_id);

create table if not exists public.exam_attempt_questions (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.exam_attempts (id) on delete cascade,
  question_id      uuid not null references public.questions (id) on delete restrict,
  position         int not null,
  type             text not null,
  topic            text not null,
  difficulty       text not null,
  prompt_snapshot  text not null,
  options_snapshot jsonb not null default '[]'::jsonb,
  figure_snapshot  text,
  unique (attempt_id, question_id),
  unique (attempt_id, position)
);
create index if not exists exam_attempt_questions_attempt_id_idx on public.exam_attempt_questions (attempt_id);

create table if not exists public.exam_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.exam_attempts (id) on delete cascade,
  question_id        uuid not null references public.questions (id) on delete cascade,
  answer_text        text not null default '',
  work_capture_path  text,
  answered_at        timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index if not exists exam_answers_attempt_id_idx on public.exam_answers (attempt_id);

-- Grading stub — a later task creates rows and fills them in as AI grading runs.
create table if not exists public.exam_answer_grades (
  id             uuid primary key default gen_random_uuid(),
  answer_id      uuid not null unique references public.exam_answers (id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'grading', 'completed', 'failed', 'needs_review')),
  ai_score       numeric,
  max_score      numeric,
  ai_feedback    text,
  confidence     numeric,
  model          text,
  rubric_version text,
  graded_at      timestamptz,
  error_message  text,
  created_at     timestamptz not null default now()
);

-- Row-Level Security ---------------------------------------------------------
-- Professors get read-only visibility (via the same courses.professor_id
-- chain used everywhere else); anon never touches these tables directly —
-- every kiosk read/write goes through the security-definer RPCs below.
alter table public.exam_attempts         enable row level security;
alter table public.exam_attempt_questions enable row level security;
alter table public.exam_answers          enable row level security;
alter table public.exam_answer_grades    enable row level security;

drop policy if exists "own exam_attempts" on public.exam_attempts;
create policy "own exam_attempts"
  on public.exam_attempts for select
  using (exists (
    select 1 from public.assessments a
    join public.courses c on c.id = a.course_id
    where a.id = exam_attempts.assessment_id and c.professor_id = auth.uid()
  ));

drop policy if exists "own exam_attempt_questions" on public.exam_attempt_questions;
create policy "own exam_attempt_questions"
  on public.exam_attempt_questions for select
  using (exists (
    select 1 from public.exam_attempts at
    join public.assessments a on a.id = at.assessment_id
    join public.courses c on c.id = a.course_id
    where at.id = exam_attempt_questions.attempt_id and c.professor_id = auth.uid()
  ));

drop policy if exists "own exam_answers" on public.exam_answers;
create policy "own exam_answers"
  on public.exam_answers for select
  using (exists (
    select 1 from public.exam_attempts at
    join public.assessments a on a.id = at.assessment_id
    join public.courses c on c.id = a.course_id
    where at.id = exam_answers.attempt_id and c.professor_id = auth.uid()
  ));

drop policy if exists "own exam_answer_grades" on public.exam_answer_grades;
create policy "own exam_answer_grades"
  on public.exam_answer_grades for select
  using (exists (
    select 1 from public.exam_answers ans
    join public.exam_attempts at on at.id = ans.attempt_id
    join public.assessments a on a.id = at.assessment_id
    join public.courses c on c.id = a.course_id
    where ans.id = exam_answer_grades.answer_id and c.professor_id = auth.uid()
  ));

-- RPCs ------------------------------------------------------------------------

-- Starts a new personalized attempt, or returns the existing one unchanged if
-- the student already has one (kiosk restart/resume — no reshuffle, no
-- re-snapshot, no clock reset). Returns a single jsonb blob: attempt_id,
-- started_at, expires_at, server_now (for the desktop to compute its
-- countdown from the server/client clock OFFSET rather than trusting its own
-- clock), the ordered question snapshots, and any existing answers.
create or replace function public.start_or_resume_attempt(
  p_assessment_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id  uuid;
  v_minutes    int;
  v_per_student jsonb;
  v_attempt_id uuid;
  v_result     jsonb;
begin
  select a.course_id, coalesce((a.config_json ->> 'minutes')::int, 60), coalesce(a.config_json -> 'perStudent', '[]'::jsonb)
  into v_course_id, v_minutes, v_per_student
  from public.assessments a
  where a.id = p_assessment_id
    and a.status = 'open'
    and (a.window_open is null or now() >= a.window_open)
    and (a.window_close is null or now() <= a.window_close);

  if v_course_id is null then
    return null;
  end if;

  if not exists (select 1 from public.students s where s.id = p_student_id and s.course_id = v_course_id) then
    return null;
  end if;

  -- Race-safe create: a concurrent double-tap on the kiosk resolves to the
  -- same row via unique (assessment_id, student_id) instead of erroring.
  insert into public.exam_attempts (assessment_id, student_id, started_at, expires_at, status)
  values (p_assessment_id, p_student_id, now(), now() + (v_minutes || ' minutes')::interval, 'in_progress')
  on conflict (assessment_id, student_id) do nothing
  returning id into v_attempt_id;

  if v_attempt_id is not null then
    -- This call created the attempt — perform the personalized draw and
    -- snapshot each question's displayable content (never the answer key).
    insert into public.exam_attempt_questions
      (attempt_id, question_id, position, type, topic, difficulty, prompt_snapshot, options_snapshot, figure_snapshot)
    select
      v_attempt_id,
      x.id,
      row_number() over (order by random()),
      x.type,
      x.topic,
      x.difficulty,
      x.prompt,
      x.options,
      x.figure_svg
    from (
      select qq.*
      from jsonb_array_elements(v_per_student) as ps(entry)
      cross join lateral (
        select q.*
        from public.questions q
        where q.assessment_id = p_assessment_id
          and q.category_id = (ps.entry ->> 'id')::uuid
          and q.professor_review_status = 'approved'
        order by random()
        limit greatest((ps.entry ->> 'count')::int, 0)
      ) qq
    ) x;
  else
    select id into v_attempt_id
    from public.exam_attempts
    where assessment_id = p_assessment_id and student_id = p_student_id;
  end if;

  select jsonb_build_object(
    'attempt_id', at.id,
    'started_at', at.started_at,
    'expires_at', at.expires_at,
    'server_now', now(),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.question_id,
        'type', q.type,
        'topic', q.topic,
        'difficulty', q.difficulty,
        'prompt', q.prompt_snapshot,
        'options', q.options_snapshot,
        'figure_svg', q.figure_snapshot
      ) order by q.position)
      from public.exam_attempt_questions q
      where q.attempt_id = at.id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question_id', ans.question_id,
        'answer_text', ans.answer_text,
        'work_capture_path', ans.work_capture_path
      ))
      from public.exam_answers ans
      where ans.attempt_id = at.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.exam_attempts at
  where at.id = v_attempt_id;

  return v_result;
end;
$$;

grant execute on function public.start_or_resume_attempt(uuid, uuid) to anon, authenticated;

-- Upserts one answer. Requires the attempt to be in_progress AND the question
-- to actually be assigned to this attempt — without the second check a
-- client could write an answer for any question id in the database.
create or replace function public.submit_exam_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer_text text,
  p_work_capture_path text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.exam_attempts a
    where a.id = p_attempt_id and a.status = 'in_progress'
  ) then
    return false;
  end if;

  if not exists (
    select 1 from public.exam_attempt_questions q
    where q.attempt_id = p_attempt_id and q.question_id = p_question_id
  ) then
    return false;
  end if;

  insert into public.exam_answers (attempt_id, question_id, answer_text, work_capture_path, answered_at)
  values (p_attempt_id, p_question_id, p_answer_text, p_work_capture_path, now())
  on conflict (attempt_id, question_id) do update set
    answer_text = excluded.answer_text,
    work_capture_path = coalesce(excluded.work_capture_path, public.exam_answers.work_capture_path),
    answered_at = now();

  return true;
end;
$$;

grant execute on function public.submit_exam_answer(uuid, uuid, text, text) to anon, authenticated;

-- Idempotent: returns the attempt's current state unchanged if already
-- submitted, only transitions it when still in_progress.
create or replace function public.finish_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  update public.exam_attempts
  set status = 'submitted', submitted_at = now()
  where id = p_attempt_id and status = 'in_progress';

  select jsonb_build_object('attempt_id', id, 'status', status, 'submitted_at', submitted_at)
  into v_result
  from public.exam_attempts
  where id = p_attempt_id;

  return v_result;
end;
$$;

grant execute on function public.finish_attempt(uuid) to anon, authenticated;
