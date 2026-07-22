"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createLesson,
  deleteLesson,
  reorderLessons,
  saveLessonTitle,
} from "@/lib/actions/lesson";
import {
  createPage,
  deletePage,
  reorderPages,
  savePage,
} from "@/lib/actions/page";
import type { CourseAssetLite } from "@/components/media/text-image-media";
import {
  ADD_PAGE_TEMPLATE_OPTIONS,
  parseAddPageTemplateValue,
  templateDisplayLabel,
  type PageContentV1,
} from "@/lib/page-builder";
import { isKnowledgeCheckQuestionPage } from "@/lib/course-player/final-assessment-lesson";

import { ContentEditor } from "./content-editor";

export type BuilderPageRow = {
  id: string;
  title: string;
  sort_order: number;
  content: PageContentV1;
};

export type BuilderLesson = {
  id: string;
  title: string;
  sort_order: number;
  pages: BuilderPageRow[];
};

type Props = {
  courseId: string;
  courseTitle: string;
  initialLessons: BuilderLesson[];
  initialAssets: CourseAssetLite[];
};

export function PageBuilder({
  courseId,
  courseTitle,
  initialLessons,
  initialAssets,
}: Props) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLessons[0]?.pages[0]?.id ?? null,
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState<PageContentV1 | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingAddPageValue, setPendingAddPageValue] = useState(
    ADD_PAGE_TEMPLATE_OPTIONS[0]?.value ?? "text",
  );
  const [creatingPage, setCreatingPage] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(
    () => new Set(initialLessons.map((l) => l.id)),
  );

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  const orderedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.sort_order - b.sort_order),
    [lessons],
  );

  const flatPages = useMemo(() => {
    const out: BuilderPageRow[] = [];
    for (const l of orderedLessons) {
      out.push(...[...l.pages].sort((a, b) => a.sort_order - b.sort_order));
    }
    return out;
  }, [orderedLessons]);

  useEffect(() => {
    if (
      selectedId &&
      !flatPages.some((p) => p.id === selectedId)
    ) {
      setSelectedId(flatPages[0]?.id ?? null);
    }
  }, [flatPages, selectedId]);

  const selected = useMemo(
    () => flatPages.find((p) => p.id === selectedId) ?? null,
    [flatPages, selectedId],
  );

  const showQuestionFeedbackEditor = useMemo(
    () =>
      selectedId
        ? isKnowledgeCheckQuestionPage(orderedLessons, selectedId)
        : false,
    [orderedLessons, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setTitleDraft("");
      setContentDraft(null);
      return;
    }
    const page = flatPages.find((p) => p.id === selectedId);
    if (!page) return;
    setTitleDraft(page.title);
    setContentDraft(page.content);
    // Only re-load editor state when switching pages — not after router.refresh().
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: ignore flatPages updates for same page
  }, [selectedId]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleAssetsUpdated = useCallback(
    (added?: CourseAssetLite) => {
      if (added) {
        setAssets((prev) =>
          prev.some((a) => a.id === added.id) ? prev : [added, ...prev],
        );
        return;
      }
      refresh();
    },
    [refresh],
  );

  const toggleLessonExpanded = useCallback((lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }, []);

  async function handleSave() {
    if (!selectedId || !contentDraft) return;
    setSaving(true);
    setSaveError(null);
    const res = await savePage(courseId, selectedId, {
      title: titleDraft,
      content: contentDraft,
    });
    setSaving(false);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    refresh();
  }

  async function handleMovePage(lessonId: string, index: number, delta: -1 | 1) {
    const lesson = orderedLessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const ordered = [...lesson.pages].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const next = ordered.map((p) => p.id);
    const j = index + delta;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    const res = await reorderPages(courseId, lessonId, next);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    refresh();
  }

  async function handleMoveLesson(lessonIndex: number, delta: -1 | 1) {
    const ids = orderedLessons.map((l) => l.id);
    const j = lessonIndex + delta;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[lessonIndex], next[j]] = [next[j], next[lessonIndex]];
    const res = await reorderLessons(courseId, next);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    refresh();
  }

  async function handleAddPage(lessonId: string) {
    setCreatingPage(true);
    setSaveError(null);
    const { template, textImageLayout, textVideoLayout } =
      parseAddPageTemplateValue(pendingAddPageValue);
    const res = await createPage(
      courseId,
      template,
      lessonId,
      textImageLayout,
      textVideoLayout,
    );
    setCreatingPage(false);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    if ("id" in res && res.id) {
      setSelectedId(res.id);
      setExpandedLessonIds((prev) => new Set([...prev, lessonId]));
    }
    refresh();
  }

  async function handleAddLesson() {
    setCreatingLesson(true);
    setSaveError(null);
    const res = await createLesson(courseId);
    setCreatingLesson(false);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    if ("id" in res && res.id) {
      setExpandedLessonIds((prev) => new Set([...prev, res.id]));
    }
    refresh();
  }

  async function handleLessonTitleBlur(lessonId: string, title: string) {
    const res = await saveLessonTitle(courseId, lessonId, title);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    refresh();
  }

  async function handleDeleteLesson(lessonId: string, lessonTitle: string) {
    if (
      !confirm(
        `Delete lesson "${lessonTitle}" and all pages inside? This cannot be undone.`,
      )
    ) {
      return;
    }
    const res = await deleteLesson(courseId, lessonId);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    if (selectedId) {
      const still = flatPages.some((p) => p.id === selectedId);
      if (!still) setSelectedId(null);
    }
    setSaveError(null);
    refresh();
  }

  async function handleDelete() {
    if (!selectedId || !confirm("Delete this page?")) return;
    const res = await deletePage(courseId, selectedId);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    setSelectedId(null);
    setSaveError(null);
    refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Structure
            </p>
            <button
              type="button"
              disabled={creatingLesson}
              onClick={() => void handleAddLesson()}
              className="rounded-lg bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {creatingLesson ? "…" : "+ Lesson"}
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Add lessons, then pages under each lesson. Order with ↑ ↓.
          </p>
        </div>
        <nav
          className="max-h-[50vh] overflow-y-auto p-2 lg:max-h-none"
          aria-label="Lessons and pages"
        >
          {orderedLessons.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-zinc-500">
              No lessons yet. Click &quot;+ Lesson&quot;, then add pages.
            </p>
          ) : (
            <ul className="space-y-3">
              {orderedLessons.map((lesson, li) => {
                const pagesOrdered = [...lesson.pages].sort(
                  (a, b) => a.sort_order - b.sort_order,
                );
                const expanded = expandedLessonIds.has(lesson.id);
                return (
                  <li
                    key={lesson.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-stretch gap-1 border-b border-zinc-100 bg-zinc-50/80 px-1 py-1 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <div className="flex flex-col justify-center gap-0.5 border-r border-zinc-200 pr-1 dark:border-zinc-700">
                        <button
                          type="button"
                          className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                          disabled={li === 0}
                          onClick={() => void handleMoveLesson(li, -1)}
                          aria-label="Move lesson up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                          disabled={li === orderedLessons.length - 1}
                          onClick={() => void handleMoveLesson(li, 1)}
                          aria-label="Move lesson down"
                        >
                          ↓
                        </button>
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <input
                          type="text"
                          defaultValue={lesson.title}
                          key={`${lesson.id}-${lesson.title}`}
                          onBlur={(e) =>
                            void handleLessonTitleBlur(lesson.id, e.target.value)
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-zinc-900 hover:border-zinc-200 focus:border-zinc-400 focus:outline-none dark:text-zinc-50 dark:hover:border-zinc-600"
                          aria-label="Lesson title"
                        />
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLessonExpanded(lesson.id)}
                            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                          >
                            {expanded ? "▾ Hide pages" : "▸ Show pages"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteLesson(lesson.id, lesson.title)}
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete lesson
                          </button>
                        </div>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="p-2">
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={pendingAddPageValue}
                            onChange={(e) =>
                              setPendingAddPageValue(e.target.value)
                            }
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            aria-label="Template for new page"
                          >
                            {ADD_PAGE_TEMPLATE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={creatingPage}
                            onClick={() => void handleAddPage(lesson.id)}
                            className="rounded-lg bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            {creatingPage ? "…" : "Add page"}
                          </button>
                        </div>
                        {pagesOrdered.length === 0 ? (
                          <p className="py-2 text-center text-xs text-zinc-500">
                            No pages in this lesson yet.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {pagesOrdered.map((p, index) => (
                              <li key={p.id}>
                                <div className="flex items-stretch gap-1">
                                  <div className="flex flex-col justify-center gap-0.5 border-r border-zinc-200 pr-1 dark:border-zinc-800">
                                    <button
                                      type="button"
                                      className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                      disabled={index === 0}
                                      onClick={() =>
                                        void handleMovePage(lesson.id, index, -1)
                                      }
                                      aria-label="Move page up"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                      disabled={index === pagesOrdered.length - 1}
                                      onClick={() =>
                                        void handleMovePage(lesson.id, index, 1)
                                      }
                                      aria-label="Move page down"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedId(p.id)}
                                    className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                                      selectedId === p.id
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                        : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    }`}
                                  >
                                    <span className="block truncate font-medium">
                                      {p.title}
                                    </span>
                                    <span
                                      className={`mt-0.5 block truncate text-xs ${
                                        selectedId === p.id
                                          ? "text-zinc-300 dark:text-zinc-600"
                                          : "text-zinc-500"
                                      }`}
                                    >
                                      {templateDisplayLabel(p.content)}
                                    </span>
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {courseTitle}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Lessons contain pages. Choose a page to edit content.
          </p>
        </header>

        {selected && contentDraft ? (
          <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="page-title"
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Page title
                </label>
                <input
                  id="page-title"
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="mt-1 w-full max-w-xl rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? "Saving…" : "Save page"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            </div>
            {saveError ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {saveError}
              </p>
            ) : null}
            <ContentEditor
              key={selectedId}
              content={contentDraft}
              onChange={(next) => {
                setContentDraft((prev) => {
                  if (!prev) return prev;
                  return typeof next === "function" ? next(prev) : next;
                });
              }}
              courseId={courseId}
              courseAssets={assets}
              availablePages={flatPages.map((p) => ({
                id: p.id,
                title: p.title || "Untitled page",
              }))}
              onAssetsUpdated={handleAssetsUpdated}
              showQuestionFeedbackEditor={showQuestionFeedbackEditor}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">
            {orderedLessons.length === 0
              ? "Add a lesson first, then add pages."
              : "Select a page from the list or add a new page to a lesson."}
          </div>
        )}
      </div>
    </div>
  );
}
