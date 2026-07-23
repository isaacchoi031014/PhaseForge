import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";

import { deleteAssessment } from "@/app/(dashboard)/assessments/actions";
import { CopyButton } from "@/components/dashboard/copy-button";
import { PoolSummary } from "@/components/dashboard/pool-summary";
import { type PoolQuestion } from "@/components/dashboard/question-review-card";
import { createClient } from "@/lib/supabase/server";

type Assessment = {
  id: string;
  title: string;
  code: string;
  status: string;
  window_open: string | null;
  window_close: string | null;
  config_json: {
    questions?: number;
    minutes?: number;
    topics?: string[];
    difficulty?: { easy: number; medium: number; hard: number };
    instructions?: string;
  } | null;
  course: { title: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#343536] text-[#c4c7c8] border-[#444748]/30",
  open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  closed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ATTEMPT_STATUS_STYLES: Record<string, string> = {
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  submitted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

type Attempt = {
  id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  student: { name: string; student_number: string } | null;
};
type AttemptQuestionRow = {
  attempt_id: string;
  question_id: string;
  position: number;
  topic: string;
  prompt_snapshot: string;
};
type AnswerRow = {
  attempt_id: string;
  question_id: string;
  answer_text: string;
  work_capture_path: string | null;
};

function fmt(s: string | null): string {
  return s
    ? new Date(s).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .select(
      "id, title, code, status, window_open, window_close, config_json, course:courses(title)",
    )
    .eq("id", id)
    .maybeSingle();

  const a = data as Assessment | null;
  if (!a) notFound();

  const { data: questionData } = await supabase
    .from("questions")
    .select(
      "id, type, topic, difficulty, prompt, options, answer, explanation, rubric, professor_review_status",
    )
    .eq("assessment_id", id)
    .order("topic", { ascending: true })
    .order("created_at", { ascending: true });

  const questions = (questionData ?? []) as PoolQuestion[];
  const poolCount = questions.length;
  const approvedCount = questions.filter(
    (q) => q.professor_review_status === "approved",
  ).length;

  const { data: attemptData } = await supabase
    .from("exam_attempts")
    .select("id, status, started_at, submitted_at, student:students(name, student_number)")
    .eq("assessment_id", id)
    .order("started_at", { ascending: false });
  const attempts = (attemptData ?? []) as unknown as Attempt[];
  const attemptIds = attempts.map((x) => x.id);

  const questionsByAttempt: Record<string, AttemptQuestionRow[]> = {};
  const answersByAttempt: Record<string, Record<string, AnswerRow>> = {};
  const signedPhotoUrls: Record<string, string> = {};

  if (attemptIds.length > 0) {
    const [{ data: aqData }, { data: ansData }] = await Promise.all([
      supabase
        .from("exam_attempt_questions")
        .select("attempt_id, question_id, position, topic, prompt_snapshot")
        .in("attempt_id", attemptIds)
        .order("position", { ascending: true }),
      supabase
        .from("exam_answers")
        .select("attempt_id, question_id, answer_text, work_capture_path")
        .in("attempt_id", attemptIds),
    ]);

    for (const row of (aqData ?? []) as AttemptQuestionRow[]) {
      (questionsByAttempt[row.attempt_id] ??= []).push(row);
    }
    for (const row of (ansData ?? []) as AnswerRow[]) {
      (answersByAttempt[row.attempt_id] ??= {})[row.question_id] = row;
    }

    const photoPaths = ((ansData ?? []) as AnswerRow[])
      .map((r) => r.work_capture_path)
      .filter((p): p is string => Boolean(p));
    if (photoPaths.length > 0) {
      const { data: signedData } = await supabase.storage
        .from("exam-work")
        .createSignedUrls(photoPaths, 3600);
      for (const s of signedData ?? []) {
        if (s.signedUrl && s.path) signedPhotoUrls[s.path] = s.signedUrl;
      }
    }
  }

  const cfg = a.config_json ?? {};
  // Show the topics that actually have questions in this pool, not just the ones
  // picked at creation — topics added later via "Add questions to this pool" should
  // appear here too. Union the originally-selected topics (so a just-created
  // assessment with no questions yet still lists them) with the pool's distinct topics.
  const topics = [
    ...new Set([
      ...(cfg.topics ?? []),
      ...questions.map((q) => q.topic).filter(Boolean),
    ]),
  ].sort((x, y) => x.localeCompare(y));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/assessments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[#c4c7c8] transition hover:text-[#e3e2e3]"
      >
        <ChevronLeft className="size-4" strokeWidth={1.5} />
        Assessments
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[32px] leading-tight tracking-tight">
              {a.title}
            </h1>
            <span
              className={`font-label-cosmic rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                STATUS_STYLES[a.status] ?? STATUS_STYLES.draft
              }`}
            >
              {a.status}
            </span>
          </div>
          <p className="mt-1 text-[#c4c7c8]">{a.course?.title ?? "—"}</p>
        </div>
      </div>

      {/* Code */}
      <div className="glass-panel mb-5 flex items-center justify-between rounded-2xl p-6">
        <div>
          <div className="font-label-cosmic mb-2 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
            Access code · share with students
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl tracking-[0.18em]">
              {a.code}
            </span>
            <CopyButton value={a.code} />
          </div>
        </div>
      </div>

      <div className="glass-panel mb-5 rounded-2xl p-6">
        <div className="font-label-cosmic mb-3 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
          Window
        </div>
        <p className="text-sm text-[#e3e2e3]">
          {a.window_open || a.window_close
            ? `${fmt(a.window_open)} → ${fmt(a.window_close)}`
            : "Always open"}
        </p>
      </div>

      <div className="glass-panel mb-5 rounded-2xl p-6">
        <div className="font-label-cosmic mb-3 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
          Topics ({topics.length})
        </div>
        {topics.length === 0 ? (
          <p className="text-sm text-[#c4c7c8]/60">No topics selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#444748]/40 px-3 py-1 text-sm text-[#c4c7c8]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {cfg.instructions && (
        <div className="glass-panel mb-5 rounded-2xl p-6">
          <div className="font-label-cosmic mb-3 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
            Custom instructions
          </div>
          <p className="text-sm leading-relaxed text-[#c4c7c8]">
            {cfg.instructions}
          </p>
        </div>
      )}

      {/* Pool lives in Question Pools now */}
      <div className="glass-panel mb-5 flex items-center justify-between rounded-2xl p-6">
        <div>
          <div className="font-label-cosmic mb-1 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
            Question pool
          </div>
          <PoolSummary
            assessmentId={a.id}
            initialCount={poolCount}
            initialApproved={approvedCount}
          />
        </div>
        <Link
          href="/question-pools"
          className="rounded-xl border border-[#444748]/40 px-4 py-2 text-sm text-[#e3e2e3] transition hover:bg-[#1b1c1d]"
        >
          Review in Question Pools
        </Link>
      </div>

      {/* Submissions */}
      <div className="mt-12 mb-4 flex items-baseline gap-2">
        <h2 className="font-display text-2xl">Submissions</h2>
        <span className="font-label-cosmic text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
          {attempts.length} student{attempts.length === 1 ? "" : "s"}
        </span>
      </div>
      {attempts.length === 0 ? (
        <div className="glass-panel mb-5 flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
          <p className="text-sm font-semibold text-[#e3e2e3]">No submissions yet</p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            Attempts appear here once a student starts on the kiosk.
          </p>
        </div>
      ) : (
        <div className="mb-5 flex flex-col gap-3">
          {attempts.map((att) => {
            const attQuestions = questionsByAttempt[att.id] ?? [];
            const attAnswers = answersByAttempt[att.id] ?? {};
            return (
              <div key={att.id} className="glass-panel rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {att.student?.name ?? "Unknown student"}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-[#c4c7c8]/60">
                      {att.student?.student_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span
                      className={`font-label-cosmic rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                        ATTEMPT_STATUS_STYLES[att.status] ?? ATTEMPT_STATUS_STYLES.in_progress
                      }`}
                    >
                      {att.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-[#c4c7c8]/60">
                      {fmt(att.started_at)} → {fmt(att.submitted_at)}
                    </span>
                  </div>
                </div>

                {attQuestions.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[#444748]/30 pt-4">
                    {attQuestions.map((q) => {
                      const ans = attAnswers[q.question_id];
                      const photoUrl = ans?.work_capture_path
                        ? signedPhotoUrls[ans.work_capture_path]
                        : null;
                      return (
                        <div key={q.question_id} className="text-sm">
                          <div className="font-label-cosmic text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
                            {q.topic}
                          </div>
                          <p className="mt-1 text-[#c4c7c8]">{q.prompt_snapshot}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <p className="text-[#e3e2e3]">
                              {ans?.answer_text ? ans.answer_text : (
                                <span className="text-[#c4c7c8]/50">No answer yet</span>
                              )}
                            </p>
                            {photoUrl && (
                              <a
                                href={photoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[#c4c7c8] underline underline-offset-2 hover:text-[#e3e2e3]"
                              >
                                View photo
                              </a>
                            )}
                            <span className="font-label-cosmic rounded-full border border-[#444748]/30 bg-[#343536] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#c4c7c8]/60">
                              {ans ? "Pending grading" : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form action={deleteAssessment} className="flex justify-end pt-2">
        <input type="hidden" name="id" value={a.id} />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 className="size-4" strokeWidth={1.5} />
          Delete assessment
        </button>
      </form>
    </div>
  );
}
