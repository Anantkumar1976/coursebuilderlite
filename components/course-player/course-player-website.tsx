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
import {
  allPagesVisited,
  courseHasQuizResultsPage,
  isCourseCompletionTemplate,
} from "@/lib/course-player/course-completion";
import { readFinalQuizResult } from "@/lib/course-player/final-quiz-result";
import {
  readPlayProgress,
  writePlayProgress,
} from "@/lib/course-player/progress";
import type { LessonNav, PlayerPage } from "@/lib/course-player/types";
import { getPageAudioTranscript, resolvePageAudioSrc } from "@/lib/page-builder";

import { CourseLocked } from "./course-locked";
import { CoursePlayerSidebar } from "./course-player-sidebar";
import { PageAudioControls, PageAudioHost } from "./page-audio-host";
import { isKnowledgeCheckQuestionPage } from "@/lib/course-player/final-assessment-lesson";
import { TemplateRenderer } from "./template-renderer";

type ReferenceItem = {
  id: string;
  label: string;
  downloadUrl: string;
};

type FlatItem = {
  lessonIndex: number;
  lessonId: string;
  pageIndexInLesson: number;
  lessonTitle: string;
  page: PlayerPage;
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
  resumeFromUrl: number | null;
  passingScorePercent: number;
  attemptsLimit: number | null;
  assessmentAttemptsLimit: number | null;
  learnerName: string;
  customCss?: string | null;
  /** Override the manual home route (e.g. `/demo/{id}`). */
  launchHref?: string;
  /** Hide author-only UI (Settings, Builder) — used on public demo pages. */
  hideAuthorLinks?: boolean;
};

export function CoursePlayerWebsite({
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
  attemptsLimit,
  assessmentAttemptsLimit,
  learnerName,
  customCss,
  launchHref,
  hideAuthorLinks = false,
}: Props) {
  const flat = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
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

  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [activeFlatIndex, setActiveFlatIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refOpen, setRefOpen] = useState(false);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(
    () => new Set(lessons.map((l) => l.id)),
  );
  const progressFlushRef = useRef({
    pageIndex: 0,
    visitedIds: [] as string[],
  });
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
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
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);

  const hasFinalAssessment = useMemo(
    () => courseHasQuizResultsPage(lessons),
    [lessons],
  );

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
      const stored = readPlayProgress(courseId, ids);
      let idx = Math.min(stored.pageIndex, Math.max(0, ids.length - 1));
      if (resumeFromUrl !== null) {
        idx = Math.min(resumeFromUrl, Math.max(0, ids.length - 1));
      }
      setVisited(new Set(stored.visitedPageIds));
      setActiveFlatIndex(idx);
      setScrollTarget(idx);
      progressRestoringRef.current = false;
    });
  }, [courseId, flatIdsKey, resumeFromUrl]);

  useEffect(() => {
    function refresh() {
      setFinalQuizSnapshot(readFinalQuizResult(courseId));
    }
    window.addEventListener("cbl-final-quiz-updated", refresh);
    return () => window.removeEventListener("cbl-final-quiz-updated", refresh);
  }, [courseId]);

  const runScrollSync = useCallback(() => {
    const root = scrollRootRef.current;
    if (!root || total === 0) return;
    if (root.clientHeight < 4) return;

    const rootRect = root.getBoundingClientRect();
    const visibleIds: string[] = [];

    for (let i = 0; i < flat.length; i += 1) {
      const item = flat[i];
      if (isCourseCompletionTemplate(item.page) && !courseComplete) {
        continue;
      }
      const el = document.getElementById(`cbl-section-${i}`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > rootRect.top + 2 && r.top < rootRect.bottom - 2) {
        visibleIds.push(item.page.id);
      }
    }
    if (visibleIds.length > 0) {
      setVisited((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.add(id);
        return next;
      });
    }
  }, [flat, total, courseComplete]);

  const runScrollSyncRef = useRef(runScrollSync);

  useLayoutEffect(() => {
    runScrollSyncRef.current = runScrollSync;
  });

  useLayoutEffect(() => {
    if (scrollTarget === null) return;
    const idx = scrollTarget;
    requestAnimationFrame(() => {
      document
        .getElementById(`cbl-section-${idx}`)
        ?.scrollIntoView({ behavior: "auto" });
      requestAnimationFrame(() => {
        runScrollSyncRef.current();
      });
    });
  }, [scrollTarget]);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || total === 0) return;

    let rafId = 0;

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        runScrollSyncRef.current();
      });
    };

    root.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const vv = window.visualViewport;
    vv?.addEventListener("scroll", schedule);
    vv?.addEventListener("resize", schedule);
    const ro = new ResizeObserver(() => schedule());
    ro.observe(root);
    schedule();
    return () => {
      root.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      vv?.removeEventListener("resize", schedule);
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [flatIdsKey, total, courseComplete]);

  useLayoutEffect(() => {
    progressFlushRef.current = {
      pageIndex: activeFlatIndex,
      visitedIds: [...visited],
    };
  }, [activeFlatIndex, visited]);

  useEffect(() => {
    if (!flatIdsKey || progressRestoringRef.current) return;
    writePlayProgress(courseId, {
      pageIndex: activeFlatIndex,
      visitedPageIds: [...visited],
    });
  }, [courseId, activeFlatIndex, visited, flatIdsKey]);

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

  const toggleLesson = useCallback((lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }, []);

  const scrollToSection = useCallback((flatIdx: number) => {
    const target = flat[flatIdx];
    if (target && isCourseCompletionTemplate(target.page) && !courseComplete) {
      return;
    }
    const el = document.getElementById(`cbl-section-${flatIdx}`);
    if (!el) return;

    setActiveFlatIndex(flatIdx);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [flat, courseComplete]);

  const navigateToPageId = useCallback(
    (pageId: string) => {
      const idx = flatIndexByPageId.get(pageId);
      if (idx === undefined) return;
      scrollToSection(idx);
    },
    [flatIndexByPageId, scrollToSection],
  );

  const resolvedLaunchHref = launchHref ?? `/courses/${courseId}/play`;

  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl bg-white px-4 py-16 text-center">
        <p className="text-zinc-600">
          This manual has no topics yet. Add sections and topics in the builder
          to preview them here.
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

  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] min-h-0 max-h-[calc(100vh-3.5rem)] bg-zinc-100 dark:bg-zinc-900/80"
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
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-0 lg:z-20 lg:h-[calc(100vh-3.5rem)] ${
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
            navigationFlow="website"
            activeFlatIndex={activeFlatIndex}
            visitedPageIds={visited}
            accentColor={themeColors.highlight}
            expandedLessonIds={expandedLessonIds}
            onToggleLesson={toggleLesson}
            onSelectPage={scrollToSection}
            canNavigateToIndex={() => true}
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Hide contents" : "Show contents"}
            >
              <span className="flex flex-col gap-1" aria-hidden>
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>

            <div className="min-w-0 flex-1" />

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

        <div
          ref={scrollRootRef}
          data-cbl-website-scroll-root
          className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-5 py-6 sm:px-8 md:px-10 lg:px-14 xl:px-20"
        >
          <div className="w-full min-w-0 flex-1 space-y-16 pb-24">
            {flat.map((item, i) => {
              if (isCourseCompletionTemplate(item.page) && !courseComplete) {
                return null;
              }
              const lesson = lessons[item.lessonIndex];
              const lessonAssessmentPageIds = lesson
                ? lesson.pages
                    .filter((p) =>
                      ["mcq", "mrq", "true_false"].includes(p.content.template),
                    )
                    .map((p) => p.id)
                : [];
              const isLastLessonInCourse = item.lessonIndex === lessons.length - 1;
              const knowledgeCheckFeedback = isKnowledgeCheckQuestionPage(
                lessons,
                item.page.id,
              );
              const pageAudioSrc = resolvePageAudioSrc(
                item.page.content,
                signedImageUrls,
              );

              return (
                <section
                  key={item.page.id}
                  id={`cbl-section-${i}`}
                  data-page-id={item.page.id}
                  data-flat-index={i}
                  className="scroll-mt-24 border-b border-zinc-100 pb-16 last:border-b-0 dark:border-zinc-800"
                >
                  <PageAudioHost
                    src={pageAudioSrc}
                    pageKey={item.page.id}
                    playWhenVisible
                    transcript={getPageAudioTranscript(item.page.content)}
                    pageTitle={item.page.title}
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
                          {item.page.title}
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
                        content={item.page.content}
                        signedImageUrls={signedImageUrls}
                        courseId={courseId}
                        pageId={item.page.id}
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
                </section>
              );
            })}

            <div className="flex flex-wrap gap-4 border-t border-zinc-200 pt-8 text-sm text-zinc-600">
              {!(attemptsLimit === 1 && courseComplete) ? (
                <Link
                  href={resolvedLaunchHref}
                  className="hover:text-zinc-900"
                >
                  Manual home
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
            aria-labelledby="ref-dialog-title-w"
          >
            <div className="flex items-start justify-between gap-2">
              <h2
                id="ref-dialog-title-w"
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
