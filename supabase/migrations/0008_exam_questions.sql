-- PhaseForge — serve generated questions to the desktop exam client.
-- The kiosk is anonymous (anon key), so RLS blocks it from reading the
-- questions table directly. This security-definer RPC returns the questions
-- for an OPEN assessment's course, WITHOUT the answer key (no cheating).
-- Apply via Supabase SQL Editor (paste + Run).

create or replace function public.exam_questions_for_assessment(
  p_assessment_id uuid,
  p_limit int default 1
)
returns table (
  id uuid,
  type text,
  topic text,
  difficulty text,
  prompt text,
  options jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    q.id,
    q.type,
    q.topic,
    q.difficulty,
    q.prompt,
    q.options
  from public.questions q
  join public.assessments a on a.course_id = q.course_id
  where a.id = p_assessment_id
    and a.status = 'open'
    and (a.window_open is null or now() >= a.window_open)
    and (a.window_close is null or now() <= a.window_close)
  order by q.created_at
  limit greatest(p_limit, 1);
$$;

grant execute on function public.exam_questions_for_assessment(uuid, int) to anon, authenticated;
