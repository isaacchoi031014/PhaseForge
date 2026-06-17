"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg p-2 text-[#c4c7c8] transition hover:bg-white/5 hover:text-[#e3e2e3]"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="size-4 text-emerald-400" strokeWidth={2} />
      ) : (
        <Copy className="size-4" strokeWidth={1.5} />
      )}
    </button>
  );
}
