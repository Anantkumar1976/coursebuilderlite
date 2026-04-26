"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  attemptsSummary,
  beginAttempt,
  clearCourseLearnerState,
  isCourseLocked,
  readAttemptsState,
  type AttemptsState,
} from "@/lib/course-player/attempts";
import { readStoredPageIndex } from "@/lib/course-player/progress";
import { parseThemeColors } from "@/lib/course-theme/theme";
import type { Json } from "@/lib/supabase/database.types";

type Props = {
  courseId: string;
  pageCount: number;
  themeColorsJson: Json;
  attemptsLimit: number | null;
};

export function CourseLaunchActions({
  courseId,
  pageCount,
  themeColorsJson,
  attemptsLimit,
}: Props) {
  const colors = parseThemeColors(themeColorsJson);
  const router = useRouter();
  const [startAt, setStartAt] = useState(0);
  const [attempts, setAttempts] = useState<AttemptsState | null>(null);

  useEffect(() => {
    setAttempts(readAttemptsState(courseId));
    function refresh() {
      setAttempts(readAttemptsState(courseId));
    }
    window.addEventListener("cbl-attempts-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cbl-attempts-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [courseId]);

  useEffect(() => {
    if (pageCount <= 0) return;
    const raw = readStoredPageIndex(courseId);
    const maxIdx = Math.max(0, pageCount - 1);
    setStartAt(Math.min(Math.max(0, raw), maxIdx));
  }, [courseId, pageCount]);

  const locked =
    attempts !== null && isCourseLocked(attempts, attemptsLimit);
  const active = attempts?.active === true;
  const canResume = active && startAt > 0;

  const handleBegin = useCallback(() => {
    if (active) {
      router.push(
        `/courses/${courseId}/play/content${startAt > 0 ? `?start=${startAt}` : ""}`,
      );
      return;
    }
    clearCourseLearnerState(courseId);
    const result = beginAttempt(courseId, attemptsLimit);
    if (result.locked) {
      setAttempts(result.state);
      return;
    }
    setAttempts(result.state);
    router.push(`/courses/${courseId}/play/content`);
  }, [active, attemptsLimit, courseId, router, startAt]);

  if (pageCount === 0) {
    return (
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-xl bg-zinc-200 px-8 text-sm font-semibold text-zinc-500 dark:bg-zinc-800">
          Add pages to begin
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {locked ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
        >
          <p className="font-semibold">Course locked</p>
          <p className="mt-1">
            You&rsquo;ve used all{" "}
            {attemptsLimit === 1
              ? "of your attempt"
              : `${attemptsLimit} attempts`}{" "}
            for this course. Contact your administrator to request additional
            access.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleBegin}
          disabled={locked}
          className="inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: colors.button }}
        >
          {canResume ? "Resume course" : "Begin course"}
        </button>
        {locked ? (
          <Link
            href={`/courses/${courseId}`}
            className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            Back to course
          </Link>
        ) : null}
      </div>

      {attempts && attemptsLimit !== null ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {attemptsSummary(attempts, attemptsLimit)}
        </p>
      ) : null}
    </div>
  );
}
