import Link from "next/link";
import { ArrowRight, BookOpen, Plus } from "lucide-react";

import { createCourse } from "@/app/(dashboard)/courses/actions";
import { createClient } from "@/lib/supabase/server";

type Course = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, created_at")
    .order("created_at", { ascending: false });

  const list = (courses ?? []) as Course[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a course, then add categories and upload materials to it.
        </p>
      </div>

      {/* New course */}
      <form
        action={createCourse}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Course title
          </label>
          <input
            name="title"
            required
            placeholder="e.g. Introduction to Materials Science"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Description (optional)
          </label>
          <input
            name="description"
            placeholder="Short description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <Plus className="size-4" />
          Add course
        </button>
      </form>

      {/* Course list */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <BookOpen className="size-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">No courses yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Create your first course above to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                  <BookOpen className="size-5 text-gray-600" />
                </div>
                <ArrowRight className="size-4 text-gray-300 transition group-hover:text-gray-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{c.title}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {c.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
