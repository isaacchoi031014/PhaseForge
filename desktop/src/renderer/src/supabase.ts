import { createClient } from '@supabase/supabase-js'

// Anonymous client for the kiosk — no student login. Access is limited to
// public RPCs and the exam-work storage bucket; everything else is gated by
// RLS.
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

export type RosterMatch = {
  id: string
  name: string
  studentNumber: string
}

/**
 * Roster search, scoped to the course behind this assessment. The kiosk never
 * sees a full roster: the RPC requires a 3+ character query and only matches
 * the student number on an exact value, and the number it returns is masked
 * to its last 4 digits — the TA does the physical ID check.
 */
export async function matchRosterStudents(
  assessmentId: string,
  query: string
): Promise<RosterMatch[]> {
  const { data, error } = await supabase.rpc('match_roster_students', {
    p_assessment_id: assessmentId,
    p_query: query
  })
  if (error) throw error
  return ((data as { id: string; name: string; masked_student_number: string }[] | null) ?? []).map(
    (r) => ({ id: r.id, name: r.name, studentNumber: r.masked_student_number })
  )
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

export type ExamAnswer = {
  question_id: string
  answer_text: string
  work_capture_path: string | null
}

export type ExamAttempt = {
  attemptId: string
  startedAt: string
  expiresAt: string
  serverNow: string
  questions: ExamQuestion[]
  answers: ExamAnswer[]
}

/**
 * Starts this student's personalized attempt, or returns their existing one
 * unchanged if they already have one — a kiosk restart resumes rather than
 * reshuffling questions or resetting the clock. Returns null if the
 * assessment isn't open/in-window or the student isn't in its roster.
 */
export async function startOrResumeAttempt(
  assessmentId: string,
  studentId: string
): Promise<ExamAttempt | null> {
  const { data, error } = await supabase.rpc('start_or_resume_attempt', {
    p_assessment_id: assessmentId,
    p_student_id: studentId
  })
  if (error) throw error
  if (!data) return null
  const d = data as {
    attempt_id: string
    started_at: string
    expires_at: string
    server_now: string
    questions: ExamQuestion[]
    answers: ExamAnswer[]
  }
  return {
    attemptId: d.attempt_id,
    startedAt: d.started_at,
    expiresAt: d.expires_at,
    serverNow: d.server_now,
    questions: d.questions ?? [],
    answers: d.answers ?? []
  }
}

/** Upserts one answer. Returns false if the attempt is finished or the question isn't this student's. */
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerText: string,
  workCapturePath?: string | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc('submit_exam_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer_text: answerText,
    p_work_capture_path: workCapturePath ?? null
  })
  if (error) throw error
  return Boolean(data)
}

/** Marks the attempt submitted. Safe to call more than once. */
export async function finishAttempt(attemptId: string): Promise<void> {
  const { error } = await supabase.rpc('finish_attempt', { p_attempt_id: attemptId })
  if (error) throw error
}

/** Uploads a captured work photo and returns its storage path for `submitAnswer`. */
export async function uploadWorkCapture(
  attemptId: string,
  questionId: string,
  photoDataUrl: string
): Promise<string> {
  // `fetch()` on a data: URL counts as a network request under Electron's CSP
  // (connect-src doesn't allow data:), so decode the base64 payload directly
  // instead of routing it through fetch.
  const base64 = photoDataUrl.slice(photoDataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/jpeg' })
  const path = `${attemptId}/${questionId}.jpg`
  const { error } = await supabase.storage
    .from('exam-work')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  return path
}
