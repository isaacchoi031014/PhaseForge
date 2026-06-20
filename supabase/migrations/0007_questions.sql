-- PhaseForge — generated questions (Seam: generation output).
-- Claude turns course material chunks into original exam questions with answer
-- keys. Each row is one question; an optional assessment_id ties it to a draft.
-- Apply via Supabase SQL Editor (paste + Run).

create table if not exists public.questions (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  assessment_id    uuid references public.assessments (id) on delete set null,
  type             text not null check (type in ('mcq', 'short_answer', 'essay')),
  difficulty       text not null default 'medium',
  topic            text not null default '',
  prompt           text not null,           -- the question stem shown to students
  options          jsonb not null default '[]'::jsonb,  -- mcq choices; [] for written
  answer           text not null,           -- correct option / model answer
  explanation      text not null default '',-- answer-key rationale
  rubric           jsonb not null default '[]'::jsonb,  -- grading criteria; [] for mcq
  source_chunk_ids uuid[] not null default '{}', -- provenance into material_chunks
  created_at       timestamptz not null default now()
);
create index if not exists questions_course_id_idx on public.questions (course_id);
create index if not exists questions_assessment_id_idx on public.questions (assessment_id);

alter table public.questions enable row level security;

-- Instructor owns questions via the course (same shape as materials/assessments).
drop policy if exists "own questions" on public.questions;
create policy "own questions"
  on public.questions for all
  using (exists (
    select 1 from public.courses c
    where c.id = questions.course_id and c.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.courses c
    where c.id = questions.course_id and c.professor_id = auth.uid()
  ));
