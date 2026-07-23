"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Guarantees a profiles row exists for the current user. Covers accounts that
// signed up before the auto-creation trigger existed (otherwise the courses FK
// to profiles would reject the insert).
async function ensureProfile(
  supabase: SupabaseServer,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      name: (user.user_metadata?.name as string | undefined) ?? "",
      institution:
        (user.user_metadata?.institution as string | undefined) ?? "",
      role: "professor",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) console.error("ensureProfile failed:", error);
}

export async function createCourse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("createCourse: no authenticated user (session missing)");
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim() || null;

  await ensureProfile(supabase, user);

  const { error } = await supabase
    .from("courses")
    .insert({ professor_id: user.id, title, description });
  if (error) console.error("createCourse failed:", error);

  revalidatePath("/courses");
}

export async function deleteCourse(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) console.error("deleteCourse failed:", error);
  revalidatePath("/courses");
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const courseId = String(formData.get("course_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!courseId || !name) return;

  const { error } = await supabase
    .from("categories")
    .insert({ course_id: courseId, name });
  if (error) console.error("createCategory failed:", error);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteMaterial(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");
  if (!id) return;

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from("materials")
      .remove([storagePath]);
    if (storageError) console.error("deleteMaterial storage failed:", storageError);
  }

  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) console.error("deleteMaterial failed:", error);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) console.error("deleteCategory failed:", error);
  revalidatePath(`/courses/${courseId}`);
}

// Bulk-enrolls students from a pasted "Name, StudentNumber" per line list —
// the roster the kiosk matches against to identify who's taking an exam.
export async function addStudents(formData: FormData) {
  const supabase = await createClient();
  const courseId = String(formData.get("course_id") ?? "");
  const rows = String(formData.get("rows") ?? "");
  if (!courseId || !rows.trim()) return;

  const students = rows
    .split("\n")
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter(([name, studentNumber]) => name && studentNumber)
    .map(([name, studentNumber]) => ({
      course_id: courseId,
      name,
      student_number: studentNumber,
    }));

  if (students.length > 0) {
    const { error } = await supabase
      .from("students")
      .upsert(students, { onConflict: "course_id,student_number" });
    if (error) console.error("addStudents failed:", error);
  }
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteStudent(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) console.error("deleteStudent failed:", error);
  revalidatePath(`/courses/${courseId}`);
}
