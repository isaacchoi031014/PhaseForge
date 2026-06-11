"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Topic = { id: string; name: string };
export type MaterialType = "syllabus" | "lecture" | "notes" | "past_exam";

const fieldCls =
  "rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-3 py-2.5 text-sm text-[#e3e2e3] outline-none transition focus:border-white/40";

export function MaterialUpload({
  courseId,
  topics,
  types,
  showTopic = true,
}: {
  courseId: string;
  topics: Topic[];
  types: { value: MaterialType; label: string }[];
  showTopic?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<MaterialType>(types[0].value);
  const [topicId, setTopicId] = useState<string>("");
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

    const chosenType = types.length > 1 ? type : types[0].value;
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
        category_id: showTopic ? topicId || null : null,
        type: chosenType,
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
    <div className="glass-panel rounded-2xl p-5">
      {error && (
        <p className="mb-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
            File (PDF)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="block w-full text-sm text-[#c4c7c8] file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#16181a] hover:file:opacity-90"
          />
        </div>
        {types.length > 1 && (
          <div>
            <label className="font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaterialType)}
              className={fieldCls}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#1b1c1d]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {showTopic && (
          <div>
            <label className="font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]">
              Topic
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className={fieldCls}
            >
              <option value="" className="bg-[#1b1c1d]">
                — none —
              </option>
              {topics.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1b1c1d]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={busy}
          className="active-glow flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Upload className="size-4" strokeWidth={2} />
          )}
          Upload
        </button>
      </div>
    </div>
  );
}
