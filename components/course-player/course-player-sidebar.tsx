"use client";

import { useMemo } from "react";

import type { NavigationFlow } from "@/lib/course-player/navigation-flow";
import type { LessonNav } from "@/lib/course-player/types";
import type { ThemeFonts } from "@/lib/course-theme/theme";

/** Foreground hex for text/icons on top of `accentHex` (sRGB relative luminance). */
function textOnAccent(accentHex: string): string {
  const raw = accentHex.trim();
  const t = raw.startsWith("#") ? raw : `#${raw}`;
  let r: number;
  let g: number;
  let b: number;
  if (t.length === 4) {
    r = parseInt(t[1] + t[1], 16);
    g = parseInt(t[2] + t[2], 16);
    b = parseInt(t[3] + t[3], 16);
  } else if (t.length === 7 || t.length === 9) {
    r = parseInt(t.slice(1, 3), 16);
    g = parseInt(t.slice(3, 5), 16);
    b = parseInt(t.slice(5, 7), 16);
  } else {
    return "#ffffff";
  }
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? "#18181b" : "#ffffff";
}

type Props = {
  courseTitle: string;
  themeFonts: ThemeFonts;
  bannerUrl: string | null;
  lessons: LessonNav[];
  navigationFlow: NavigationFlow;
  /** Flat index of the active page */
  activeFlatIndex: number;
  visitedPageIds: Set<string>;
  accentColor: string;
  /** Which lessons show expanded page lists */
  expandedLessonIds: Set<string>;
  onToggleLesson: (lessonId: string) => void;
  onSelectPage: (flatIndex: number) => void;
  /** When false, outline entry is disabled (linear lock). Omit or always true for open/website. */
  canNavigateToIndex?: (flatIndex: number) => boolean;
};

export function CoursePlayerSidebar({
  courseTitle,
  themeFonts,
  bannerUrl,
  lessons,
  navigationFlow,
  activeFlatIndex,
  visitedPageIds,
  accentColor,
  expandedLessonIds,
  onToggleLesson,
  onSelectPage,
  canNavigateToIndex,
}: Props) {
  const canGo = useMemo(() => {
    if (!canNavigateToIndex) {
      return (_i: number) => true;
    }
    return canNavigateToIndex;
  }, [canNavigateToIndex]);
  const flatIndexByPageId = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const lesson of lessons) {
      for (const p of lesson.pages) {
        m.set(p.id, i);
        i += 1;
      }
    }
    return m;
  }, [lessons]);

  const totalPages = flatIndexByPageId.size;
  const visitedCount = useMemo(() => {
    let n = 0;
    for (const id of visitedPageIds) {
      if (flatIndexByPageId.has(id)) n += 1;
    }
    return n;
  }, [visitedPageIds, flatIndexByPageId]);

  const progressPct =
    totalPages > 0 ? Math.round((visitedCount / totalPages) * 100) : 0;

  const progressHint =
    navigationFlow === "website"
      ? "Scroll to read each topic"
      : navigationFlow === "linear"
        ? "Pages unlock in order"
        : "Open any page from the outline";
  const isWebsite = navigationFlow === "website";

  const activeFg = useMemo(() => textOnAccent(accentColor), [accentColor]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-zinc-800 sm:h-36">
        {bannerUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-zinc-600 to-zinc-900"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
          <p
            className="line-clamp-2 font-semibold leading-snug text-white drop-shadow"
            style={{
              fontFamily: themeFonts.courseTitle,
              fontSize: themeFonts.courseTitleSize,
            }}
          >
            {courseTitle}
          </p>
        </div>
      </div>

      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={isWebsite ? "Manual reading progress" : "Course progress"}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: accentColor }}
          />
        </div>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {progressPct}% {isWebsite ? "read" : "complete"}
        </p>
        <p className="mt-1 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
          {progressHint}
        </p>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
        aria-label={isWebsite ? "Manual contents" : "Course outline"}
      >
        <ul className="space-y-0.5">
          {lessons.map((lesson) => {
            const expanded = expandedLessonIds.has(lesson.id);
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => onToggleLesson(lesson.id)}
                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-200/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="text-zinc-400" aria-hidden>
                    {expanded ? "▾" : "▸"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                </button>
                {expanded ? (
                  <ul className="ml-4 border-l border-zinc-200 pl-2 dark:border-zinc-700">
                    {lesson.pages.map((page) => {
                      const flatIdx = flatIndexByPageId.get(page.id);
                      if (flatIdx === undefined) return null;
                      const active = flatIdx === activeFlatIndex;
                      const done = visitedPageIds.has(page.id);
                      const allowed = canGo(flatIdx);
                      const showVisitedCheck = navigationFlow !== "website";
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            disabled={!allowed}
                            onClick={() => {
                              if (!allowed) return;
                              onSelectPage(flatIdx);
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                              !allowed
                                ? "cursor-not-allowed opacity-50"
                                : active
                                  ? "font-medium"
                                  : isWebsite
                                    ? "text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
                                    : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                            style={
                              active && allowed
                                ? {
                                    backgroundColor: accentColor,
                                    color: activeFg,
                                  }
                                : undefined
                            }
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {page.title}
                            </span>
                            {showVisitedCheck ? (
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                                  done
                                    ? "border-transparent"
                                    : "border-zinc-300 bg-transparent dark:border-zinc-600"
                                }`}
                                style={
                                  done
                                    ? {
                                        backgroundColor: accentColor,
                                        color: activeFg,
                                      }
                                    : undefined
                                }
                                aria-label={done ? "Visited" : "Not visited"}
                              >
                                {done ? "✓" : ""}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
