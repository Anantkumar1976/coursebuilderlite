"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createLesson,
  deleteLesson,
  reorderLessons,
  restoreLesson,
  saveLessonTitle,
} from "@/lib/actions/lesson";
import {
  createPage,
  deletePage,
  duplicatePage,
  restorePage,
  savePage,
  setLessonPageLayout,
} from "@/lib/actions/page";
import type { CourseAssetLite } from "@/components/media/text-image-media";
import { parseAddPageTemplateValue, type PageContentV1 } from "@/lib/page-builder";
import { isKnowledgeCheckQuestionPage } from "@/lib/course-player/final-assessment-lesson";

import { UndoToast, UnsavedChangesDialog } from "./builder-feedback";
import { EyeIcon, PlusIcon } from "./builder-icons";
import { ContentEditor } from "./content-editor";
import { StructureSidebar, type StructureChange } from "./structure-sidebar";
import { TemplatePickerDialog } from "./template-picker-dialog";

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

type PickerTarget = {
  /** null when the course has no lessons yet (server creates one). */
  lessonId: string | null;
  afterPageId: string | null;
};

type UndoEntry = {
  message: string;
  restore: () => Promise<{ error?: string }>;
  expandLessonId: string;
  selectPageId?: string;
};

const UNDO_TIMEOUT_MS = 7000;

function lessonOfPage(lessons: BuilderLesson[], pageId: string) {
  return lessons.find((l) => l.pages.some((p) => p.id === pageId)) ?? null;
}

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
  const [loadedPageId, setLoadedPageId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState<PageContentV1 | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creatingPage, setCreatingPage] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [structureSaving, setStructureSaving] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => unknown) | null>(null);
  const [undo, setUndo] = useState<UndoEntry | null>(null);
  const [undoing, setUndoing] = useState(false);

  const collapsedStorageKey = `cbl:builder:collapsed-lessons:${courseId}`;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [collapseHydrated, setCollapseHydrated] = useState(false);

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  // Read saved collapse state after mount so SSR markup matches the first render.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(collapsedStorageKey);
      const ids = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(ids)) {
        setCollapsedIds(new Set(ids.filter((v): v is string => typeof v === "string")));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setCollapseHydrated(true);
  }, [collapsedStorageKey]);

  useEffect(() => {
    if (!collapseHydrated) return;
    try {
      localStorage.setItem(collapsedStorageKey, JSON.stringify([...collapsedIds]));
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsedIds, collapseHydrated, collapsedStorageKey]);

  const orderedLessons = useMemo(
    () =>
      [...lessons]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({
          ...l,
          pages: [...l.pages].sort((a, b) => a.sort_order - b.sort_order),
        })),
    [lessons],
  );

  const flatPages = useMemo(
    () => orderedLessons.flatMap((l) => l.pages),
    [orderedLessons],
  );

  const expandedLessonIds = useMemo(
    () => new Set(orderedLessons.filter((l) => !collapsedIds.has(l.id)).map((l) => l.id)),
    [orderedLessons, collapsedIds],
  );
  const allCollapsed =
    orderedLessons.length > 0 && orderedLessons.every((l) => collapsedIds.has(l.id));

  // If the selected page disappears (deleted elsewhere), fall back to the first page.
  // A page that was never present yet (just created) is left selected until it arrives.
  const knownPageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ids = new Set(flatPages.map((p) => p.id));
    if (selectedId && !ids.has(selectedId) && knownPageIdsRef.current.has(selectedId)) {
      setSelectedId(flatPages[0]?.id ?? null);
    }
    knownPageIdsRef.current = ids;
  }, [flatPages, selectedId]);

  // Load editor drafts when switching pages — not after router.refresh() of the same page.
  useEffect(() => {
    if (!selectedId) {
      setTitleDraft("");
      setContentDraft(null);
      setLoadedPageId(null);
      setIsDirty(false);
      return;
    }
    if (selectedId === loadedPageId) return;
    const page = flatPages.find((p) => p.id === selectedId);
    if (!page) return;
    setTitleDraft(page.title);
    setContentDraft(page.content);
    setLoadedPageId(page.id);
    setIsDirty(false);
  }, [selectedId, loadedPageId, flatPages]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), UNDO_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [undo]);

  const selected = useMemo(
    () => (loadedPageId === selectedId ? flatPages.find((p) => p.id === selectedId) : null) ?? null,
    [flatPages, selectedId, loadedPageId],
  );
  const selectedIndex = selected ? flatPages.findIndex((p) => p.id === selected.id) : -1;

  const showQuestionFeedbackEditor = useMemo(
    () =>
      selectedId
        ? isKnowledgeCheckQuestionPage(orderedLessons, selectedId)
        : false,
    [orderedLessons, selectedId],
  );

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

  const expandLesson = useCallback((lessonId: string) => {
    setCollapsedIds((prev) => {
      if (!prev.has(lessonId)) return prev;
      const next = new Set(prev);
      next.delete(lessonId);
      return next;
    });
  }, []);

  const toggleLessonExpanded = useCallback((lessonId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }, []);

  function setAllCollapsed(collapse: boolean) {
    setCollapsedIds(collapse ? new Set(orderedLessons.map((l) => l.id)) : new Set());
  }

  /** Runs `action` now, or after the author saves/discards unsaved edits. */
  function runGuarded(action: () => unknown) {
    if (isDirty) {
      setPendingAction(() => action);
      return;
    }
    void action();
  }

  async function handleSave(): Promise<boolean> {
    if (!selectedId || !contentDraft) return false;
    setSaving(true);
    setSaveError(null);
    const res = await savePage(courseId, selectedId, {
      title: titleDraft,
      content: contentDraft,
    });
    setSaving(false);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return false;
    }
    setIsDirty(false);
    refresh();
    return true;
  }

  async function handleGuardSave() {
    const action = pendingAction;
    if (!(await handleSave())) return;
    setPendingAction(null);
    void action?.();
  }

  function handleGuardDiscard() {
    const action = pendingAction;
    if (selected) {
      setTitleDraft(selected.title);
      setContentDraft(selected.content);
    }
    setIsDirty(false);
    setPendingAction(null);
    void action?.();
  }

  function handleSelectPage(pageId: string) {
    if (pageId === selectedId) return;
    runGuarded(() => setSelectedId(pageId));
  }

  function openAddPage(lessonId: string | null) {
    const selectedLesson = selectedId ? lessonOfPage(orderedLessons, selectedId) : null;
    const targetLessonId =
      lessonId ?? selectedLesson?.id ?? orderedLessons.at(-1)?.id ?? null;
    setPickerTarget({
      lessonId: targetLessonId,
      afterPageId:
        selectedId && selectedLesson && selectedLesson.id === targetLessonId
          ? selectedId
          : null,
    });
  }

  const pickerPlacementLabel = useMemo(() => {
    if (!pickerTarget) return "";
    if (pickerTarget.afterPageId) {
      const page = flatPages.find((p) => p.id === pickerTarget.afterPageId);
      return `Adds below “${page?.title || "Untitled page"}”`;
    }
    const lesson = orderedLessons.find((l) => l.id === pickerTarget.lessonId);
    return lesson
      ? `Adds to the end of “${lesson.title || "Untitled lesson"}”`
      : "Adds a new lesson with this page";
  }, [pickerTarget, flatPages, orderedLessons]);

  const closePicker = useCallback(() => setPickerTarget(null), []);

  function handlePickTemplate(value: string) {
    const target = pickerTarget;
    setPickerTarget(null);
    if (!target) return;
    runGuarded(async () => {
      setCreatingPage(true);
      setSaveError(null);
      const { template, textImageLayout, textVideoLayout } = parseAddPageTemplateValue(value);
      const res = await createPage(
        courseId,
        template,
        target.lessonId ?? undefined,
        textImageLayout,
        textVideoLayout,
        target.afterPageId,
      );
      setCreatingPage(false);
      if ("error" in res && res.error) {
        setSaveError(res.error);
        if (!("id" in res)) return;
      }
      if ("id" in res && res.id) {
        setSelectedId(res.id);
        expandLesson(res.lessonId);
      }
      refresh();
    });
  }

  function handleDuplicatePage(pageId: string) {
    runGuarded(async () => {
      setSaveError(null);
      const res = await duplicatePage(courseId, pageId);
      if ("error" in res && res.error && !("id" in res)) {
        setSaveError(res.error);
        return;
      }
      if ("error" in res && res.error) setSaveError(res.error);
      if ("id" in res && res.id) {
        setSelectedId(res.id);
        expandLesson(res.lessonId);
      }
      refresh();
    });
  }

  async function handleDeletePage(pageId: string) {
    const page = flatPages.find((p) => p.id === pageId);
    if (!page) return;
    const prevLessons = lessons;
    const prevSelected = selectedId;
    if (selectedId === pageId) {
      const i = flatPages.findIndex((p) => p.id === pageId);
      setSelectedId(flatPages[i + 1]?.id ?? flatPages[i - 1]?.id ?? null);
    }
    setLessons((ls) =>
      ls.map((l) => ({ ...l, pages: l.pages.filter((p) => p.id !== pageId) })),
    );
    setSaveError(null);

    const res = await deletePage(courseId, pageId);
    if ("error" in res && res.error) {
      setLessons(prevLessons);
      setSelectedId(prevSelected);
      setSaveError(res.error);
      return;
    }
    if ("snapshot" in res && res.snapshot) {
      const snapshot = res.snapshot;
      setUndo({
        message: `Deleted “${page.title || "Untitled page"}”`,
        restore: () => restorePage(courseId, snapshot),
        expandLessonId: snapshot.lesson_id,
        selectPageId: snapshot.id,
      });
    }
    refresh();
  }

  async function handleDeleteLesson(lessonId: string) {
    const lesson = orderedLessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const prevLessons = lessons;
    const prevSelected = selectedId;
    const removed = new Set(lesson.pages.map((p) => p.id));
    if (selectedId && removed.has(selectedId)) {
      const i = flatPages.findIndex((p) => p.id === selectedId);
      const after = flatPages.slice(i + 1).find((p) => !removed.has(p.id));
      const before = flatPages.slice(0, i).reverse().find((p) => !removed.has(p.id));
      setSelectedId(after?.id ?? before?.id ?? null);
    }
    setLessons((ls) => ls.filter((l) => l.id !== lessonId));
    setSaveError(null);

    const res = await deleteLesson(courseId, lessonId);
    if ("error" in res && res.error) {
      setLessons(prevLessons);
      setSelectedId(prevSelected);
      setSaveError(res.error);
      return;
    }
    if ("snapshot" in res && res.snapshot) {
      const snapshot = res.snapshot;
      const count = snapshot.pages.length;
      setUndo({
        message: `Deleted lesson “${lesson.title || "Untitled lesson"}”${
          count > 0 ? ` and ${count} ${count === 1 ? "page" : "pages"}` : ""
        }`,
        restore: () => restoreLesson(courseId, snapshot),
        expandLessonId: snapshot.id,
      });
    }
    refresh();
  }

  async function handleUndo() {
    if (!undo) return;
    setUndoing(true);
    const res = await undo.restore();
    setUndoing(false);
    const entry = undo;
    setUndo(null);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    expandLesson(entry.expandLessonId);
    const pageId = entry.selectPageId;
    if (pageId) runGuarded(() => setSelectedId(pageId));
    refresh();
  }

  async function handleCommitStructure(next: BuilderLesson[], change: StructureChange) {
    const prevLessons = lessons;
    setLessons(next);
    setStructureSaving(true);
    setSaveError(null);
    const res =
      change.kind === "lessons"
        ? await reorderLessons(
            courseId,
            next.map((l) => l.id),
          )
        : await setLessonPageLayout(
            courseId,
            change.lessonIds.map((id) => ({
              lessonId: id,
              pageIds: next.find((l) => l.id === id)?.pages.map((p) => p.id) ?? [],
            })),
          );
    setStructureSaving(false);
    if ("error" in res && res.error) {
      setLessons(prevLessons);
      setSaveError(res.error);
      return;
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
    if ("id" in res && res.id) expandLesson(res.id);
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

  function handlePreviewPage() {
    if (selectedIndex < 0) return;
    const href = `/courses/${courseId}/play/content?start=${selectedIndex}`;
    runGuarded(() => {
      window.open(href, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Structure
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={creatingPage}
                onClick={() => openAddPage(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {creatingPage ? "Adding…" : "Page"}
              </button>
              <button
                type="button"
                disabled={creatingLesson}
                onClick={() => void handleAddLesson()}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {creatingLesson ? "Adding…" : "Lesson"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Drag the handle to reorder pages and lessons, or to move pages between lessons.
            New pages are added below the selected page.
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            {orderedLessons.length > 0 ? (
              <button
                type="button"
                onClick={() => setAllCollapsed(!allCollapsed)}
                className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {allCollapsed ? "Expand all" : "Collapse all"}
              </button>
            ) : (
              <span />
            )}
            <span className="text-zinc-400" aria-live="polite">
              {structureSaving ? "Saving order…" : ""}
            </span>
          </div>
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
            <StructureSidebar
              lessons={orderedLessons}
              selectedId={selectedId}
              expandedLessonIds={expandedLessonIds}
              dragDisabled={structureSaving}
              onToggleLesson={toggleLessonExpanded}
              onExpandLesson={expandLesson}
              onSelectPage={handleSelectPage}
              onAddPage={(lessonId) => openAddPage(lessonId)}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={(pageId) => void handleDeletePage(pageId)}
              onDeleteLesson={(lessonId) => void handleDeleteLesson(lessonId)}
              onLessonTitleBlur={(lessonId, title) => void handleLessonTitleBlur(lessonId, title)}
              onCommitStructure={(next, change) => void handleCommitStructure(next, change)}
            />
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

        {saveError && !(selected && contentDraft) ? (
          <p className="mx-4 mt-4 text-sm text-red-600 dark:text-red-400 sm:mx-6" role="alert">
            {saveError}
          </p>
        ) : null}

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
                  onChange={(e) => {
                    setTitleDraft(e.target.value);
                    setIsDirty(true);
                  }}
                  className="mt-1 w-full max-w-xl rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isDirty ? (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Unsaved changes
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handlePreviewPage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <EyeIcon />
                  Preview page
                </button>
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
                  onClick={() => void handleDeletePage(selected.id)}
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
              key={selected.id}
              content={contentDraft}
              onChange={(next) => {
                setIsDirty(true);
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
            {selectedId
              ? "Loading page…"
              : orderedLessons.length === 0
                ? "Add a lesson first, then add pages."
                : "Select a page from the list or add a new page to a lesson."}
          </div>
        )}
      </div>

      {pickerTarget ? (
        <TemplatePickerDialog
          open
          placementLabel={pickerPlacementLabel}
          pending={creatingPage}
          onPick={handlePickTemplate}
          onClose={closePicker}
        />
      ) : null}
      <UnsavedChangesDialog
        open={pendingAction !== null}
        saving={saving}
        onSave={() => void handleGuardSave()}
        onDiscard={handleGuardDiscard}
        onCancel={() => setPendingAction(null)}
      />
      <UndoToast
        message={undo?.message ?? null}
        undoing={undoing}
        onUndo={() => void handleUndo()}
        onDismiss={() => setUndo(null)}
      />
    </div>
  );
}
