import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, FolderOpen, Plus, Trash2 } from "lucide-react";

import {
  createCategory,
  deleteCategory,
  deleteMaterial,
} from "@/app/(dashboard)/courses/actions";
import { MaterialUpload } from "@/components/dashboard/material-upload";
import { createClient } from "@/lib/supabase/server";

type Course = { id: string; title: string; description: string | null };
type Category = {
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

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-600",
  processing: "bg-amber-50 text-amber-600",
  done: "bg-emerald-50 text-emerald-600",
  error: "bg-red-50 text-red-600",
};

const TYPE_LABELS: Record<string, string> = {
  lecture: "Lecture",
  notes: "Notes",
  past_exam: "Past exam",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const [{ data: courseData }, { data: categories }, { data: materials }] =
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
    ]);

  const course = courseData as Course | null;
  if (!course) notFound();

  const list = (categories ?? []) as Category[];
  const materialList = (materials ?? []) as Material[];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/courses"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-900"
      >
        <ChevronLeft className="size-4" />
        Courses
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        {course.description && (
          <p className="mt-1 text-sm text-gray-500">{course.description}</p>
        )}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Categories</h2>

      {/* New category */}
      <form
        action={createCategory}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="course_id" value={course.id} />
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Category / topic name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Diffusion, Phase Diagrams"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <Plus className="size-4" />
          Add category
        </button>
      </form>

      {/* Category list */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-14 text-center">
          <FolderOpen className="size-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            No categories yet
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Add a topic above (e.g. a unit of the course).
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div>
                <h3 className="text-sm font-semibold">{cat.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cat.difficulty_bands_json.map((band) => (
                    <span
                      key={band}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {band}
                    </span>
                  ))}
                </div>
              </div>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={cat.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <button
                  type="submit"
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
                  aria-label="Delete category"
                >
                  <Trash2 className="size-4" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Materials */}
      <h2 className="mb-4 mt-10 text-lg font-semibold">Materials</h2>
      <div className="mb-6">
        <MaterialUpload
          courseId={course.id}
          categories={list.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      {materialList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-14 text-center">
          <FileText className="size-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            No materials yet
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Upload lecture slides, notes, or past exams above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {materialList.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="size-[18px] text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{m.filename}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {TYPE_LABELS[m.type] ?? m.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[m.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {m.status}
                </span>
                {m.status === "error" && m.error_message && (
                  <span className="max-w-[200px] truncate text-xs text-red-500">
                    {m.error_message}
                  </span>
                )}
                <form action={deleteMaterial}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="course_id" value={course.id} />
                  <input
                    type="hidden"
                    name="storage_path"
                    value={m.storage_path}
                  />
                  <button
                    type="submit"
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
                    aria-label="Delete material"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
