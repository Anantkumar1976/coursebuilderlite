"use client";

import { useEffect, useId } from "react";

function TranscriptIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-current"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

type Props = {
  transcript: string;
  /** Used for dialog labelling when multiple pages are on screen. */
  pageTitle?: string;
  variant?: "text" | "icon";
  compact?: boolean;
};

export function PageAudioTranscriptButton({
  transcript,
  pageTitle,
  variant = "text",
  compact = false,
}: Props) {
  const trimmed = transcript.trim();
  const dialogId = useId();
  const titleId = `${dialogId}-title`;

  useEffect(() => {
    if (!trimmed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const el = document.getElementById(dialogId) as HTMLDialogElement | null;
        if (el?.open) el.close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogId, trimmed]);

  if (!trimmed) return null;

  function openDialog() {
    const el = document.getElementById(dialogId) as HTMLDialogElement | null;
    el?.showModal();
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          className={`inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
            compact ? "h-7 w-7" : "h-9 w-9 rounded-lg"
          }`}
          aria-haspopup="dialog"
          aria-controls={dialogId}
          aria-label="Open audio transcript"
          onClick={openDialog}
        >
          <TranscriptIcon />
        </button>
      ) : (
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          aria-haspopup="dialog"
          aria-controls={dialogId}
          onClick={openDialog}
        >
          Transcript
        </button>
      )}
      <dialog
        id={dialogId}
        aria-labelledby={titleId}
        className="fixed left-1/2 top-1/2 z-[70] w-[min(24rem,calc(100vw-2rem))] max-h-[min(20rem,70vh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 open:flex open:flex-col dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold">
              Audio transcript
            </h2>
            {pageTitle ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {pageTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close transcript"
            onClick={() => {
              const el = document.getElementById(dialogId) as HTMLDialogElement | null;
              el?.close();
            }}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
          {trimmed}
        </div>
      </dialog>
    </>
  );
}
