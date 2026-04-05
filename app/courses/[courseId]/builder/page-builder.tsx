"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createPage,
  deletePage,
  reorderPages,
  savePage,
} from "@/lib/actions/page";
import {
  isTemplateId,
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type PageContentV1,
  type TemplateId,
} from "@/lib/page-builder";

import { ContentEditor } from "./content-editor";

export type BuilderPageRow = {
  id: string;
  title: string;
  sort_order: number;
  content: PageContentV1;
};

type Props = {
  courseId: string;
  courseTitle: string;
  initialPages: BuilderPageRow[];
};

export function PageBuilder({
  courseId,
  courseTitle,
  initialPages,
}: Props) {
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPages[0]?.id ?? null,
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState<PageContentV1 | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId>(
    TEMPLATE_IDS[0],
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setPages(initialPages);
  }, [initialPages]);

  useEffect(() => {
    if (
      selectedId &&
      !initialPages.some((p) => p.id === selectedId)
    ) {
      setSelectedId(initialPages[0]?.id ?? null);
    }
  }, [initialPages, selectedId]);

  const selected = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? null,
    [pages, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setTitleDraft("");
      setContentDraft(null);
      return;
    }
    setTitleDraft(selected.title);
    setContentDraft(selected.content);
  }, [selected]);

  const ordered = useMemo(
    () => [...pages].sort((a, b) => a.sort_order - b.sort_order),
    [pages],
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

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

  async function handleMove(index: number, delta: -1 | 1) {
    const next = ordered.map((p) => p.id);
    const j = index + delta;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    const res = await reorderPages(courseId, next);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    refresh();
  }

  async function handleAddPage() {
    setCreating(true);
    setSaveError(null);
    const res = await createPage(courseId, pendingTemplate);
    setCreating(false);
    if ("error" in res && res.error) {
      setSaveError(res.error);
      return;
    }
    if ("id" in res && res.id) {
      setSelectedId(res.id);
    }
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
      <aside className="w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Add page
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <select
              value={pendingTemplate}
              onChange={(e) => {
                const v = e.target.value;
                if (isTemplateId(v)) setPendingTemplate(v);
              }}
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="Template for new page"
            >
              {TEMPLATE_IDS.map((id) => (
                <option key={id} value={id}>
                  {TEMPLATE_LABELS[id]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleAddPage()}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {creating ? "…" : "Add"}
            </button>
          </div>
        </div>
        <nav className="max-h-[50vh] overflow-y-auto p-2 lg:max-h-none" aria-label="Pages">
          {ordered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-zinc-500">
              No pages yet. Choose a template and click Add.
            </p>
          ) : (
            <ul className="space-y-1">
              {ordered.map((p, index) => (
                <li key={p.id}>
                  <div className="flex items-stretch gap-1">
                    <div className="flex flex-col justify-center gap-0.5 border-r border-zinc-200 pr-1 dark:border-zinc-800">
                      <button
                        type="button"
                        className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                        disabled={index === 0}
                        onClick={() => void handleMove(index, -1)}
                        aria-label="Move page up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                        disabled={index === ordered.length - 1}
                        onClick={() => void handleMove(index, 1)}
                        aria-label="Move page down"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
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
                        {TEMPLATE_LABELS[p.content.template]}
                      </span>
                    </button>
                  </div>
                </li>
              ))}
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
            Edit page content and order. Template is fixed after creation for
            this MVP.
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
              content={contentDraft}
              onChange={setContentDraft}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">
            Select a page from the list or add a new one.
          </div>
        )}
      </div>
    </div>
  );
}
