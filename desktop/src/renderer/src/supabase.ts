import { createClient } from '@supabase/supabase-js'

// Anonymous client for the kiosk — no student login. Access is limited to the
// public `validate_assessment_code` RPC; everything else is gated by RLS.
export const supabase = createClient(
  import.meta.env.RENDERER_VITE_SUPABASE_URL,
  import.meta.env.RENDERER_VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)

export type ValidatedAssessment = {
  id: string
  title: string
  course_title: string
  questions: number
  minutes: number
  topics: string[]
}

/** Returns the assessment for a valid, open code, or null if the code is wrong/closed. */
export async function validateCode(code: string): Promise<ValidatedAssessment | null> {
  const { data, error } = await supabase.rpc('validate_assessment_code', {
    p_code: code.trim()
  })
  if (error) throw error
  const row = (data as ValidatedAssessment[] | null)?.[0]
  return row ?? null
}

export type ExamQuestion = {
  id: string
  type: 'mcq' | 'short_answer' | 'essay'
  topic: string
  difficulty: string
  prompt: string
  options: string[]
  figure_svg?: string
}

/**
 * Approved questions (no answer key) for THIS assessment, in order.
 * `limit = 0` serves the whole approved set; pass a positive number to cap it.
 */
export async function fetchExamQuestions(assessmentId: string, limit = 0): Promise<ExamQuestion[]> {
  const { data, error } = await supabase.rpc('exam_questions_for_assessment', {
    p_assessment_id: assessmentId,
    p_limit: limit
  })
  if (error) throw error
  return (data as ExamQuestion[] | null) ?? []
}
