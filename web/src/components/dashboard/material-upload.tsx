"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type MaterialType = "lecture" | "notes" | "past_exam";

const TYPES: { value: MaterialType; label: string }[] = [
  { value: "lecture", label: "Lecture slides" },
  { value: "notes", label: "Notes" },
  { value: "past_exam", label: "Past exam" },
];

export function MaterialUpload({
  courseId,
  categories,
}: {
  courseId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<MaterialType>("lecture");
  const [categoryId, setCategoryId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired — please log in again.");
      setBusy(false);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${user.id}/${courseId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(path, file);
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setBusy(false);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("materials")
      .insert({
        course_id: courseId,
        category_id: categoryId || null,
        type,
        filename: file.name,
        storage_path: path,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      setError(`Saving record failed: ${insertError?.message ?? "unknown"}`);
      setBusy(false);
      return;
    }

    // Best-effort trigger for the ingestion pipeline (api). Safe to fail while
    // the backend isn't running yet — the material simply stays "uploaded".
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ material_id: (inserted as { id: string }).id }),
      });
    } catch {
      // ignore — backend not up yet
    }

    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            File (PDF)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MaterialType)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleUpload}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload
        </button>
      </div>
    </div>
  );
}
