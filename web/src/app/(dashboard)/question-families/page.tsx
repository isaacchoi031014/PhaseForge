import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  QuestionFamilyBuilder,
  type Course,
} from "@/components/dashboard/question-family-builder";
import { createClient } from "@/lib/supabase/server";

type CourseRow = {
  id: string;
  title: string;
  categories: { id: string; name: string }[] | null;
};

export default async function QuestionFamiliesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title, categories(id, name)")
    .order("created_at", { ascending: false });

  const courses: Course[] = ((data ?? []) as unknown as CourseRow[]).map(
    (c) => ({
      id: c.id,
      title: c.title,
      topics: (c.categories ?? []).map((t) => ({ id: t.id, name: t.name })),
    }),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[#c4c7c8] transition hover:text-[#e3e2e3]"
      >
        <ChevronLeft className="size-4" strokeWidth={1.5} />
        Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-[32px] leading-tight tracking-tight">
          Generate Question Families
        </h1>
        <p className="mt-2 text-[#c4c7c8]">
          Turn course materials into reusable, parameterized question
          families — each produces multiple equivalent variants.
        </p>
      </div>

      <QuestionFamilyBuilder courses={courses} />
    </div>
  );
}
