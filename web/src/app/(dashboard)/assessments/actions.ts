"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function setQuestionStatus(input: {
  id: string;
  status: "approved" | "rejected" | "draft";
  path?: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update({ professor_review_status: input.status })
    .eq("id", input.id);
  if (error) {
    console.error("setQuestionStatus failed:", error);
    return { ok: false };
  }
  if (input.path) revalidatePath(input.path);
  return { ok: true };
}

export async function deleteQuestion(input: {
  id: string;
  path?: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", input.id);
  if (error) {
    console.error("deleteQuestion failed:", error);
    return { ok: false };
  }
  if (input.path) revalidatePath(input.path);
  return { ok: true };
}

export async function deleteQuestions(input: {
  ids: string[];
  path?: string;
}): Promise<{ ok: boolean }> {
  if (input.ids.length === 0) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().in("id", input.ids);
  if (error) {
    console.error("deleteQuestions failed:", error);
    return { ok: false };
  }
  if (input.path) revalidatePath(input.path);
  return { ok: true };
}

export async function deleteAssessment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) console.error("deleteAssessment failed:", error);
  revalidatePath("/assessments");
  redirect("/assessments");
}

export type CreateAssessmentInput = {
  courseId: string;
  title: string;
  topicIds: string[];
  questions: number;
  difficulty: { easy: number; medium: number; hard: number };
  opensAt: string | null;
  closesAt: string | null;
  instructions: string;
};

export type CreateAssessmentResult =
  | { ok: true; code: string; id: string }
  | { ok: false; error: string };

// Unambiguous alphabet (no 0/O/1/I/L) for codes students type by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `PF-${s}`;
}

export async function createAssessment(
  input: CreateAssessmentInput,
): Promise<CreateAssessmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in." };
  if (!input.courseId) return { ok: false, error: "Pick a course." };

  const title = input.title.trim() || "Untitled assessment";

  // Resolve topic names so the desktop app can show them on the consent screen.
  let topicNames: string[] = [];
  if (input.topicIds.length > 0) {
    const { data: topics } = await supabase
      .from("categories")
      .select("name")
      .in("id", input.topicIds);
    topicNames = ((topics ?? []) as { name: string }[]).map((t) => t.name);
  }

  const config = {
    questions: input.questions,
    minutes: 60,
    topics: topicNames,
    topicIds: input.topicIds,
    difficulty: input.difficulty,
    instructions: input.instructions.trim(),
  };

  // Generate a unique code; retry on the rare unique-collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data: inserted, error } = await supabase
      .from("assessments")
      .insert({
        course_id: input.courseId,
        title,
        code,
        status: "open",
        window_open: input.opensAt || null,
        window_close: input.closesAt || null,
        config_json: config,
      })
      .select("id")
      .single();
    if (!error && inserted) return { ok: true, code, id: (inserted as { id: string }).id };
    if (error && error.code !== "23505") {
      console.error("createAssessment failed:", error);
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "Could not generate a unique code. Try again." };
}
