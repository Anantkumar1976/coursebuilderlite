"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";

import { templateDisplayLabel } from "@/lib/page-builder";

import {
  ChevronRightIcon,
  CopyIcon,
  GripIcon,
  PlusIcon,
  TrashIcon,
} from "./builder-icons";
import type { BuilderLesson, BuilderPageRow } from "./page-builder";

export type StructureChange =
  | { kind: "lessons" }
  | { kind: "pages"; lessonIds: string[] };

type Props = {
  /** Lessons in display order, pages sorted within each lesson. */
  lessons: BuilderLesson[];
  selectedId: string | null;
  expandedLessonIds: Set<string>;
  dragDisabled: boolean;
  onToggleLesson: (lessonId: string) => void;
  onExpandLesson: (lessonId: string) => void;
  onSelectPage: (pageId: string) => void;
  onAddPage: (lessonId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onLessonTitleBlur: (lessonId: string, title: string) => void;
  onCommitStructure: (next: BuilderLesson[], change: StructureChange) => void;
};

type DragKind = "lesson" | "page" | "container";

const lessonKey = (id: string) => `lesson:${id}`;
const pageKey = (id: string) => `page:${id}`;
const containerKey = (id: string) => `pages:${id}`;

function parseKey(key: UniqueIdentifier): { type: DragKind; id: string } | null {
  const s = String(key);
  if (s.startsWith("lesson:")) return { type: "lesson", id: s.slice(7) };
  if (s.startsWith("page:")) return { type: "page", id: s.slice(5) };
  if (s.startsWith("pages:")) return { type: "container", id: s.slice(6) };
  return null;
}

function lessonOfPage(lessons: BuilderLesson[], pageId: string) {
  return lessons.find((l) => l.pages.some((p) => p.id === pageId)) ?? null;
}

function renumberPages(pages: BuilderPageRow[]) {
  return pages.map((p, i) => (p.sort_order === i ? p : { ...p, sort_order: i }));
}

function movePage(
  lessons: BuilderLesson[],
  pageId: string,
  toLessonId: string,
  toIndex: number,
) {
  const from = lessonOfPage(lessons, pageId);
  const page = from?.pages.find((p) => p.id === pageId);
  if (!from || !page) return lessons;
  return lessons.map((l) => {
    if (l.id === from.id && l.id === toLessonId) {
      const fromIndex = l.pages.findIndex((p) => p.id === pageId);
      return { ...l, pages: renumberPages(arrayMove(l.pages, fromIndex, toIndex)) };
    }
    if (l.id === from.id) {
      return { ...l, pages: renumberPages(l.pages.filter((p) => p.id !== pageId)) };
    }
    if (l.id === toLessonId) {
      const next = [...l.pages];
      next.splice(Math.min(Math.max(0, toIndex), next.length), 0, page);
      return { ...l, pages: renumberPages(next) };
    }
    return l;
  });
}

function samePageOrder(a: BuilderLesson | undefined, b: BuilderLesson | undefined) {
  if (!a || !b || a.pages.length !== b.pages.length) return false;
  return a.pages.every((p, i) => p.id === b.pages[i].id);
}

const pluralPages = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;

export function StructureSidebar({
  lessons,
  selectedId,
  expandedLessonIds,
  dragDisabled,
  onToggleLesson,
  onExpandLesson,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onDeleteLesson,
  onLessonTitleBlur,
  onCommitStructure,
}: Props) {
  const dndId = useId();
  const [draft, setDraft] = useState<BuilderLesson[] | null>(null);
  const [active, setActive] = useState<{ type: DragKind; id: string } | null>(null);
  const [originLessonId, setOriginLessonId] = useState<string | null>(null);

  const view = draft ?? lessons;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const titles = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of view) {
      map.set(lessonKey(l.id), `lesson “${l.title || "Untitled lesson"}”`);
      map.set(containerKey(l.id), `lesson “${l.title || "Untitled lesson"}”`);
      for (const p of l.pages) {
        map.set(pageKey(p.id), `page “${p.title || "Untitled page"}”`);
      }
    }
    return map;
  }, [view]);

  const label = useCallback(
    (key: UniqueIdentifier) => titles.get(String(key)) ?? "item",
    [titles],
  );

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Picked up ${label(a.id)}.`,
    onDragOver: ({ active: a, over }) =>
      over ? `${label(a.id)} is over ${label(over.id)}.` : undefined,
    onDragEnd: ({ active: a, over }) =>
      over ? `Dropped ${label(a.id)}.` : `${label(a.id)} was returned.`,
    onDragCancel: ({ active: a }) => `Cancelled moving ${label(a.id)}.`,
  };

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (parseKey(args.active.id)?.type === "lesson") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => parseKey(c.id)?.type === "lesson",
        ),
      });
    }
    const pageTargets = args.droppableContainers.filter(
      (c) => parseKey(c.id)?.type !== "lesson",
    );
    const hits = pointerWithin({ ...args, droppableContainers: pageTargets });
    if (hits.length > 0) {
      const pageHit = hits.find((h) => parseKey(h.id)?.type === "page");
      return [pageHit ?? hits[0]];
    }
    return closestCenter({ ...args, droppableContainers: pageTargets });
  }, []);

  function reset() {
    setDraft(null);
    setActive(null);
    setOriginLessonId(null);
  }

  function handleDragStart({ active: a }: DragStartEvent) {
    const parsed = parseKey(a.id);
    if (!parsed) return;
    setActive(parsed);
    setDraft(lessons);
    setOriginLessonId(
      parsed.type === "page" ? (lessonOfPage(lessons, parsed.id)?.id ?? null) : null,
    );
  }

  function handleDragOver({ active: a, over }: DragOverEvent) {
    const activeParsed = parseKey(a.id);
    const overParsed = over ? parseKey(over.id) : null;
    if (!draft || activeParsed?.type !== "page" || !overParsed) return;
    if (overParsed.type === "page" && overParsed.id === activeParsed.id) return;

    const currentLesson = lessonOfPage(draft, activeParsed.id);
    const targetLesson =
      overParsed.type === "page"
        ? lessonOfPage(draft, overParsed.id)
        : overParsed.type === "container"
          ? (draft.find((l) => l.id === overParsed.id) ?? null)
          : null;
    if (!currentLesson || !targetLesson || currentLesson.id === targetLesson.id) return;

    let index = targetLesson.pages.length;
    if (overParsed.type === "page" && over) {
      const overIndex = targetLesson.pages.findIndex((p) => p.id === overParsed.id);
      const translated = a.rect.current.translated;
      const isBelow =
        translated != null && translated.top > over.rect.top + over.rect.height / 2;
      index = overIndex + (isBelow ? 1 : 0);
    }
    setDraft(movePage(draft, activeParsed.id, targetLesson.id, index));
  }

  function handleDragEnd({ active: a, over }: DragEndEvent) {
    const activeParsed = parseKey(a.id);
    const overParsed = over ? parseKey(over.id) : null;
    const current = draft ?? lessons;

    if (activeParsed?.type === "lesson") {
      if (overParsed?.type === "lesson" && overParsed.id !== activeParsed.id) {
        const from = current.findIndex((l) => l.id === activeParsed.id);
        const to = current.findIndex((l) => l.id === overParsed.id);
        if (from !== -1 && to !== -1) {
          const next = arrayMove(current, from, to).map((l, i) =>
            l.sort_order === i ? l : { ...l, sort_order: i },
          );
          onCommitStructure(next, { kind: "lessons" });
        }
      }
      reset();
      return;
    }

    if (activeParsed?.type === "page") {
      let next = current;
      const lesson = lessonOfPage(next, activeParsed.id);
      if (lesson && overParsed?.type === "page" && overParsed.id !== activeParsed.id) {
        const overIndex = lesson.pages.findIndex((p) => p.id === overParsed.id);
        if (overIndex !== -1) next = movePage(next, activeParsed.id, lesson.id, overIndex);
      }

      const finalLessonId = lessonOfPage(next, activeParsed.id)?.id;
      const affected = [...new Set([originLessonId, finalLessonId].filter(Boolean))] as string[];
      const changed = affected.some(
        (id) =>
          !samePageOrder(
            lessons.find((l) => l.id === id),
            next.find((l) => l.id === id),
          ),
      );
      if (over && changed) {
        onCommitStructure(next, { kind: "pages", lessonIds: affected });
        if (finalLessonId && !expandedLessonIds.has(finalLessonId)) {
          onExpandLesson(finalLessonId);
        }
      }
    }
    reset();
  }

  const lessonDragActive = active?.type === "lesson";
  const activePageId = active?.type === "page" ? active.id : null;
  const activePage = activePageId
    ? (lessonOfPage(view, activePageId)?.pages.find((p) => p.id === activePageId) ?? null)
    : null;
  const activeLesson =
    active?.type === "lesson" ? (view.find((l) => l.id === active.id) ?? null) : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
    >
      <SortableContext
        items={view.map((l) => lessonKey(l.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-3">
          {view.map((lesson) => {
            const expanded = expandedLessonIds.has(lesson.id) && !lessonDragActive;
            // Keep the dragged page mounted even if it has moved into a collapsed lesson.
            const visiblePages = lessonDragActive
              ? []
              : expanded
                ? lesson.pages
                : lesson.pages.filter((p) => p.id === activePageId);
            const isDropTarget =
              activePageId != null &&
              originLessonId !== lesson.id &&
              lesson.pages.some((p) => p.id === activePageId);
            return (
              <SortableLesson
                key={lesson.id}
                lesson={lesson}
                expanded={expanded}
                isDropTarget={isDropTarget}
                dragDisabled={dragDisabled}
                onToggle={() => onToggleLesson(lesson.id)}
                onAddPage={() => onAddPage(lesson.id)}
                onDelete={() => onDeleteLesson(lesson.id)}
                onTitleBlur={(title) => onLessonTitleBlur(lesson.id, title)}
              >
                {expanded && lesson.pages.length === 0 ? (
                  <p className="rounded-md border border-dashed border-zinc-200 px-2 py-3 text-center text-xs text-zinc-500 dark:border-zinc-700">
                    No pages yet. Drag a page here or click +.
                  </p>
                ) : null}
                {visiblePages.length > 0 ? (
                  <SortableContext
                    items={visiblePages.map((p) => pageKey(p.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-1">
                      {visiblePages.map((page) => (
                        <SortablePageRow
                          key={page.id}
                          page={page}
                          lessonId={lesson.id}
                          selected={selectedId === page.id}
                          dragDisabled={dragDisabled}
                          onSelect={() => onSelectPage(page.id)}
                          onDuplicate={() => onDuplicatePage(page.id)}
                          onDelete={() => onDeletePage(page.id)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                ) : null}
              </SortableLesson>
            );
          })}
        </ul>
      </SortableContext>
      <DragOverlay>
        {activePage ? (
          <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
            <GripIcon className="h-4 w-4 shrink-0 text-zinc-400" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {activePage.title || "Untitled page"}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {templateDisplayLabel(activePage.content)}
              </span>
            </div>
          </div>
        ) : activeLesson ? (
          <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-2 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
            <GripIcon className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {activeLesson.title || "Untitled lesson"}
            </span>
            <span className="ml-auto shrink-0 text-xs text-zinc-500">
              {pluralPages(activeLesson.pages.length)}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const iconButton =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

function SortableLesson({
  lesson,
  expanded,
  isDropTarget,
  dragDisabled,
  onToggle,
  onAddPage,
  onDelete,
  onTitleBlur,
  children,
}: {
  lesson: BuilderLesson;
  expanded: boolean;
  isDropTarget: boolean;
  dragDisabled: boolean;
  onToggle: () => void;
  onAddPage: () => void;
  onDelete: () => void;
  onTitleBlur: (title: string) => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lessonKey(lesson.id),
    data: { type: "lesson" },
    disabled: dragDisabled,
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: containerKey(lesson.id),
    data: { type: "container", lessonId: lesson.id },
  });
  const title = lesson.title || "Untitled lesson";
  const bodyId = `lesson-pages-${lesson.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-lg border bg-white transition-shadow dark:bg-zinc-950 ${
        isDropTarget
          ? "border-zinc-900 ring-2 ring-zinc-300 dark:border-zinc-200 dark:ring-zinc-700"
          : "border-zinc-200 dark:border-zinc-800"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div ref={setDropRef}>
        <div className="group/lesson flex items-center gap-0.5 rounded-t-lg border-b border-zinc-100 bg-zinc-50/80 px-1 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder lesson “${title}”`}
            title="Drag to reorder"
            className={`${iconButton} cursor-grab touch-none text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 active:cursor-grabbing disabled:cursor-not-allowed dark:hover:bg-zinc-800 dark:hover:text-zinc-200`}
          >
            <GripIcon />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={bodyId}
            aria-label={`${expanded ? "Collapse" : "Expand"} lesson “${title}”`}
            className={`${iconButton} text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`}
          >
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              defaultValue={lesson.title}
              key={`${lesson.id}-${lesson.title}`}
              onBlur={(e) => {
                if (e.target.value !== lesson.title) onTitleBlur(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="w-full rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-zinc-900 hover:border-zinc-200 focus:border-zinc-400 focus:outline-none dark:text-zinc-50 dark:hover:border-zinc-600"
              aria-label="Lesson title"
            />
            <p className="px-1 text-[11px] text-zinc-500">{pluralPages(lesson.pages.length)}</p>
          </div>
          <button
            type="button"
            onClick={onAddPage}
            aria-label={`Add page to lesson “${title}”`}
            title="Add page"
            className={`${iconButton} text-zinc-600 hover:bg-zinc-900 hover:text-white dark:text-zinc-300 dark:hover:bg-zinc-100 dark:hover:text-zinc-900`}
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete lesson “${title}”`}
            title="Delete lesson"
            className={`${iconButton} text-zinc-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover/lesson:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400`}
          >
            <TrashIcon />
          </button>
        </div>
        <div id={bodyId} className="p-2 empty:hidden">
          {children}
        </div>
      </div>
    </li>
  );
}

function SortablePageRow({
  page,
  lessonId,
  selected,
  dragDisabled,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  page: BuilderPageRow;
  lessonId: string;
  selected: boolean;
  dragDisabled: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: pageKey(page.id),
    data: { type: "page", lessonId },
    disabled: dragDisabled,
  });
  const title = page.title || "Untitled page";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group/page relative flex items-stretch rounded-lg ${
        selected
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to move page “${title}”`}
        title="Drag to move"
        className={`flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-lg active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
          selected ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-300 group-hover/page:text-zinc-500 dark:text-zinc-600"
        }`}
      >
        <GripIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "page" : undefined}
        className={`min-w-0 flex-1 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 ${
          selected ? "pr-16" : "pr-2"
        }`}
      >
        <span className="block truncate font-medium">{title}</span>
        <span
          className={`mt-0.5 block truncate text-xs ${
            selected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"
          }`}
        >
          {templateDisplayLabel(page.content)}
        </span>
      </button>
      <div
        className={`absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 rounded-md p-0.5 transition-opacity ${
          selected
            ? "bg-zinc-900 opacity-100 dark:bg-zinc-100"
            : "pointer-events-none bg-zinc-100 opacity-0 group-focus-within/page:pointer-events-auto group-focus-within/page:opacity-100 group-hover/page:pointer-events-auto group-hover/page:opacity-100 dark:bg-zinc-800"
        }`}
      >
        <button
          type="button"
          onClick={onDuplicate}
          aria-label={`Duplicate page “${title}”`}
          title="Duplicate page"
          className={`${iconButton} ${
            selected
              ? "text-zinc-300 hover:bg-zinc-700 hover:text-white dark:text-zinc-600 dark:hover:bg-zinc-300 dark:hover:text-zinc-900"
              : "text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
          }`}
        >
          <CopyIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete page “${title}”`}
          title="Delete page"
          className={`${iconButton} ${
            selected
              ? "text-zinc-300 hover:bg-red-600 hover:text-white dark:text-zinc-600 dark:hover:bg-red-600 dark:hover:text-white"
              : "text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          }`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
