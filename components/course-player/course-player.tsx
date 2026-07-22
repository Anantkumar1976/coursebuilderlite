"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ThemeColors, ThemeFonts } from "@/lib/course-theme/theme";
import {
  beginAttempt,
  endAttempt,
  isCourseLocked,
  readAttemptsState,
  type AttemptsState,
} from "@/lib/course-player/attempts";
import { isFinalAssessmentLocked } from "@/lib/course-player/assessment-attempts";
import {
  allPagesVisited,
  courseHasQuizResultsPage,
  isCourseCompletionTemplate,
} from "@/lib/course-player/course-completion";
import { readFinalQuizResult } from "@/lib/course-player/final-quiz-result";
import {
  canNavigateToIndexLinear,
  type NavigationFlow,
} from "@/lib/course-player/navigation-flow";
import {
  readPlayProgress,
  writePlayProgress,
} from "@/lib/course-player/progress";
import type { LessonNav, PlayerPage } from "@/lib/course-player/types";
import { getPageAudioTranscript, resolvePageAudioSrc } from "@/lib/page-builder";

import { CourseLocked } from "./course-locked";
import { CoursePlayerSidebar } from "./course-player-sidebar";
import { CoursePlayerWebsite } from "./course-player-website";
import { PageAudioControls, PageAudioHost } from "./page-audio-host";
import { isKnowledgeCheckQuestionPage } from "@/lib/course-player/final-assessment-lesson";
import { TemplateRenderer } from "./template-renderer";

export type { LessonNav, PlayerPage } from "@/lib/course-player/types";

export type ReferenceItem = {
  id: string;
  label: string;
  downloadUrl: string;
};

type Props = {
  courseId: string;
  courseTitle: string;
  bannerUrl: string | null;
  lessons: LessonNav[];
  referenceMaterials: ReferenceItem[];
  themeFonts: ThemeFonts;
  themeColors: ThemeColors;
  signedImageUrls?: Record<string, string>;
  /** If set, initial page comes from `?start=`; otherwise resume from storage. */
  resumeFromUrl: number | null;
  /** Mastery threshold 0–100 (course settings). Used for final quiz & results. */
  passingScorePercent: number;
  navigationFlow: NavigationFlow;
  /** Max course attempts; null = unlimited. */
  attemptsLimit: number | null;
  /** Max submitted final-assessment scores; null = unlimited. */
  assessmentAttemptsLimit: number | null;
  learnerName: string;
  customCss?: string | null;
  /** Override the "Course home" launch route (e.g. `/demo/{id}`). */
  launchHref?: string;
  /** Hide author-only UI (Settings, Builder) — used on public demo pages. */
  hideAuthorLinks?: boolean;
};

export function CoursePlayer(props: Props) {
  if (props.navigationFlow === "website") {
    return <CoursePlayerWebsite {...props} />;
  }
  return <CoursePlayerStandard {...props} />;
}

function CoursePlayerStandard({
  courseId,
  courseTitle,
  bannerUrl,
  lessons,
  referenceMaterials,
  themeFonts,
  themeColors,
  signedImageUrls,
  resumeFromUrl,
  passingScorePercent,
  navigationFlow,
  attemptsLimit,
  assessmentAttemptsLimit,
  learnerName,
  customCss,
  launchHref,
  hideAuthorLinks = false,
}: Props) {
  const flat = useMemo(() => {
    const out: {
      lessonIndex: number;
      lessonId: string;
      pageIndexInLesson: number;
      lessonTitle: string;
      page: PlayerPage;
    }[] = [];
    lessons.forEach((lesson, lessonIndex) => {
      lesson.pages.forEach((page, pageIndexInLesson) => {
        out.push({
          lessonIndex,
          lessonId: lesson.id,
          pageIndexInLesson,
          lessonTitle: lesson.title,
          page,
        });
      });
    });
    return out;
  }, [lessons]);

  const flatIds = useMemo(() => flat.map((f) => f.page.id), [flat]);
  const requiredFlatIds = useMemo(
    () =>
      flat
        .filter((f) => !isCourseCompletionTemplate(f.page))
        .map((f) => f.page.id),
    [flat],
  );
  const flatIndexByPageId = useMemo(() => {
    const m = new Map<string, number>();
    flat.forEach((f, i) => m.set(f.page.id, i));
    return m;
  }, [flat]);
  const flatIdsKey = flatIds.join("|");
  const total = flat.length;

  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const progressFlushRef = useRef({
    pageIndex: 0,
    visitedIds: [] as string[],
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refOpen, setRefOpen] = useState(false);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(
    () => new Set(lessons.map((l) => l.id)),
  );
  const [finalQuizSnapshot, setFinalQuizSnapshot] = useState(() =>
    readFinalQuizResult(courseId),
  );
  const [syncedFinalQuizCourseId, setSyncedFinalQuizCourseId] =
    useState(courseId);
  if (syncedFinalQuizCourseId !== courseId) {
    setSyncedFinalQuizCourseId(courseId);
    setFinalQuizSnapshot(readFinalQuizResult(courseId));
  }

  const attemptsScope = `${courseId}:${attemptsLimit ?? "none"}`;
  const [attempts, setAttempts] = useState<AttemptsState | null>(null);
  const [syncedAttemptsScope, setSyncedAttemptsScope] = useState<string | null>(
    null,
  );
  const [completionEndedScope, setCompletionEndedScope] = useState<
    string | null
  >(null);
  const [assessmentLockTick, setAssessmentLockTick] = useState(0);

  const clampedIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = flat[clampedIndex];
  const currentLessonId = current?.lessonId ?? null;

  const lessonAssessmentPageIds = useMemo(() => {
    if (!currentLessonId) return [];
    const lesson = lessons.find((l) => l.id === currentLessonId);
    if (!lesson) return [];
    return lesson.pages
      .filter((p) =>
        ["mcq", "mrq", "true_false"].includes(p.content.template),
      )
      .map((p) => p.id);
  }, [currentLessonId, lessons]);

  const isLastLessonInCourse = current
    ? current.lessonIndex === lessons.length - 1
    : false;

  const knowledgeCheckFeedback = useMemo(
    () =>
      current?.page.id
        ? isKnowledgeCheckQuestionPage(lessons, current.page.id)
        : false,
    [current?.page.id, lessons],
  );

  const hasFinalAssessment = useMemo(
    () => courseHasQuizResultsPage(lessons),
    [lessons],
  );

  const assessmentFullyLocked = useMemo(
    () => isFinalAssessmentLocked(courseId, assessmentAttemptsLimit),
    // assessmentLockTick intentionally triggers re-read after attempt updates
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version bump is the refresh signal
    [courseId, assessmentAttemptsLimit, assessmentLockTick],
  );

  const openModeComplete =
    navigationFlow === "open" &&
    allPagesVisited(requiredFlatIds, visited) &&
    (!hasFinalAssessment ||
      (finalQuizSnapshot !== null && finalQuizSnapshot.passed));

  const courseComplete =
    flatIds.length > 0 &&
    allPagesVisited(requiredFlatIds, visited) &&
    (!hasFinalAssessment ||
      (finalQuizSnapshot !== null && finalQuizSnapshot.passed));

  if (syncedAttemptsScope !== attemptsScope) {
    setSyncedAttemptsScope(attemptsScope);
    setCompletionEndedScope(null);
    const existing = readAttemptsState(courseId);
    if (isCourseLocked(existing, attemptsLimit)) {
      setAttempts(existing);
    } else {
      setAttempts(beginAttempt(courseId, attemptsLimit).state);
    }
  }

  if (
    courseComplete &&
    attempts?.active &&
    completionEndedScope !== attemptsScope
  ) {
    setCompletionEndedScope(attemptsScope);
    setAttempts(endAttempt(courseId));
  }

  const progressRestoringRef = useRef(true);

  useEffect(() => {
    progressRestoringRef.current = true;
    if (!flatIdsKey) {
      progressRestoringRef.current = false;
      return;
    }
    const ids = flatIdsKey.split("|").filter(Boolean);
    if (ids.length === 0) {
      progressRestoringRef.current = false;
      return;
    }

    queueMicrotask(() => {
      if (resumeFromUrl !== null) {
        const nextIndex = Math.min(resumeFromUrl, Math.max(0, ids.length - 1));
        setIndex(nextIndex);
        const currentPageId = flat[nextIndex]?.page.id;
        setVisited(currentPageId ? new Set([currentPageId]) : new Set());
        progressRestoringRef.current = false;
        return;
      }

      const stored = readPlayProgress(courseId, ids);
      const nextVisited = new Set(stored.visitedPageIds);
      const nextIndex = Math.min(stored.pageIndex, Math.max(0, ids.length - 1));
      const currentPageId = flat[nextIndex]?.page.id;
      if (currentPageId) nextVisited.add(currentPageId);
      setVisited(nextVisited);
      setIndex(nextIndex);
      progressRestoringRef.current = false;
    });
  }, [courseId, flatIdsKey, resumeFromUrl, flat]);

  const [syncedExpandedIndex, setSyncedExpandedIndex] = useState<number | null>(
    null,
  );
  if (syncedExpandedIndex !== clampedIndex) {
    setSyncedExpandedIndex(clampedIndex);
    const lid = flat[clampedIndex]?.lessonId;
    if (lid) {
      setExpandedLessonIds((prev) => new Set([...prev, lid]));
    }
  }

  useEffect(() => {
    function refresh() {
      setFinalQuizSnapshot(readFinalQuizResult(courseId));
    }
    window.addEventListener("cbl-final-quiz-updated", refresh);
    return () => window.removeEventListener("cbl-final-quiz-updated", refresh);
  }, [courseId]);

  useEffect(() => {
    const bump = () => setAssessmentLockTick((n) => n + 1);
    window.addEventListener("cbl-assessment-attempts-updated", bump);
    return () =>
      window.removeEventListener("cbl-assessment-attempts-updated", bump);
  }, []);

  const markPageVisited = useCallback((pageId: string | undefined) => {
    if (!pageId) return;
    setVisited((prev) => {
      if (prev.has(pageId)) return prev;
      return new Set([...prev, pageId]);
    });
  }, []);

  const visitedForNav = useMemo(() => {
    const set = new Set(visited);
    const cur = flat[clampedIndex]?.page.id;
    if (cur) set.add(cur);
    return set;
  }, [visited, flat, clampedIndex]);

  const canNavigateToIndex = useCallback(
    (targetIndex: number) => {
      const target = flat[targetIndex];
      if (
        target &&
        isCourseCompletionTemplate(target.page) &&
        !courseComplete
      ) {
        return false;
      }
      if (navigationFlow !== "linear") return true;
      return canNavigateToIndexLinear(flatIds, visitedForNav, targetIndex);
    },
    [navigationFlow, flatIds, visitedForNav, flat, courseComplete],
  );

  useLayoutEffect(() => {
    progressFlushRef.current = {
      pageIndex: clampedIndex,
      visitedIds: [...visited],
    };
  }, [clampedIndex, visited]);

  useEffect(() => {
    if (!flatIdsKey || progressRestoringRef.current) return;
    writePlayProgress(courseId, {
      pageIndex: clampedIndex,
      visitedPageIds: [...visited],
    });
  }, [courseId, clampedIndex, visited, flatIdsKey]);

  useEffect(() => {
    if (!flatIdsKey) return;
    function flush() {
      const { pageIndex, visitedIds } = progressFlushRef.current;
      writePlayProgress(courseId, {
        pageIndex,
        visitedPageIds: visitedIds,
      });
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [courseId, flatIdsKey]);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      if (!canNavigateToIndex(next)) return;
      setIndex(next);
      markPageVisited(flat[next]?.page.id);
    },
    [total, canNavigateToIndex, flat, markPageVisited],
  );

  const navigateToPageId = useCallback(
    (pageId: string) => {
      const idx = flatIndexByPageId.get(pageId);
      if (idx === undefined) return;
      if (!canNavigateToIndex(idx)) return;
      setIndex(idx);
      markPageVisited(pageId);
    },
    [flatIndexByPageId, canNavigateToIndex, markPageVisited],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = clampedIndex - 1;
        if (canNavigateToIndex(next)) go(next);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = clampedIndex + 1;
        if (canNavigateToIndex(next)) go(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, clampedIndex, canNavigateToIndex]);

  const toggleLesson = useCallback((lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }, []);

  const resolvedLaunchHref = launchHref ?? `/courses/${courseId}/play`;

  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl bg-white px-4 py-16 text-center">
        <p className="text-zinc-600">
          This course has no pages yet. Add lessons and pages in the builder to
          preview them here.
        </p>
        {hideAuthorLinks ? null : (
          <Link
            href={`/courses/${courseId}/builder`}
            className="mt-6 inline-block text-sm font-medium text-zinc-900 underline"
          >
            Open page builder
          </Link>
        )}
      </div>
    );
  }

  if (attempts && isCourseLocked(attempts, attemptsLimit)) {
    return (
      <CourseLocked
        courseId={courseId}
        courseTitle={courseTitle}
        attemptsLimit={attemptsLimit}
        attemptsUsed={attempts.used}
        themeColors={themeColors}
        launchHref={resolvedLaunchHref}
        hideAuthorLinks={hideAuthorLinks}
      />
    );
  }

  const lessonOrdinal = (current?.lessonIndex ?? 0) + 1;
  const currentLessonTitle = current?.lessonTitle ?? "Untitled lesson";
  const pagesInLesson =
    lessons[current?.lessonIndex ?? 0]?.pages.length ?? 0;
  const pageOrdinalInLesson = (current?.pageIndexInLesson ?? 0) + 1;
  const isLast = clampedIndex >= total - 1;

  return (
    <div
      className="flex min-h-[calc(100vh-3.5rem)] bg-zinc-100 dark:bg-zinc-900/80"
      style={{
        fontFamily: themeFonts.pageContent,
        fontSize: themeFonts.pageContentSize,
      }}
    >
      {customCss?.trim() ? (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      ) : null}
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0"
        }`}
      >
        <div className="h-full min-h-0 w-72 shrink-0">
          <CoursePlayerSidebar
            courseTitle={courseTitle}
            themeFonts={themeFonts}
            bannerUrl={bannerUrl}
            lessons={lessons}
            navigationFlow={navigationFlow}
            activeFlatIndex={clampedIndex}
            visitedPageIds={visited}
            accentColor={themeColors.highlight}
            expandedLessonIds={expandedLessonIds}
            onToggleLesson={toggleLesson}
            canNavigateToIndex={canNavigateToIndex}
            onSelectPage={(i) => {
              if (!canNavigateToIndex(i)) return;
              setIndex(i);
              markPageVisited(flat[i]?.page.id);
            }}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Hide course menu" : "Show course menu"}
            >
              <span className="flex flex-col gap-1" aria-hidden>
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Lesson {lessonOrdinal}: {currentLessonTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                Page {pageOrdinalInLesson} of {pagesInLesson} in this lesson
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {referenceMaterials.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setRefOpen(true)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  style={{ borderColor: themeColors.highlight }}
                >
                  Reference
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto bg-white px-5 py-6 sm:px-8 md:px-10 lg:px-14 xl:px-20">
          <div className="w-full min-w-0 flex-1">
            {current ? (
              <PageAudioHost
                src={resolvePageAudioSrc(
                  current.page.content,
                  signedImageUrls,
                )}
                pageKey={current.page.id}
                transcript={getPageAudioTranscript(current.page.content)}
                pageTitle={current.page.title}
                highlightColor={themeColors.highlight}
              >
                <header className="mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h1
                      className="min-w-0 flex-1 font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
                      style={{
                        fontFamily: themeFonts.pageTitle,
                        fontSize: themeFonts.pageTitleSize,
                      }}
                    >
                      {current.page.title}
                    </h1>
                    <PageAudioControls />
                  </div>
                  <div
                    className="mt-3 h-1 w-16 rounded-full"
                    style={{ backgroundColor: themeColors.highlight }}
                    aria-hidden
                  />
                </header>

                <div
                  style={{
                    fontFamily: themeFonts.pageContent,
                    fontSize: themeFonts.pageContentSize,
                  }}
                >
                  <TemplateRenderer
                    key={current.page.id}
                    content={current.page.content}
                    signedImageUrls={signedImageUrls}
                    courseId={courseId}
                    pageId={current.page.id}
                    passingScorePercent={passingScorePercent}
                    lessonAssessmentPageIds={lessonAssessmentPageIds}
                    isLastLessonInCourse={isLastLessonInCourse}
                    knowledgeCheckFeedback={knowledgeCheckFeedback}
                    assessmentAttemptsLimit={assessmentAttemptsLimit}
                    courseTitle={courseTitle}
                    learnerName={learnerName}
                    courseComplete={courseComplete}
                    hasFinalAssessment={hasFinalAssessment}
                    themeColors={themeColors}
                    onNavigateToPageId={navigateToPageId}
                  />
                </div>
              </PageAudioHost>
            ) : null}

            <div
              style={{
                fontFamily: themeFonts.pageContent,
                fontSize: themeFonts.pageContentSize,
              }}
            >

              <div className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-8">
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => go(clampedIndex + 1)}
                    disabled={!canNavigateToIndex(clampedIndex + 1)}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 enabled:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[200px]"
                    style={{ backgroundColor: themeColors.button }}
                  >
                    Continue
                  </button>
                ) : navigationFlow === "open" && !openModeComplete ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    {!allPagesVisited(requiredFlatIds, visited) ? (
                      <p>
                        Visit every page in the outline to complete this course.
                      </p>
                    ) : hasFinalAssessment &&
                      finalQuizSnapshot &&
                      !finalQuizSnapshot.passed ? (
                      <p>
                        {assessmentFullyLocked
                          ? "Your score did not meet the passing threshold, and you have no remaining assessment attempts."
                          : "Your score did not meet the passing threshold. Review the material and use Retake assessment on the quiz results page if you need another attempt."}
                      </p>
                    ) : (
                      <p>
                        Complete the final assessment (and meet the passing
                        score) to finish this course.
                      </p>
                    )}
                  </div>
                ) : (
                  attemptsLimit === 1 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      This course allows one attempt only. Course home is
                      disabled on the last page.
                    </p>
                  ) : (
                    <Link
                      href={resolvedLaunchHref}
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[200px]"
                      style={{ backgroundColor: themeColors.button }}
                    >
                      Back to course home
                    </Link>
                  )
                )}
                <p className="text-xs text-zinc-500">
                  Keyboard: ← → to move between pages
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 text-sm text-zinc-600">
              {!(attemptsLimit === 1 && isLast) ? (
                <Link
                  href={resolvedLaunchHref}
                  className="hover:text-zinc-900"
                >
                  Course home
                </Link>
              ) : null}
              {hideAuthorLinks ? null : (
                <>
                  <Link
                    href={`/courses/${courseId}`}
                    className="hover:text-zinc-900"
                  >
                    Settings
                  </Link>
                  <Link
                    href={`/courses/${courseId}/builder`}
                    className="hover:text-zinc-900"
                  >
                    Builder
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {refOpen && referenceMaterials.length > 0 ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-20 sm:justify-end sm:pt-24">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close reference panel"
            onClick={() => setRefOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
            role="dialog"
            aria-labelledby="ref-dialog-title"
          >
            <div className="flex items-start justify-between gap-2">
              <h2
                id="ref-dialog-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Reference materials
              </h2>
              <button
                type="button"
                onClick={() => setRefOpen(false)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {referenceMaterials.map((m) => (
                <li key={m.id}>
                  <a
                    href={m.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline-offset-4 hover:underline"
                    style={{ color: themeColors.highlight }}
                  >
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
