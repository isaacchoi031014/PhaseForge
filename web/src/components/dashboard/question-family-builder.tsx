"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Layers, Loader2, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Topic = { id: string; name: string };
type Course = { id: string; title: string; topics: Topic[] };

type QuestionType = "mcq" | "short_answer" | "essay";
type GeneratedQuestion = {
  id: string;
  type: QuestionType;
  topic: string;
  difficulty: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  rubric: string[];
};

// Adaptive exam → only auto-gradable types in the pool. Instructor doesn't pick
// type or a single difficulty; the pool spans bands and the exam engine picks.
const POOL_TYPES: QuestionType[] = ["mcq", "short_answer"];
const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  short_answer: "Short answer",
  essay: "Essay",
};

const fieldCls =
  "font-body-cosmic w-full rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-4 py-3 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20";
const labelCls =
  "font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]";
const chipCls = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm transition ${
    on
      ? "border-white/30 bg-white text-[#16181a]"
      : "border-[#444748]/40 text-[#c4c7c8] hover:border-white/20 hover:text-[#e3e2e3]"
  }`;

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="font-display text-lg">{title}</h2>
      <p className="mt-1 mb-5 text-sm text-[#c4c7c8]/70">{desc}</p>
      {children}
    </div>
  );
}

const BANDS = ["Easy", "Medium", "Hard"];

export function QuestionFamilyBuilder({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(12);
  const [bands, setBands] = useState<Set<string>>(new Set(BANDS));
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedQuestion[] | null>(null);

  const currentCourse = courses.find((c) => c.id === courseId);
  const topics = currentCourse?.topics ?? [];

  function changeCourse(id: string) {
    setCourseId(id);
    setSelected(new Set());
    setResults(null);
    setError(null);
  }
  function toggle<T>(set: Set<T>, id: T) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setResults(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError("Your session expired — please log in again.");
      setBusy(false);
      return;
    }

    // The API takes topic strings (used as retrieval queries), so map ids → names.
    const topicNames = topics
      .filter((t) => selected.has(t.id))
      .map((t) => t.name);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          course_id: courseId,
          num_questions: count,
          types: POOL_TYPES,
          difficulties: [...bands],
          topics: topicNames,
          instructions: instructions.trim() || null,
        }),
      });

      if (!res.ok) {
        const detail = await res
          .json()
          .then((b) => b?.detail as string)
          .catch(() => null);
        throw new Error(detail || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      setResults(data.questions ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Generation failed — is the API running?",
      );
    } finally {
      setBusy(false);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
          <BookOpen className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
          No courses yet
        </p>
        <p className="mt-1 text-sm text-[#c4c7c8]/60">
          Create a course, add topics, and upload materials first.
        </p>
        <Link
          href="/courses"
          className="active-glow mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#16181a] transition hover:opacity-90"
        >
          Go to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Course */}
      <Section title="Course" desc="Pick the course to build a question pool for.">
        <select
          value={courseId}
          onChange={(e) => changeCourse(e.target.value)}
          className={fieldCls}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#1b1c1d]">
              {c.title}
            </option>
          ))}
        </select>
      </Section>

      {/* Topics */}
      <Section
        title="Topics"
        desc="Build the pool from these topics, using the course's materials. Leave empty to draw from the whole course."
      >
        {topics.length === 0 ? (
          <p className="text-sm text-[#c4c7c8]/60">
            This course has no topics yet.{" "}
            <Link
              href={`/courses/${courseId}`}
              className="text-[#e3e2e3] underline-offset-4 hover:underline"
            >
              Add topics
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected((p) => toggle(p, t.id))}
                  className={chipCls(selected.has(t.id))}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="font-label-cosmic mt-4 text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
              {selected.size} of {topics.length} selected
            </p>
          </>
        )}
      </Section>

      {/* Pool settings */}
      <Section
        title="Pool settings"
        desc="How many questions to generate, and which difficulty bands to stock the pool with. The exam adapts difficulty per student at run time."
      >
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={`${labelCls} mb-0`}>Pool size</label>
              <span className="font-display text-sm">{count} questions</span>
            </div>
            <input
              type="range"
              min={3}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#343536] accent-white"
            />
          </div>
          <div>
            <label className={labelCls}>Difficulty bands</label>
            <div className="flex flex-wrap gap-2">
              {BANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBands((p) => toggle(p, b))}
                  className={chipCls(bands.has(b))}
                >
                  {b}
                </button>
              ))}
            </div>
            <p className="font-label-cosmic mt-3 text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
              Multiple choice &amp; short answer · auto-graded for adaptive scoring
            </p>
          </div>
        </div>
      </Section>

      {/* Custom instructions */}
      <Section
        title="Custom instructions"
        desc="Optional guidance for generation (style, emphasis, things to avoid)."
      >
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Favor applied scenarios; keep numbers clean; avoid proof-based items."
          className={`${fieldCls} resize-none`}
        />
      </Section>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleGenerate}
          disabled={busy || bands.size === 0}
          className="active-glow flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Sparkles className="size-4" strokeWidth={2} />
          )}
          {busy ? "Generating…" : "Generate pool"}
        </button>
      </div>

      {/* Result */}
      {results === null ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
            <Layers className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
            No questions generated yet
          </p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            Pick topics and run generation to build a question pool with answer
            keys.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="glass-panel rounded-2xl border-dashed py-10 text-center text-sm text-[#c4c7c8]/70">
          No questions were generated. Try different topics or upload more
          material first.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-label-cosmic text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
            {results.length} question{results.length === 1 ? "" : "s"} in pool ·
            saved to this course
          </p>
          {results.map((q, i) => (
            <QuestionCard key={q.id ?? i} q={q} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, index }: { q: GeneratedQuestion; index: number }) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-display text-sm text-[#e3e2e3]">Q{index}</span>
        <span className="rounded-full border border-[#444748]/40 px-2.5 py-0.5 text-[11px] text-[#c4c7c8]">
          {TYPE_LABEL[q.type] ?? q.type}
        </span>
        {q.difficulty && (
          <span className="rounded-full border border-[#444748]/40 px-2.5 py-0.5 text-[11px] text-[#c4c7c8]">
            {q.difficulty}
          </span>
        )}
        {q.topic && (
          <span className="rounded-full border border-[#444748]/40 px-2.5 py-0.5 text-[11px] text-[#c4c7c8]">
            {q.topic}
          </span>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm text-[#e3e2e3]">{q.prompt}</p>

      {q.options?.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {q.options.map((opt, i) => {
            const correct = opt === q.answer;
            return (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  correct
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-[#444748]/40 text-[#c4c7c8]"
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 rounded-lg border border-[#444748]/30 bg-[#1b1c1d] p-3">
        <p className="font-label-cosmic mb-1 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
          Answer key
        </p>
        <p className="whitespace-pre-wrap text-sm text-[#e3e2e3]">{q.answer}</p>
        {q.explanation && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-[#c4c7c8]/80">
            {q.explanation}
          </p>
        )}
        {q.rubric?.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-sm text-[#c4c7c8]/80">
            {q.rubric.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export type { Course };
