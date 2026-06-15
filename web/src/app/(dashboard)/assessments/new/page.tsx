import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  AssessmentBuilder,
  type Course,
} from "@/components/dashboard/assessment-builder";
import { createClient } from "@/lib/supabase/server";

type CourseRow = {
  id: string;
  title: string;
  categories: { id: string; name: string }[] | null;
};

export default async function NewAssessmentPage() {
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
        href="/assessments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[#c4c7c8] transition hover:text-[#e3e2e3]"
      >
        <ChevronLeft className="size-4" strokeWidth={1.5} />
        Assessments
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-[32px] leading-tight tracking-tight">
          New Assessment
        </h1>
        <p className="mt-2 text-[#c4c7c8]">
          Configure what to test — PhaseForge generates a unique variant per
          student.
        </p>
      </div>

      <AssessmentBuilder courses={courses} />
    </div>
  );
}
