-- PhaseForge — serve APPROVED questions for a SPECIFIC open assessment to the kiosk.
--
-- Replaces the 0008 RPC, which had three problems:
--   1. it never checked review status, so DRAFT/REJECTED questions reached students;
--   2. it joined on course_id, returning EVERY question in the course rather than the
--      ones that belong to this assessment;
--   3. it defaulted to a single question (limit 1), so no full exam was served.
--
-- This version:
--   * scopes to q.assessment_id = p_assessment_id (this assessment only);
--   * requires q.professor_review_status = 'approved' (the review workflow now gates
--     what students see — approving a question is what makes it eligible);
--   * returns the full set (p_limit <= 0 = no limit);
--   * also returns figure_svg so questions with figures render in the exam.
--
-- The kiosk uses the anon key, so RLS blocks direct reads of the questions table; this
-- security-definer RPC is the only path, and it never exposes the answer key.
--
-- The return type changes (figure_svg added), so the old function is dropped first —
-- Postgres refuses to change an existing function's return columns in place.
-- Apply via Supabase SQL Editor (paste + Run).

drop function if exists public.exam_questions_for_assessment(uuid, int);

create function public.exam_questions_for_assessment(
  p_assessment_id uuid,
  p_limit int default 0  -- 0 (or negative) = serve every approved question
)
returns table (
  id uuid,
  type text,
  topic text,
  difficulty text,
  prompt text,
  options jsonb,
  figure_svg text
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
    q.options,
    q.figure_svg
  from public.questions q
  join public.assessments a on a.id = q.assessment_id
  where q.assessment_id = p_assessment_id
    and q.professor_review_status = 'approved'
    and a.status = 'open'
    and (a.window_open is null or now() >= a.window_open)
    and (a.window_close is null or now() <= a.window_close)
  order by q.created_at
  -- LIMIT NULL means "no limit" in Postgres, so p_limit <= 0 serves the whole set.
  limit case when p_limit > 0 then p_limit else null end;
$$;

grant execute on function public.exam_questions_for_assessment(uuid, int) to anon, authenticated;
