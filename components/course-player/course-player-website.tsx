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

import { CourseLocked } from "./course-locked";
import { CoursePlayerSidebar } from "./course-player-sidebar";
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
  const [finalQuizSnapshot, setFinalQuizSnapshot] = useState<
    ReturnType<typeof readFinalQuizResult>
  >(null);
  const [attempts, setAttempts] = useState<AttemptsState | null>(null);

  const totalLessons = lessons.length;

  const hasFinalAssessment = useMemo(
    () => courseHasQuizResultsPage(lessons),
    [lessons],
  );

  const courseComplete =
    flatIds.length > 0 &&
    allPagesVisited(requiredFlatIds, visited) &&
    (!hasFinalAssessment ||
      (finalQuizSnapshot !== null && finalQuizSnapshot.passed));

  useEffect(() => {
    function refresh() {
      setFinalQuizSnapshot(readFinalQuizResult(courseId));
    }
    refresh();
    window.addEventListener("cbl-final-quiz-updated", refresh);
    return () => window.removeEventListener("cbl-final-quiz-updated", refresh);
  }, [courseId]);

  useEffect(() => {
    const existing = readAttemptsState(courseId);
    if (isCourseLocked(existing, attemptsLimit)) {
      setAttempts(existing);
      return;
    }
    const { state } = beginAttempt(courseId, attemptsLimit);
    setAttempts(state);
  }, [courseId, attemptsLimit]);

  useEffect(() => {
    if (!courseComplete) return;
    if (!attempts?.active) return;
    const next = endAttempt(courseId);
    setAttempts(next);
  }, [courseComplete, courseId, attempts?.active]);

  useLayoutEffect(() => {
    if (!flatIdsKey) return;
    const ids = flatIdsKey.split("|").filter(Boolean);
    if (ids.length === 0) return;
    const stored = readPlayProgress(courseId, ids);
    setVisited(new Set(stored.visitedPageIds));
    let idx = Math.min(stored.pageIndex, Math.max(0, ids.length - 1));
    if (resumeFromUrl !== null) {
      idx = Math.min(resumeFromUrl, Math.max(0, ids.length - 1));
    }
    setActiveFlatIndex(idx);
    requestAnimationFrame(() => {
      document
        .getElementById(`cbl-section-${idx}`)
        ?.scrollIntoView({ behavior: "auto" });
    });
  }, [courseId, flatIdsKey, resumeFromUrl]);

  useEffect(() => {
    const root = document.querySelector(
      "[data-cbl-website-scroll-root]",
    ) as HTMLElement | null;
    if (!root || total === 0) return;

    const sections = flatIds.map(
      (_, i) => document.getElementById(`cbl-section-${i}`) as HTMLElement | null,
    );

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sid = entry.target.getAttribute("data-page-id");
          if (sid) {
            setVisited((prev) => new Set([...prev, sid]));
          }
          const idxAttr = entry.target.getAttribute("data-flat-index");
          if (idxAttr !== null) {
            const n = parseInt(idxAttr, 10);
            if (!Number.isNaN(n)) setActiveFlatIndex(n);
          }
        });
      },
      { root, rootMargin: "-40% 0px -45% 0px", threshold: 0 },
    );

    sections.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [flatIds, flatIdsKey, total]);

  useLayoutEffect(() => {
    progressFlushRef.current = {
      pageIndex: activeFlatIndex,
      visitedIds: [...visited],
    };
  }, [activeFlatIndex, visited]);

  useEffect(() => {
    if (!flatIdsKey) return;
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
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [flat, courseComplete]);

  const navigateToPageId = useCallback(
    (pageId: string) => {
      const idx = flatIndexByPageId.get(pageId);
      if (idx === undefined) return;
      scrollToSection(idx);
    },
    [flatIndexByPageId, scrollToSection],
  );

  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl bg-white px-4 py-16 text-center">
        <p className="text-zinc-600">
          This course has no pages yet. Add lessons and pages in the builder to
          preview them here.
        </p>
        <Link
          href={`/courses/${courseId}/builder`}
          className="mt-6 inline-block text-sm font-medium text-zinc-900 underline"
        >
          Open page builder
        </Link>
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
      />
    );
  }

  const current = flat[activeFlatIndex];
  const lessonOrdinal = (current?.lessonIndex ?? 0) + 1;
  const pagesInLesson =
    lessons[current?.lessonIndex ?? 0]?.pages.length ?? 0;
  const pageOrdinalInLesson = (current?.pageIndexInLesson ?? 0) + 1;

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
                Lesson {lessonOrdinal} of {totalLessons}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                Section {pageOrdinalInLesson} of {pagesInLesson} (scroll to read)
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

        <div
          data-cbl-website-scroll-root
          className="flex flex-1 flex-col overflow-y-auto bg-white px-5 py-6 sm:px-8 md:px-10 lg:px-14 xl:px-20"
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

              return (
                <section
                  key={item.page.id}
                  id={`cbl-section-${i}`}
                  data-page-id={item.page.id}
                  data-flat-index={i}
                  className="scroll-mt-24 border-b border-zinc-100 pb-16 last:border-b-0 dark:border-zinc-800"
                >
                  <header className="mb-6">
                    <h1
                      className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
                      style={{
                        fontFamily: themeFonts.pageTitle,
                        fontSize: themeFonts.pageTitleSize,
                      }}
                    >
                      {item.page.title}
                    </h1>
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
                      assessmentAttemptsLimit={assessmentAttemptsLimit}
                      courseTitle={courseTitle}
                      learnerName={learnerName}
                      courseComplete={courseComplete}
                      hasFinalAssessment={hasFinalAssessment}
                      themeColors={themeColors}
                      onNavigateToPageId={navigateToPageId}
                    />
                  </div>
                </section>
              );
            })}

            <div className="flex flex-wrap gap-4 border-t border-zinc-200 pt-8 text-sm text-zinc-600">
              {!(attemptsLimit === 1 && courseComplete) ? (
                <Link
                  href={`/courses/${courseId}/play`}
                  className="hover:text-zinc-900"
                >
                  Course home
                </Link>
              ) : null}
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
