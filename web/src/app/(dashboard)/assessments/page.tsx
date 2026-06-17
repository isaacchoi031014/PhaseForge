import Link from "next/link";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type AssessmentRow = {
  id: string;
  title: string;
  code: string;
  status: string;
  window_open: string | null;
  window_close: string | null;
  course: { title: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#343536] text-[#c4c7c8] border-[#444748]/30",
  open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  closed: "bg-red-500/10 text-red-400 border-red-500/20",
};

function windowLabel(a: AssessmentRow): string {
  if (a.window_open || a.window_close) {
    const fmt = (s: string | null): string =>
      s
        ? new Date(s).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—";
    return `${fmt(a.window_open)} → ${fmt(a.window_close)}`;
  }
  return "Always open";
}

export default async function AssessmentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .select(
      "id, title, code, status, window_open, window_close, course:courses(title)",
    )
    .order("created_at", { ascending: false });

  const assessments = (data ?? []) as unknown as AssessmentRow[];

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] leading-tight tracking-tight">
            Assessments
          </h1>
          <p className="mt-2 text-[#c4c7c8]">
            Each assessment has a code students enter in the exam app.
          </p>
        </div>
        <Link
          href="/assessments/new"
          className="active-glow flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2} />
          New assessment
        </Link>
      </div>

      {assessments.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
            <ClipboardList
              className="size-6 text-[#c4c7c8]/60"
              strokeWidth={1.5}
            />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
            No assessments yet
          </p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            Create one — you&apos;ll get a code to share with students.
          </p>
          <Link
            href="/assessments/new"
            className="active-glow mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#16181a] transition hover:opacity-90"
          >
            New assessment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {assessments.map((a) => (
            <Link
              key={a.id}
              href={`/assessments/${a.id}`}
              className="glass-panel group rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="font-label-cosmic rounded-full border border-[#444748]/20 bg-[#343536] px-3 py-1 text-[10px] uppercase tracking-widest">
                  {a.course?.title ?? "—"}
                </span>
                <span
                  className={`font-label-cosmic rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                    STATUS_STYLES[a.status] ?? STATUS_STYLES.draft
                  }`}
                >
                  {a.status}
                </span>
              </div>
              <h3 className="font-display text-xl">{a.title}</h3>
              <div className="mt-4 flex items-center justify-between border-t border-[#444748]/10 pt-4">
                <span className="font-display text-lg tracking-[0.15em]">
                  {a.code}
                </span>
                <ArrowRight
                  className="size-4 text-[#c4c7c8]/40 transition-all group-hover:translate-x-1 group-hover:text-[#e3e2e3]"
                  strokeWidth={1.5}
                />
              </div>
              <p className="font-label-cosmic mt-2 text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
                {windowLabel(a)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
