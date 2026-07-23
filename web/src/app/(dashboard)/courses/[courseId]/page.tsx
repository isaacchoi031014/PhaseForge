import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, FolderOpen, Plus, Trash2, Users } from "lucide-react";

import {
  addStudents,
  createCategory,
  deleteCategory,
  deleteMaterial,
  deleteStudent,
} from "@/app/(dashboard)/courses/actions";
import { MaterialUpload } from "@/components/dashboard/material-upload";
import { createClient } from "@/lib/supabase/server";

type Course = { id: string; title: string; description: string | null };
type Topic = {
  id: string;
  name: string;
  difficulty_bands_json: string[];
  created_at: string;
};
type Material = {
  id: string;
  filename: string;
  type: string;
  status: string;
  storage_path: string;
  error_message: string | null;
};
type Student = {
  id: string;
  name: string;
  student_number: string;
};

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-[#343536] text-[#c4c7c8] border-[#444748]/30",
  processing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  syllabus: "Syllabus",
  lecture: "Lecture slides",
  notes: "Notes",
  past_exam: "Past exam",
};

function MaterialRow({ m, courseId }: { m: Material; courseId: string }) {
  return (
    <div className="glass-panel flex items-center justify-between rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
          <FileText className="size-[18px] text-[#c4c7c8]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-medium">{m.filename}</h3>
          <p className="font-label-cosmic mt-0.5 text-[10px] uppercase tracking-wider text-[#c4c7c8]/60">
            {TYPE_LABELS[m.type] ?? m.type}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`font-label-cosmic rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
            STATUS_STYLES[m.status] ??
            "bg-[#343536] text-[#c4c7c8] border-[#444748]/30"
          }`}
        >
          {m.status}
        </span>
        {m.status === "error" && m.error_message && (
          <span className="max-w-[200px] truncate text-xs text-red-400">
            {m.error_message}
          </span>
        )}
        <form action={deleteMaterial}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="course_id" value={courseId} />
          <input type="hidden" name="storage_path" value={m.storage_path} />
          <button
            type="submit"
            className="rounded-lg p-2 text-[#c4c7c8]/60 transition hover:bg-[#1b1c1d] hover:text-red-400"
            aria-label="Delete material"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const [{ data: courseData }, { data: categories }, { data: materials }, { data: students }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, title, description")
        .eq("id", courseId)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("id, name, difficulty_bands_json, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true }),
      supabase
        .from("materials")
        .select("id, filename, type, status, storage_path, error_message")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false }),
      supabase
        .from("students")
        .select("id, name, student_number")
        .eq("course_id", courseId)
        .order("name", { ascending: true }),
    ]);

  const course = courseData as Course | null;
  if (!course) notFound();

  const topics = (categories ?? []) as Topic[];
  const materialList = (materials ?? []) as Material[];
  const roster = (students ?? []) as Student[];
  const topicOptions = topics.map((t) => ({ id: t.id, name: t.name }));

  const syllabus = materialList.find((m) => m.type === "syllabus");
  const lectureNotes = materialList.filter(
    (m) => m.type === "lecture" || m.type === "notes",
  );
  const pastExams = materialList.filter((m) => m.type === "past_exam");

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/courses"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[#c4c7c8] transition hover:text-[#e3e2e3]"
      >
        <ChevronLeft className="size-4" strokeWidth={1.5} />
        Courses
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-[32px] leading-tight tracking-tight">
          {course.title}
        </h1>
        {course.description && (
          <p className="mt-2 text-[#c4c7c8]">{course.description}</p>
        )}
      </div>

      {/* Topics */}
      <h2 className="font-display mb-4 text-2xl">Topics</h2>

      <form
        action={createCategory}
        className="glass-panel mb-6 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="course_id" value={course.id} />
        <div className="flex-1">
          <label className="font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
            Topic name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Recursion, Tree Traversals"
            className="font-body-cosmic w-full rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-3 py-2.5 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
        </div>
        <button
          type="submit"
          className="active-glow flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2} />
          Add topic
        </button>
      </form>

      {topics.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
            <FolderOpen className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
            No topics yet
          </p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            Add a topic above (e.g. a unit of the course).
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((t) => (
            <div
              key={t.id}
              className="glass-panel flex items-center justify-between rounded-2xl p-4"
            >
              <div>
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.difficulty_bands_json.map((band) => (
                    <span
                      key={band}
                      className="font-label-cosmic rounded-full border border-[#444748]/30 bg-[#343536] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#c4c7c8]"
                    >
                      {band}
                    </span>
                  ))}
                </div>
              </div>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <button
                  type="submit"
                  className="rounded-lg p-2 text-[#c4c7c8]/60 transition hover:bg-[#1b1c1d] hover:text-red-400"
                  aria-label="Delete topic"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* ── Syllabus ── */}
      <div className="mt-12 mb-4 flex items-baseline gap-2">
        <h2 className="font-display text-2xl">Syllabus</h2>
        <span className="font-label-cosmic text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
          one file
        </span>
      </div>
      {syllabus ? (
        <MaterialRow m={syllabus} courseId={course.id} />
      ) : (
        <MaterialUpload
          courseId={course.id}
          topics={topicOptions}
          types={[{ value: "syllabus", label: "Syllabus" }]}
          showTopic={false}
        />
      )}

      {/* ── Lecture slides & notes ── */}
      <h2 className="font-display mb-4 mt-12 text-2xl">Lecture slides</h2>
      <div className="mb-4">
        <MaterialUpload
          courseId={course.id}
          topics={topicOptions}
          types={[{ value: "lecture", label: "Lecture slides" }]}
          showTopic={false}
        />
      </div>
      {lectureNotes.length > 0 && (
        <div className="flex flex-col gap-3">
          {lectureNotes.map((m) => (
            <MaterialRow key={m.id} m={m} courseId={course.id} />
          ))}
        </div>
      )}

      {/* ── Past exams ── */}
      <h2 className="font-display mb-4 mt-12 text-2xl">Past exams</h2>
      <div className="mb-4">
        <MaterialUpload
          courseId={course.id}
          topics={topicOptions}
          types={[{ value: "past_exam", label: "Past exam" }]}
          showTopic={false}
        />
      </div>
      {pastExams.length > 0 && (
        <div className="flex flex-col gap-3">
          {pastExams.map((m) => (
            <MaterialRow key={m.id} m={m} courseId={course.id} />
          ))}
        </div>
      )}

      {/* ── Roster ── */}
      <div className="mt-12 mb-4 flex items-baseline gap-2">
        <h2 className="font-display text-2xl">Roster</h2>
        <span className="font-label-cosmic text-[10px] uppercase tracking-wider text-[#c4c7c8]/50">
          {roster.length} student{roster.length === 1 ? "" : "s"}
        </span>
      </div>
      <form
        action={addStudents}
        className="glass-panel mb-6 flex flex-col gap-3 rounded-2xl p-5"
      >
        <input type="hidden" name="course_id" value={course.id} />
        <label className="font-label-cosmic mb-1 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
          Paste roster (one per line: Name, Student ID)
        </label>
        <textarea
          name="rows"
          required
          rows={4}
          placeholder={"Jane Doe, UT-204113\nMarcus Lee, UT-209847"}
          className="font-body-cosmic w-full resize-y rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-3 py-2.5 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20"
        />
        <button
          type="submit"
          className="active-glow flex w-fit items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2} />
          Add students
        </button>
      </form>

      {roster.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
            <Users className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
            No students enrolled yet
          </p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            Paste your roster above — the kiosk matches students against this list.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {roster.map((s) => (
            <div
              key={s.id}
              className="glass-panel flex items-center justify-between rounded-2xl p-4"
            >
              <div>
                <h3 className="text-sm font-semibold">{s.name}</h3>
                <p className="mt-0.5 font-mono text-xs text-[#c4c7c8]/60">
                  {s.student_number}
                </p>
              </div>
              <form action={deleteStudent}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <button
                  type="submit"
                  className="rounded-lg p-2 text-[#c4c7c8]/60 transition hover:bg-[#1b1c1d] hover:text-red-400"
                  aria-label="Remove student"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
