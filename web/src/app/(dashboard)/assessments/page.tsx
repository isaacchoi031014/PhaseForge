import Link from "next/link";
import { Clock, Plus, Users } from "lucide-react";

// NOTE: hardcoded preview data — assessments need the Phase 3 backend
// (assessment builder + delivery) before this becomes real.
const TABS = ["All", "Live", "Scheduled", "Drafts", "Completed"];

const assessments = [
  {
    code: "PHYS-201",
    title: "Midterm: Thermodynamics",
    status: "Live",
    statusStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    window: "Closes in 24m",
    students: "142 active",
    topics: 6,
  },
  {
    code: "CS-105",
    title: "Quiz: Data Structures",
    status: "Scheduled",
    statusStyle: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    window: "Opens Apr 18, 9:00 AM",
    students: "89 enrolled",
    topics: 4,
  },
  {
    code: "MATSCI-301",
    title: "Diffusion & Phase Diagrams",
    status: "Draft",
    statusStyle: "bg-[#343536] text-[#c4c7c8] border-[#444748]/30",
    window: "Not scheduled",
    students: "—",
    topics: 3,
  },
  {
    code: "PHYS-201",
    title: "Linear Algebra Quiz #2",
    status: "Completed",
    statusStyle: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    window: "Closed Apr 2",
    students: "138 submitted",
    topics: 5,
  },
];

export default function AssessmentsPage() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] leading-tight tracking-tight">
            Assessments
          </h1>
          <p className="mt-2 text-[#c4c7c8]">
            Build, schedule, and monitor adaptive assessments.
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

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#444748]/20 pb-3">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`font-label-cosmic rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-wider transition ${
              i === 0
                ? "bg-[#292a2b] text-[#e3e2e3]"
                : "text-[#c4c7c8]/70 hover:text-[#e3e2e3]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Assessment cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {assessments.map((a) => (
          <div
            key={a.title}
            className="glass-panel group rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-white/20"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="font-label-cosmic rounded-full border border-[#444748]/20 bg-[#343536] px-3 py-1 text-[10px] uppercase tracking-widest">
                {a.code}
              </span>
              <span
                className={`font-label-cosmic rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${a.statusStyle}`}
              >
                {a.status}
              </span>
            </div>
            <h3 className="font-display text-xl">{a.title}</h3>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#444748]/10 pt-5 text-sm text-[#c4c7c8]">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" strokeWidth={1.5} />
                {a.window}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" strokeWidth={1.5} />
                {a.students}
              </span>
              <span className="font-label-cosmic text-[11px] uppercase tracking-wider text-[#c4c7c8]/60">
                {a.topics} topics
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="font-label-cosmic mt-4 text-[10px] uppercase tracking-wider text-[#c4c7c8]/40">
        Preview · sample data — assessment engine arrives in a later phase
      </p>
    </div>
  );
}
