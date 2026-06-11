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
        <h1 className="font-display text-[32px] leading-tight tracking-tight">
          Courses
        </h1>
        <p className="mt-2 text-[#c4c7c8]">
          Create a course, then add categories and upload materials to it.
        </p>
      </div>

      {/* New course */}
      <form
        action={createCourse}
        className="glass-panel mb-10 flex flex-col gap-3 rounded-2xl p-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
            Course title
          </label>
          <input
            name="title"
            required
            placeholder="e.g. Introduction to Materials Science"
            className="font-body-cosmic w-full rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-3 py-2.5 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
        </div>
        <div className="flex-1">
          <label className="font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
            Description (optional)
          </label>
          <input
            name="description"
            placeholder="Short description"
            className="font-body-cosmic w-full rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-3 py-2.5 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
        </div>
        <button
          type="submit"
          className="active-glow flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2} />
          Add course
        </button>
      </form>

      {/* Course list */}
      {list.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
            <BookOpen className="size-6 text-[#c4c7c8]/60" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#e3e2e3]">
            No courses yet
          </p>
          <p className="mt-1 text-sm text-[#c4c7c8]/60">
            Create your first course above to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="glass-panel group relative overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl border border-[#444748]/40 bg-[#1b1c1d]">
                  <BookOpen
                    className="size-5 text-[#c4c7c8]"
                    strokeWidth={1.5}
                  />
                </div>
                <ArrowRight
                  className="size-4 text-[#c4c7c8]/40 transition-all group-hover:translate-x-1 group-hover:text-[#e3e2e3]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-display mt-5 text-lg">{c.title}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-[#c4c7c8]">
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
