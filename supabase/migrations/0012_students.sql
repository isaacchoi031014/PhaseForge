-- PhaseForge — roster (enrolled students) per course, and the kiosk-facing
-- search RPC used to match a student against it.
--
-- The kiosk never sees a full roster dump: `match_roster_students` requires a
-- real assessment code's assessment_id, a query of at least 3 characters, and
-- only matches the student number on an EXACT value (not a partial/ilike) so
-- it can't be used to enumerate the roster by iterating numeric prefixes. The
-- returned student number is masked to its last 4 digits — the TA does the
-- physical ID check at the kiosk, so the screen never needs to show the full
-- number. Apply via Supabase SQL Editor (paste + Run).

create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  name           text not null,
  student_number text not null,
  created_at     timestamptz not null default now(),
  unique (course_id, student_number)
);
create index if not exists students_course_id_idx on public.students (course_id);

alter table public.students enable row level security;

drop policy if exists "own students" on public.students;
create policy "own students"
  on public.students for all
  using (exists (
    select 1 from public.courses c
    where c.id = students.course_id and c.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.courses c
    where c.id = students.course_id and c.professor_id = auth.uid()
  ));

create or replace function public.match_roster_students(
  p_assessment_id uuid,
  p_query text
)
returns table (
  id uuid,
  name text,
  masked_student_number text
)
language sql
security definer
set search_path = ''
as $$
  select
    s.id,
    s.name,
    '•••• ' || right(s.student_number, 4) as masked_student_number
  from public.students s
  join public.assessments a on a.course_id = s.course_id
  where a.id = p_assessment_id
    and a.status = 'open'
    and length(trim(p_query)) >= 3
    and (
      s.name ilike '%' || trim(p_query) || '%'
      or s.student_number = trim(p_query)
    )
  order by s.name
  limit 8;
$$;

grant execute on function public.match_roster_students(uuid, text) to anon, authenticated;
