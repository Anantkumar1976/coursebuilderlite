"use client";

import Link from "next/link";

import type { ThemeColors } from "@/lib/course-theme/theme";

type Props = {
  courseId: string;
  courseTitle: string;
  attemptsLimit: number | null;
  attemptsUsed: number;
  themeColors: ThemeColors;
  /** Override the "back to home" route (e.g. `/demo/{id}`). */
  launchHref?: string;
  /** Hide author-only settings link (used on public demo pages). */
  hideAuthorLinks?: boolean;
};

export function CourseLocked({
  courseId,
  courseTitle,
  attemptsLimit,
  attemptsUsed,
  themeColors,
  launchHref,
  hideAuthorLinks = false,
}: Props) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-900/80">
      <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white px-6 py-8 text-center shadow-sm dark:border-red-900/60 dark:bg-zinc-950">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: themeColors.highlight, color: "#fff" }}
          aria-hidden
        >
          <span className="text-lg font-bold">!</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Course locked
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          You&rsquo;ve used all{" "}
          {attemptsLimit === 1
            ? "of your attempt"
            : `${attemptsLimit ?? ""} attempts`}{" "}
          for <span className="font-medium">{courseTitle}</span>. You have
          completed {attemptsUsed}{" "}
          {attemptsUsed === 1 ? "attempt" : "attempts"}.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Contact your administrator to request additional access.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={launchHref ?? `/courses/${courseId}/play`}
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: themeColors.button }}
          >
            Back to course home
          </Link>
          {hideAuthorLinks ? null : (
            <Link
              href={`/courses/${courseId}`}
              className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              Course settings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
