import { useEffect, useState } from 'react'
import { type Assessment, type Student } from '../mock'
import {
  finishAttempt,
  startOrResumeAttempt,
  submitAnswer,
  uploadWorkCapture,
  type ExamQuestion
} from '../supabase'
import { WorkCapture } from './WorkCapture'
import { useLockdown } from '../lockdown'

const PROCTOR_PIN = '0000' // mock — replace with a real proctor credential later

/** Seconds → "M:SS" for the exam countdown. */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function ExamScreen({
  assessment,
  student,
  onExit
}: {
  assessment: Assessment
  student: Student
  onExit: () => void
}): React.JSX.Element {
  const { focusLost, violations } = useLockdown()
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [index, setIndex] = useState(0)
  // Answers are kept per question id, so navigating between questions preserves them.
  const [answers, setAnswers] = useState<Record<string, string>>({})
  // Photo paths already saved from a prior session (kiosk resume) vs. one just captured now.
  const [savedWorkPaths, setSavedWorkPaths] = useState<Record<string, string>>({})
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [loadingQ, setLoadingQ] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showExit, setShowExit] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  // Placeholder until the attempt loads and replaces this with the server-anchored value.
  const [remaining, setRemaining] = useState(
    () => Math.max(1, Math.round(assessment.minutes) || 60) * 60
  )
  const [timedOut, setTimedOut] = useState(false)

  // Start (or resume) this student's personalized attempt. Resuming returns
  // the same questions and clock the student already started with — no
  // reshuffle, no reset — plus any answers already saved.
  useEffect(() => {
    let active = true
    startOrResumeAttempt(assessment.id, student.id)
      .then((attempt) => {
        if (!active) return
        if (!attempt) {
          setLoadError('This assessment is not open, or you are not on its roster.')
          return
        }
        setAttemptId(attempt.attemptId)
        setQuestions(attempt.questions)
        const ansMap: Record<string, string> = {}
        const pathMap: Record<string, string> = {}
        for (const a of attempt.answers) {
          ansMap[a.question_id] = a.answer_text
          if (a.work_capture_path) pathMap[a.question_id] = a.work_capture_path
        }
        setAnswers(ansMap)
        setSavedWorkPaths(pathMap)
        const expiresMs = new Date(attempt.expiresAt).getTime()
        const serverNowMs = new Date(attempt.serverNow).getTime()
        setRemaining(Math.max(0, Math.round((expiresMs - serverNowMs) / 1000)))
      })
      .catch(() => {
        if (active) setLoadError('Could not load the exam. Check the connection.')
      })
      .finally(() => {
        if (active) setLoadingQ(false)
      })
    return () => {
      active = false
    }
  }, [assessment.id, student.id])

  // Tick down once per second; on the final tick the exam auto-submits (ends).
  // State updates live inside the timeout callback (not the effect body) so we
  // don't set state synchronously during render.
  useEffect(() => {
    if (done || remaining <= 0) return
    const t = setTimeout(() => {
      if (remaining <= 1) {
        setRemaining(0)
        setTimedOut(true)
        setDone(true)
        if (attemptId) finishAttempt(attemptId).catch(() => {})
      } else {
        setRemaining(remaining - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [remaining, done, attemptId])

  function tryExit(): void {
    if (pin === PROCTOR_PIN) onExit()
    else setPinError(true)
  }

  const total = questions.length
  const question = questions[index] ?? null
  const answer = question ? (answers[question.id] ?? '') : ''
  const isMcq = question?.type === 'mcq' && question.options.length > 0
  const isLast = index >= total - 1
  const captured = Boolean(photoDataUrl) || Boolean(question && savedWorkPaths[question.id])

  function setAnswer(value: string): void {
    if (question) setAnswers((prev) => ({ ...prev, [question.id]: value }))
  }

  // Save the answer (and any freshly captured photo) for this question, then
  // advance — or finish the attempt on the last one. Work-capture resets per
  // question (WorkCapture is remounted via its `key`), so require it again.
  async function submitAndContinue(): Promise<void> {
    if (!question || !attemptId || submitting) return
    setSubmitting(true)
    try {
      let workCapturePath = savedWorkPaths[question.id]
      if (photoDataUrl) {
        workCapturePath = await uploadWorkCapture(attemptId, question.id, photoDataUrl)
      }
      await submitAnswer(attemptId, question.id, answer, workCapturePath)
      if (isLast) {
        await finishAttempt(attemptId)
        setDone(true)
      } else {
        setIndex((i) => i + 1)
        setPhotoDataUrl(null)
      }
    } catch {
      setLoadError('Could not save your answer. Check the connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Exam complete — a real grading pass is a separate piece of work.
  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#060607] text-center text-[#e3e2e3]">
        <div className="glass-panel max-w-md rounded-2xl p-10">
          <h1 className="text-2xl font-semibold">
            {timedOut ? "Time's up" : "You've reached the end"}
          </h1>
          <p className="mt-3 text-sm text-[#c4c7c8]">
            {timedOut
              ? 'Your time limit was reached and the exam ended.'
              : `You answered all ${total} question${total === 1 ? '' : 's'}.`}{' '}
            Notify your proctor to end the session.
          </p>
          <button
            onClick={() => {
              setShowExit(true)
              setPin('')
              setPinError(false)
            }}
            className="mt-7 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90"
          >
            End session (proctor)
          </button>
        </div>
        {showExit && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-sm rounded-2xl p-7">
              <h2 className="text-lg font-semibold">Proctor exit</h2>
              <p className="mt-1 text-sm text-[#c4c7c8]">
                Enter the proctor PIN to end this session.
              </p>
              <input
                autoFocus
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setPinError(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && tryExit()}
                placeholder="••••"
                className="mt-5 w-full select-text rounded-xl border border-white/10 bg-[#1b1c1d] px-4 py-3 text-center text-xl tracking-[0.4em] outline-none transition focus:border-white/40"
              />
              {pinError && <p className="mt-2 text-xs text-red-400">Incorrect PIN.</p>}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowExit(false)}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-[#c4c7c8] transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={tryExit}
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90"
                >
                  Unlock & exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const progressPct = total > 0 ? ((index + 1) / total) * 100 : 0
  const lowTime = remaining <= 60 // last minute → red timer

  return (
    <div className="relative flex h-full flex-col bg-[#060607] text-[#e3e2e3]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/5 px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1b1c1d] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[#c4c7c8]">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Locked
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{assessment.course}</div>
            <div className="text-[11px] uppercase tracking-widest text-[#c4c7c8]/60">
              {question ? `${question.topic} · ${question.difficulty}` : assessment.title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm text-[#c4c7c8]">
            Question{' '}
            <span className="font-semibold text-[#e3e2e3]">{total > 0 ? index + 1 : 0}</span> of{' '}
            {total}
          </span>
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 ${
              lowTime ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-[#1b1c1d]'
            }`}
          >
            <span
              className={`size-1.5 animate-pulse rounded-full ${
                lowTime ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            />
            <span className={`font-mono text-sm tabular-nums ${lowTime ? 'text-red-300' : ''}`}>
              {formatClock(remaining)}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-[#c4c7c8]/50">
            {student.name}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="h-0.5 w-full bg-white/5">
        <div className="h-full bg-white/80 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Focus-loss notice */}
      {violations > 0 && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-8 py-2 text-xs text-amber-300">
          <span>⚠</span>
          You left the exam window {violations} time{violations === 1 ? '' : 's'}. This is logged
          for the proctor.
        </div>
      )}

      {/* Body */}
      <main className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-6 overflow-y-auto">
          <div className="glass-panel rounded-2xl p-7">
            <div className="mb-4 text-[11px] uppercase tracking-widest text-[#c4c7c8]/50">
              Problem {total > 0 ? index + 1 : ''}
            </div>
            {loadingQ ? (
              <p className="text-sm text-[#c4c7c8]/60">Loading questions…</p>
            ) : loadError ? (
              <p className="text-sm text-red-400">{loadError}</p>
            ) : !question ? (
              <p className="text-sm text-[#c4c7c8]/60">
                No approved questions are available for this exam yet. Ask your instructor to
                approve questions in the pool.
              </p>
            ) : (
              <>
                <p className="text-lg leading-relaxed">{question.prompt}</p>
                {question.figure_svg && question.figure_svg.includes('<svg') && (
                  <div className="mt-4 flex justify-center rounded-lg bg-white p-3">
                    <img
                      src={`data:image/svg+xml;utf8,${encodeURIComponent(question.figure_svg)}`}
                      alt="Question figure"
                      className="max-h-80 w-auto"
                    />
                  </div>
                )}
                {isMcq && (
                  <ul className="mt-5 flex flex-col gap-2">
                    {question.options.map((opt, i) => {
                      const chosen = answer === opt
                      return (
                        <li key={i}>
                          <button
                            onClick={() => setAnswer(opt)}
                            className={`w-full select-text rounded-xl border px-4 py-3 text-left text-sm transition ${
                              chosen
                                ? 'border-white/40 bg-white text-[#16181a]'
                                : 'border-white/10 bg-[#1b1c1d] text-[#e3e2e3] hover:border-white/30'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
          {question && !isMcq && (
            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-widest text-[#c4c7c8]/60">
                Your final answer
              </label>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer"
                className="w-full select-text rounded-xl border border-white/10 bg-[#1b1c1d] px-5 py-4 text-lg outline-none transition focus:border-white/40"
              />
              <p className="mt-2 text-xs text-[#c4c7c8]/50">
                Enter your final answer. Submit your handwritten work on the right.
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col">
          <div className="glass-panel flex flex-1 flex-col rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Your work</h2>
              <span className="text-[11px] uppercase tracking-widest text-[#c4c7c8]/50">
                Document camera
              </span>
            </div>
            {/* Remount per question so captured work doesn't carry over. */}
            <WorkCapture key={question?.id ?? 'none'} onChange={setPhotoDataUrl} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-white/5 px-8 py-4">
        <button
          onClick={() => {
            setShowExit(true)
            setPin('')
            setPinError(false)
          }}
          className="text-[11px] uppercase tracking-widest text-[#c4c7c8]/40 transition hover:text-[#c4c7c8]"
        >
          End session (proctor)
        </button>
        <button
          onClick={submitAndContinue}
          disabled={!question || !answer || !captured || submitting}
          className="rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Saving…' : isLast ? 'Submit & finish' : 'Submit & continue'}
        </button>
      </footer>

      {/* Focus-lost overlay */}
      {focusLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-semibold">Return to the exam window</p>
            <p className="mt-1 text-sm text-[#c4c7c8]">Leaving the exam is recorded.</p>
          </div>
        </div>
      )}

      {/* Proctor exit modal */}
      {showExit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-2xl p-7">
            <h2 className="text-lg font-semibold">Proctor exit</h2>
            <p className="mt-1 text-sm text-[#c4c7c8]">
              Enter the proctor PIN to unlock and end this session.
            </p>
            <input
              autoFocus
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setPinError(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && tryExit()}
              placeholder="••••"
              className="mt-5 w-full select-text rounded-xl border border-white/10 bg-[#1b1c1d] px-4 py-3 text-center text-xl tracking-[0.4em] outline-none transition focus:border-white/40"
            />
            {pinError && <p className="mt-2 text-xs text-red-400">Incorrect PIN.</p>}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowExit(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-[#c4c7c8] transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={tryExit}
                className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90"
              >
                Unlock & exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
