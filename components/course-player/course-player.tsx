"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { PageContentV1 } from "@/lib/page-builder";

import { TemplateRenderer } from "./template-renderer";

export type PlayerPage = {
  id: string;
  title: string;
  content: PageContentV1;
};

type Props = {
  courseId: string;
  courseTitle: string;
  pages: PlayerPage[];
  /** Signed URLs for `text_image` blocks that reference `imageAssetId`. */
  signedImageUrls?: Record<string, string>;
};

export function CoursePlayer({
  courseId,
  courseTitle,
  pages,
  signedImageUrls,
}: Props) {
  const [index, setIndex] = useState(0);
  const total = pages.length;
  const clampedIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = pages[clampedIndex] ?? pages[0];
  const progress = total > 0 ? ((clampedIndex + 1) / total) * 100 : 0;

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      setIndex(next);
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(clampedIndex - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(clampedIndex + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, clampedIndex]);

  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          This course has no pages yet. Add pages in the builder to preview
          them here.
        </p>
        <Link
          href={`/courses/${courseId}/builder`}
          className="mt-6 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Open page builder
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {courseTitle}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Preview · Page {clampedIndex + 1} of {total}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/courses/${courseId}`}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Course
            </Link>
            <Link
              href={`/courses/${courseId}/builder`}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Builder
            </Link>
          </div>
        </div>
        <div
          className="mx-auto mt-3 h-1 max-w-3xl overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={clampedIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Course progress"
        >
          <div
            className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 ease-out dark:bg-zinc-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-zinc-100 dark:bg-zinc-900/80">
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {current.title}
            </h1>
          </header>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 sm:p-8">
            <TemplateRenderer
              key={current.id}
              content={current.content}
              signedImageUrls={signedImageUrls}
            />
          </div>
        </div>

        <footer className="sticky bottom-0 border-t border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => go(clampedIndex - 1)}
              disabled={clampedIndex === 0}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Previous
            </button>
            <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
              Use ← → keys
            </span>
            <button
              type="button"
              onClick={() => go(clampedIndex + 1)}
              disabled={clampedIndex >= total - 1}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
