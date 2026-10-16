"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ADD_PAGE_TEMPLATE_OPTIONS } from "@/lib/page-builder";

const TEMPLATE_GROUPS: { title: string; values: string[] }[] = [
  {
    title: "Text & media",
    values: [
      "text",
      "text_image",
      "text_image__columns_2",
      "text_image__columns_3",
      "text_image__columns_4",
      "two_column",
      "text_video",
      "text_video__video_only",
      "text_video__video_top",
      "text_video__video_left",
      "text_video__video_right",
      "embed_pdf",
    ],
  },
  { title: "Galleries", values: ["image_carousel", "image_grid"] },
  { title: "Interactive", values: ["tabs", "accordion", "click_reveal"] },
  { title: "Knowledge checks", values: ["mcq", "mrq", "true_false"] },
  {
    title: "Assessment & completion",
    values: ["final_quiz", "quiz_results", "course_completion"],
  },
];

type Option = { value: string; label: string };

function groupOptions(options: Option[]) {
  const byValue = new Map(options.map((o) => [o.value, o]));
  const used = new Set<string>();
  const groups = TEMPLATE_GROUPS.map((g) => ({
    title: g.title,
    options: g.values.flatMap((v) => {
      const opt = byValue.get(v);
      if (!opt) return [];
      used.add(v);
      return [opt];
    }),
  }));
  const rest = options.filter((o) => !used.has(o.value));
  if (rest.length > 0) groups.push({ title: "Other", options: rest });
  return groups.filter((g) => g.options.length > 0);
}

type Props = {
  open: boolean;
  /** e.g. Adds below “Course outline” */
  placementLabel: string;
  pending: boolean;
  onPick: (value: string) => void;
  onClose: () => void;
};

export function TemplatePickerDialog({
  open,
  placementLabel,
  pending,
  onPick,
  onClose,
}: Props) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", handleKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? ADD_PAGE_TEMPLATE_OPTIONS.filter((o) => o.label.toLowerCase().includes(q))
      : ADD_PAGE_TEMPLATE_OPTIONS;
    return groupOptions(filtered);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Add a page
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{placementLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter templates…"
            aria-label="Filter templates"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No templates match “{query}”.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.title} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {group.title}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {group.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={pending}
                      onClick={() => onPick(opt.value)}
                      className="group flex flex-col gap-2 rounded-lg border border-zinc-200 p-2 text-left transition-colors hover:border-zinc-900 hover:bg-zinc-50 focus-visible:border-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:hover:border-zinc-300 dark:hover:bg-zinc-900"
                    >
                      <TemplateThumb value={opt.value} />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const bar = "h-1 rounded-full bg-zinc-300 dark:bg-zinc-600";
const block = "rounded-sm bg-zinc-200 dark:bg-zinc-700";

function Lines({ n = 3 }: { n?: number }) {
  return (
    <div className="flex w-full flex-col gap-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={bar} style={{ width: `${i === n - 1 ? 60 : 100}%` }} />
      ))}
    </div>
  );
}

function Img({ className = "" }: { className?: string }) {
  return (
    <div className={`${block} flex items-center justify-center ${className}`}>
      <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
    </div>
  );
}

function Vid({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-sm bg-zinc-800 dark:bg-zinc-600 ${className}`}>
      <div className="h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-white" />
    </div>
  );
}

function Choice({ square = false }: { square?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`h-2 w-2 shrink-0 border border-zinc-400 ${square ? "rounded-[2px]" : "rounded-full"}`}
      />
      <div className={`${bar} flex-1`} />
    </div>
  );
}

function ThumbBody({ value }: { value: string }) {
  switch (value) {
    case "text":
      return <Lines n={5} />;
    case "text_image":
      return (
        <div className="flex w-full gap-1.5">
          <div className="flex-1"><Lines n={4} /></div>
          <Img className="h-8 w-10" />
        </div>
      );
    case "text_image__columns_2":
    case "text_image__columns_3":
    case "text_image__columns_4": {
      const cols = Number(value.slice(-1));
      return (
        <div className="flex w-full gap-1">
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} className="flex flex-1 flex-col gap-1">
              <Img className="h-5 w-full" />
              <Lines n={2} />
            </div>
          ))}
        </div>
      );
    }
    case "two_column":
      return (
        <div className="flex w-full gap-2">
          <div className="flex-1"><Lines n={4} /></div>
          <div className="flex-1"><Lines n={4} /></div>
        </div>
      );
    case "text_video":
    case "text_video__video_right":
      return (
        <div className="flex w-full gap-1.5">
          <div className="flex-1"><Lines n={4} /></div>
          <Vid className="h-8 w-12" />
        </div>
      );
    case "text_video__video_left":
      return (
        <div className="flex w-full gap-1.5">
          <Vid className="h-8 w-12" />
          <div className="flex-1"><Lines n={4} /></div>
        </div>
      );
    case "text_video__video_only":
      return <Vid className="h-10 w-full" />;
    case "text_video__video_top":
      return (
        <div className="flex w-full flex-col gap-1">
          <Vid className="h-6 w-full" />
          <Lines n={2} />
        </div>
      );
    case "embed_pdf":
      return (
        <div className="flex w-full justify-center">
          <div className="flex h-10 w-8 flex-col gap-0.5 rounded-sm border border-zinc-300 p-1 dark:border-zinc-600">
            <div className="text-[6px] font-bold leading-none text-red-500">PDF</div>
            <Lines n={3} />
          </div>
        </div>
      );
    case "image_carousel":
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <div className="flex w-full items-center gap-1">
            <div className="text-[8px] text-zinc-400">‹</div>
            <Img className="h-8 flex-1" />
            <div className="text-[8px] text-zinc-400">›</div>
          </div>
          <div className="flex gap-0.5">
            <div className="h-1 w-1 rounded-full bg-zinc-500" />
            <div className="h-1 w-1 rounded-full bg-zinc-300" />
            <div className="h-1 w-1 rounded-full bg-zinc-300" />
          </div>
        </div>
      );
    case "image_grid":
      return (
        <div className="grid w-full grid-cols-3 gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <Img key={i} className="h-4" />
          ))}
        </div>
      );
    case "tabs":
      return (
        <div className="flex w-full flex-col gap-1">
          <div className="flex gap-0.5">
            <div className="h-2 w-5 rounded-t-sm bg-zinc-500" />
            <div className="h-2 w-5 rounded-t-sm bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-2 w-5 rounded-t-sm bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <Lines n={3} />
        </div>
      );
    case "accordion":
      return (
        <div className="flex w-full flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-sm border border-zinc-300 px-1 py-0.5 dark:border-zinc-600"
            >
              <div className={`${bar} w-3/5`} />
              <div className="text-[6px] leading-none text-zinc-400">{i === 0 ? "−" : "+"}</div>
            </div>
          ))}
        </div>
      );
    case "click_reveal":
      return (
        <div className="grid w-full grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex h-8 items-center justify-center rounded-sm ${i === 1 ? "bg-zinc-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
            >
              <div className="text-[7px] font-bold text-white">?</div>
            </div>
          ))}
        </div>
      );
    case "mcq":
      return (
        <div className="flex w-full flex-col gap-1">
          <div className={`${bar} w-4/5 bg-zinc-400`} />
          <Choice />
          <Choice />
          <Choice />
        </div>
      );
    case "mrq":
      return (
        <div className="flex w-full flex-col gap-1">
          <div className={`${bar} w-4/5 bg-zinc-400`} />
          <Choice square />
          <Choice square />
          <Choice square />
        </div>
      );
    case "true_false":
      return (
        <div className="flex w-full flex-col gap-1.5">
          <div className={`${bar} w-4/5 bg-zinc-400`} />
          <div className="flex gap-1">
            <div className="flex-1 rounded-sm border border-zinc-300 py-0.5 text-center text-[6px] text-zinc-500 dark:border-zinc-600">True</div>
            <div className="flex-1 rounded-sm border border-zinc-300 py-0.5 text-center text-[6px] text-zinc-500 dark:border-zinc-600">False</div>
          </div>
        </div>
      );
    case "final_quiz":
      return (
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className={`${bar} w-2/5 bg-zinc-400`} />
            <div className="text-[6px] text-zinc-400">1/10</div>
          </div>
          <Choice />
          <Choice />
          <div className="h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-1 w-1/3 rounded-full bg-zinc-500" />
          </div>
        </div>
      );
    case "quiz_results":
      return (
        <div className="flex w-full items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-zinc-500 border-r-zinc-200 text-[7px] font-bold text-zinc-600 dark:text-zinc-300">
            80%
          </div>
          <div className="flex-1"><Lines n={3} /></div>
        </div>
      );
    case "course_completion":
      return (
        <div className="flex w-full flex-col items-center gap-1 rounded-sm border border-dashed border-zinc-300 py-1 dark:border-zinc-600">
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className={`${bar} w-3/5`} />
          <div className={`${bar} w-2/5`} />
        </div>
      );
    default:
      return <Lines n={4} />;
  }
}

function TemplateThumb({ value }: { value: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[16/10] w-full items-center rounded-md border border-zinc-100 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <ThumbBody value={value} />
    </div>
  );
}
