import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type MaterialRow = {
  id: string;
  filename: string;
  type: string;
  status: string;
  course: { title: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  syllabus: "Syllabus",
  lecture: "Lecture slides",
  notes: "Notes",
  past_exam: "Past exam",
};

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-[#343536] text-[#c4c7c8] border-[#444748]/30",
  processing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Professor";
  const lastName = name.split(" ").slice(-1)[0];

  const [
    { count: coursesCount },
    { count: topicsCount },
    { count: questionsCount },
    { data: materials },
  ] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("questions").select("id", { count: "exact", head: true }),
    supabase
      .from("materials")
      .select("id, filename, type, status, course:courses(title)")
      .order("created_at", { ascending: false }),
  ]);

  const materialList = (materials ?? []) as unknown as MaterialRow[];
  const nCourses = coursesCount ?? 0;
  const nTopics = topicsCount ?? 0;
  const nQuestions = questionsCount ?? 0;
  const nMaterials = materialList.length;

  const statusCounts: Record<string, number> = {
    uploaded: 0,
    processing: 0,
    done: 0,
    error: 0,
  };
  for (const m of materialList) {
    statusCounts[m.status] = (statusCounts[m.status] ?? 0) + 1;
  }

  // Setup checklist — derived from real workspace state.
  const steps = [
    {
      label: "Create a course",
      hint: "Your course workspace.",
      done: nCourses > 0,
      href: "/courses",
    },
    {
      label: "Upload course materials",
      hint: "Lecture slides, notes, syllabus, past exams.",
      done: nMaterials > 0,
      href: "/courses",
    },
    {
      label: "Review topics",
      hint: "Organize the course into topics.",
      done: nTopics > 0,
      href: "/courses",
    },
    {
      label: "Create an assessment",
      hint: "Pick topics — questions are generated from your materials.",
      done: false,
      href: "/assessments/new",
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  const readiness = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);

  const stats = [
    { label: "Active courses", value: nCourses, icon: BookOpen, sub: "Course workspace" },
    { label: "Uploaded materials", value: nMaterials, icon: FileText, sub: "Slides, notes, exams" },
    { label: "Topics", value: nTopics, icon: Layers, sub: "Review before generation" },
    { label: "Generated questions", value: nQuestions, icon: Sparkles, sub: "Generated from materials" },
  ];

  const processing = [
    { label: "Uploaded", value: statusCounts.uploaded, dot: "bg-[#c4c7c8]" },
    { label: "Processing", value: statusCounts.processing, dot: "bg-amber-400" },
    { label: "Ready", value: statusCounts.done, dot: "bg-emerald-400" },
    { label: "Needs attention", value: statusCounts.error, dot: "bg-red-400" },
  ];

  const recent = materialList.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Greeting */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] leading-tight tracking-tight">
            Welcome back, Professor {lastName}.
          </h1>
          <p className="mt-2 text-[#c4c7c8]">
            Set up materials, generate questions, and launch adaptive
            assessments.
          </p>
        </div>
        <Link
          href="/courses"
          className="active-glow flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          <FileText className="size-4" strokeWidth={2} />
          Upload materials
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel rounded-2xl p-5">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-[#444748]/40 bg-[#1b1c1d]">
              <s.icon className="size-[18px] text-[#c4c7c8]" strokeWidth={1.5} />
            </div>
            <div className="font-display text-3xl">{s.value}</div>
            <div className="font-label-cosmic mt-1 text-[10px] uppercase tracking-widest text-[#c4c7c8]/70">
              {s.label}
            </div>
            <div className="mt-1 text-xs text-[#c4c7c8]/50">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Row: Next steps | Assessment drafts | Processing + Readiness */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr_1fr]">
        {/* Next steps */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-xl">Next steps</h2>
          <p className="mt-1 text-sm text-[#c4c7c8]/70">
            Complete setup before launching your first assessment.
          </p>
          <ol className="mt-5 flex flex-col gap-1">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-[#1b1c1d]/60"
                >
                  <div
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                      s.done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-[#444748]/40 bg-[#1b1c1d] text-[#c4c7c8]"
                    }`}
                  >
                    {s.done ? (
                      <Check className="size-3.5" strokeWidth={2.5} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        s.done
                          ? "text-[#c4c7c8]/60 line-through"
                          : "text-[#e3e2e3]"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs text-[#c4c7c8]/50">{s.hint}</p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-[#c4c7c8]/20"
                    strokeWidth={1.5}
                  />
                </Link>
              </li>
            ))}
          </ol>
          {nextStep && (
            <Link
              href={nextStep.href}
              className="active-glow mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
            >
              Continue setup
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          )}
        </div>

        {/* Assessment drafts (Phase 3) */}
        <div className="glass-panel flex flex-col rounded-2xl p-6">
          <h2 className="font-display text-xl">Assessment drafts</h2>
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-[#e3e2e3]">
              No assessments yet
            </p>
            <p className="mt-1 text-sm text-[#c4c7c8]/60">
              Create your first AI-adaptive assessment once materials are ready.
            </p>
            <span className="mt-5 cursor-not-allowed rounded-xl border border-[#444748]/40 bg-[#1b1c1d] px-4 py-2 text-sm text-[#c4c7c8]/50">
              New assessment · soon
            </span>
          </div>
        </div>

        {/* Processing + Readiness */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-label-cosmic mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4c7c8]">
              Material processing
            </h2>
            <div className="flex flex-col gap-3">
              {processing.map((p) => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-[#c4c7c8]">
                    <span className={`size-2 rounded-full ${p.dot}`} />
                    {p.label}
                  </span>
                  <span className="font-display text-lg">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-label-cosmic text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4c7c8]">
              Course readiness
            </h2>
            <p className="mt-3 text-sm font-semibold">
              {completed} of {steps.length} setup steps complete
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#343536]">
              <div
                className="cosmic-fill h-full rounded-full bg-white"
                style={{ width: `${readiness}%` }}
              />
            </div>
            <p className="font-label-cosmic mt-4 text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
              Continue setup to enable generation
            </p>
          </div>
        </div>
      </div>

      {/* Row: Recent activity | Upcoming windows */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-xl">Recent activity</h2>
          {recent.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-[#e3e2e3]">
                No activity yet
              </p>
              <p className="mt-1 text-sm text-[#c4c7c8]/60">
                Uploads and processing updates will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {recent.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-[#444748]/20 bg-[#1b1c1d]/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className="size-4 text-[#c4c7c8]"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-sm font-medium">{m.filename}</p>
                      <p className="font-label-cosmic mt-0.5 text-[10px] uppercase tracking-wider text-[#c4c7c8]/60">
                        {m.course?.title ?? "—"} ·{" "}
                        {TYPE_LABELS[m.type] ?? m.type}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-label-cosmic rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                      STATUS_STYLES[m.status] ??
                      "bg-[#343536] text-[#c4c7c8] border-[#444748]/30"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel flex flex-col rounded-2xl p-6">
          <h2 className="font-display text-xl">Upcoming windows</h2>
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <CalendarClock className="size-6 text-[#c4c7c8]/50" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-semibold text-[#e3e2e3]">
              No scheduled assessments
            </p>
            <p className="mt-1 text-sm text-[#c4c7c8]/60">
              Scheduled exam windows will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
