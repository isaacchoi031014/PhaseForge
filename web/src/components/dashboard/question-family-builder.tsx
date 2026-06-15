"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Layers, Sparkles } from "lucide-react";

type Topic = { id: string; name: string };
type Course = { id: string; title: string; topics: Topic[] };

const fieldCls =
  "font-body-cosmic w-full rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-4 py-3 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20";
const labelCls =
  "font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]";

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
  const [variants, setVariants] = useState(4);
  const [bands, setBands] = useState<Set<string>>(new Set(BANDS));
  const [queued, setQueued] = useState(false);

  const currentCourse = courses.find((c) => c.id === courseId);
  const topics = currentCourse?.topics ?? [];

  function changeCourse(id: string) {
    setCourseId(id);
    setSelected(new Set());
    setQueued(false);
  }
  function toggle(set: Set<string>, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
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
      <Section title="Course" desc="Pick the course to generate families for.">
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
        desc="Generate question families for these topics, using the course's materials."
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
              {topics.map((t) => {
                const on = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected((p) => toggle(p, t.id))}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      on
                        ? "border-white/30 bg-white text-[#16181a]"
                        : "border-[#444748]/40 text-[#c4c7c8] hover:border-white/20 hover:text-[#e3e2e3]"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
            <p className="font-label-cosmic mt-4 text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
              {selected.size} of {topics.length} selected
            </p>
          </>
        )}
      </Section>

      {/* Generation settings */}
      <Section
        title="Generation settings"
        desc="How many variants per family, and which difficulty bands to cover."
      >
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={`${labelCls} mb-0`}>Variants per family</label>
              <span className="font-display text-sm">{variants}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={variants}
              onChange={(e) => setVariants(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#343536] accent-white"
            />
          </div>
          <div>
            <label className={labelCls}>Difficulty bands</label>
            <div className="flex flex-wrap gap-2">
              {BANDS.map((b) => {
                const on = bands.has(b);
                return (
                  <button
                    key={b}
                    onClick={() => setBands((p) => toggle(p, b))}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      on
                        ? "border-white/30 bg-white text-[#16181a]"
                        : "border-[#444748]/40 text-[#c4c7c8] hover:border-white/20 hover:text-[#e3e2e3]"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
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
          placeholder="e.g. Favor applied scenarios; keep numbers clean; avoid proof-based items."
          className={`${fieldCls} resize-none`}
        />
      </Section>

      {/* Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={() => setQueued(true)}
          disabled={selected.size === 0 || bands.size === 0}
          className="active-glow flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          <Sparkles className="size-4" strokeWidth={2} />
          Generate families
        </button>
      </div>

      {/* Result / preview */}
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
          <Layers className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
        </div>
        {queued ? (
          <>
            <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
              Generation queued
            </p>
            <p className="mt-1 max-w-md text-sm text-[#c4c7c8]/60">
              {selected.size} topic{selected.size === 1 ? "" : "s"} ·{" "}
              {variants} variants · {[...bands].join(", ")}. Families will appear
              here once the Phase 2 backend is connected.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
              No families generated yet
            </p>
            <p className="mt-1 text-sm text-[#c4c7c8]/60">
              Pick topics and run generation to create reusable question
              families.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export type { Course };
