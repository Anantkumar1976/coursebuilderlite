import Link from "next/link";

import type { ThemeFonts } from "@/lib/course-theme/theme";
import type { Json } from "@/lib/supabase/database.types";

import { CourseLaunchActions } from "./course-launch-actions";

type Props = {
  courseId: string;
  courseTitle: string;
  themeFonts: ThemeFonts;
  description: string | null;
  estimatedDurationMinutes: number | null;
  bannerUrl: string | null;
  lessonCount: number;
  pageCount: number;
  themeColorsJson: Json;
  /** Max course attempts; null = unlimited. */
  attemptsLimit: number | null;
  /** Website/manual presentation mode. */
  manualMode?: boolean;
  /** Override the play content route (e.g. `/demo/{id}/play`). */
  playHref?: string;
  /** Override the settings-back route used when locked (e.g. `/demo/{id}`). */
  settingsHref?: string;
  /** Hide the author-only settings/builder links (used on public demo pages). */
  hideAuthorLinks?: boolean;
};

export function CourseLaunch({
  courseId,
  courseTitle,
  themeFonts,
  description,
  estimatedDurationMinutes,
  bannerUrl,
  lessonCount,
  pageCount,
  themeColorsJson,
  attemptsLimit,
  manualMode = false,
  playHref,
  settingsHref,
  hideAuthorLinks = false,
}: Props) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="relative w-full overflow-hidden bg-zinc-900">
        {bannerUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bannerUrl}
            alt=""
            className="h-56 w-full object-cover sm:h-72 md:h-80"
          />
        ) : (
          <div
            className="h-56 bg-gradient-to-br from-zinc-700 to-zinc-900 sm:h-72 md:h-80"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-12 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">
            {manualMode ? "Manual" : "Course"}
          </p>
          <h1
            className="mt-2 font-bold tracking-tight text-white"
            style={{
              fontFamily: themeFonts.courseTitle,
              fontSize: themeFonts.courseTitleSize,
            }}
          >
            {courseTitle}
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          {estimatedDurationMinutes != null && estimatedDurationMinutes > 0 ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              ~{estimatedDurationMinutes} min
            </span>
          ) : (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
              Duration not set
            </span>
          )}
          {lessonCount > 0 ? (
            <span>
              {lessonCount} {manualMode ? "section" : "lesson"}
              {lessonCount === 1 ? "" : "s"}
              {pageCount > 0
                ? ` · ${pageCount} ${manualMode ? "topic" : "page"}${pageCount === 1 ? "" : "s"}`
                : ""}
            </span>
          ) : pageCount > 0 ? (
            <span>
              {pageCount} {manualMode ? "topic" : "page"}
              {pageCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {description ? (
          <p className="mt-6 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            {description}
          </p>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">
            No description yet. Add one in {manualMode ? "manual" : "course"} settings.
          </p>
        )}

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CourseLaunchActions
            courseId={courseId}
            pageCount={pageCount}
            themeColorsJson={themeColorsJson}
            attemptsLimit={attemptsLimit}
            manualMode={manualMode}
            contentHref={playHref}
            backHref={settingsHref}
          />
          {hideAuthorLinks ? null : (
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href={`/courses/${courseId}`}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {manualMode ? "Manual settings" : "Course settings"}
              </Link>
              <Link
                href={`/courses/${courseId}/builder`}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Builder
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
