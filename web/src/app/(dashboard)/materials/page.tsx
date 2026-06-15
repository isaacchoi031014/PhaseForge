import Link from "next/link";
import { ExternalLink, FileText, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type MaterialRow = {
  id: string;
  filename: string;
  type: string;
  status: string;
  storage_path: string;
  course: { title: string } | null;
};

const TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Syllabus", value: "syllabus" },
  { label: "Lecture slides", value: "lecture" },
  { label: "Notes", value: "notes" },
  { label: "Past exams", value: "past_exam" },
];

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

export default async function SourceMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type = "all", q = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("materials")
    .select("id, filename, type, status, storage_path, course:courses(title)")
    .order("created_at", { ascending: false });
  if (type !== "all") query = query.eq("type", type);
  if (q) query = query.ilike("filename", `%${q}%`);

  const { data } = await query;
  const materials = (data ?? []) as unknown as MaterialRow[];

  // Signed URLs so the private files can be opened in a new tab.
  const rows = await Promise.all(
    materials.map(async (m) => {
      const { data: signed } = await supabase.storage
        .from("materials")
        .createSignedUrl(m.storage_path, 3600);
      return { ...m, url: signed?.signedUrl ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-8">
        <h1 className="font-display text-[32px] leading-tight tracking-tight">
          Source Materials
        </h1>
        <p className="mt-2 text-[#c4c7c8]">
          Every file uploaded across your courses. Click a row to open it.
        </p>
      </div>

      {/* Search + filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action="/materials" className="relative min-w-[240px] flex-1">
          {type !== "all" && <input type="hidden" name="type" value={type} />}
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#c4c7c8]/60" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by file name..."
            className="font-body-cosmic w-full rounded-full border border-[#444748]/40 bg-[#1b1c1d] py-2 pl-10 pr-4 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/50 focus:border-white/30"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => {
            const active = type === f.value;
            return (
              <Link
                key={f.value}
                href={{
                  pathname: "/materials",
                  query: {
                    ...(q ? { q } : {}),
                    ...(f.value !== "all" ? { type: f.value } : {}),
                  },
                }}
                className={`font-label-cosmic rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-wider transition ${
                  active
                    ? "border-white/20 bg-white text-[#16181a]"
                    : "border-[#444748]/40 text-[#c4c7c8] hover:border-white/20 hover:text-[#e3e2e3]"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
            <FileText className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
            {q || type !== "all" ? "No matching materials" : "No materials yet"}
          </p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            {q || type !== "all"
              ? "Try a different filter or search."
              : "Upload files from inside a course."}
          </p>
          <Link
            href="/courses"
            className="mt-5 text-sm text-[#e3e2e3] transition hover:underline"
          >
            Go to courses
          </Link>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl">
          <div className="font-label-cosmic grid grid-cols-[2fr_1fr_1fr_0.8fr_auto] gap-4 border-b border-[#444748]/30 px-5 py-3 text-[10px] uppercase tracking-widest text-[#c4c7c8]/60">
            <span>File</span>
            <span>Course</span>
            <span>Type</span>
            <span>Status</span>
            <span className="sr-only">Open</span>
          </div>
          {rows.map((m) => (
            <a
              key={m.id}
              href={m.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid grid-cols-[2fr_1fr_1fr_0.8fr_auto] items-center gap-4 border-b border-[#444748]/10 px-5 py-4 transition last:border-0 hover:bg-[#1b1c1d]/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#444748]/40 bg-[#1b1c1d]">
                  <FileText className="size-4 text-[#c4c7c8]" strokeWidth={1.5} />
                </div>
                <p className="truncate text-sm font-medium">{m.filename}</p>
              </div>
              <span className="font-label-cosmic truncate text-xs uppercase tracking-wider text-[#c4c7c8]">
                {m.course?.title ?? "—"}
              </span>
              <span className="text-sm text-[#c4c7c8]">
                {TYPE_LABELS[m.type] ?? m.type}
              </span>
              <span
                className={`font-label-cosmic w-fit rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                  STATUS_STYLES[m.status] ??
                  "bg-[#343536] text-[#c4c7c8] border-[#444748]/30"
                }`}
              >
                {m.status}
              </span>
              <ExternalLink
                className="size-4 text-[#c4c7c8]/30 transition group-hover:text-[#e3e2e3]"
                strokeWidth={1.5}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
