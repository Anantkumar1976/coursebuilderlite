"use client";

import { useState } from "react";

type Props = {
  initialFeatured: boolean;
  shareUrl: string;
};

export function CourseFeaturedSection({ initialFeatured, shareUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be unavailable — user can copy manually */
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-5 items-center rounded-full bg-amber-500/20 px-2 text-xs font-semibold text-amber-800 dark:text-amber-300"
        >
          Admin
        </span>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Featured / public demo
        </p>
      </div>
      <label className="flex items-start gap-3 text-sm text-amber-950 dark:text-amber-100">
        <input
          type="checkbox"
          name="is_featured"
          defaultChecked={initialFeatured}
          className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
        />
        <span>
          <span className="font-medium">Feature this course</span>
          <span className="mt-1 block text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            Featured courses are publicly readable and appear in the
            &quot;See it in action&quot; section on the marketing home page.
            Anyone with the share link below can launch it without signing in.
          </span>
        </span>
      </label>
      <div className="flex flex-col gap-2 rounded-md border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Public share link
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-md border border-amber-200 bg-white px-2 py-1.5 font-mono text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-900/60 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 items-center justify-center rounded-md bg-amber-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
          Save with &quot;Feature this course&quot; enabled first. The link only
          works while the course is marked as featured.
        </p>
      </div>
    </div>
  );
}
