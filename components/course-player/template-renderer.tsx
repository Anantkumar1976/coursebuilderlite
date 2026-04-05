"use client";

import { useMemo, useState } from "react";

import { videoEmbedUrl } from "@/lib/course-player/embed-url";
import { TEMPLATE_LABELS, type PageContentV1 } from "@/lib/page-builder";

function BodyText({ text }: { text: string }) {
  const blocks = useMemo(
    () => text.split(/\n\n+/).filter(Boolean),
    [text],
  );
  if (!text.trim()) {
    return (
      <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
        No content yet.
      </p>
    );
  }
  return (
    <div className="space-y-4 text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
      {blocks.map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {para}
        </p>
      ))}
    </div>
  );
}

export function TemplateRenderer({ content }: { content: PageContentV1 }) {
  const label = TEMPLATE_LABELS[content.template];

  return (
    <article className="space-y-6" aria-label={`Template: ${label}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {label}
      </p>

      {content.template === "text" ? <BodyText text={content.body} /> : null}

      {content.template === "text_image" ? (
        <div className="space-y-6">
          <BodyText text={content.body} />
          {content.imageUrl ? (
            <figure className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.imageUrl}
                alt={content.imageAlt || ""}
                className="mx-auto max-h-[min(70vh,560px)] w-full object-contain"
                loading="lazy"
              />
              {content.imageAlt ? (
                <figcaption className="px-3 py-2 text-center text-xs text-zinc-600 dark:text-zinc-400">
                  {content.imageAlt}
                </figcaption>
              ) : null}
            </figure>
          ) : (
            <p className="text-sm text-zinc-500">No image URL set.</p>
          )}
        </div>
      ) : null}

      {content.template === "text_video" ? (
        <div className="space-y-6">
          <BodyText text={content.body} />
          <VideoBlock url={content.videoUrl} />
        </div>
      ) : null}

      {content.template === "two_column" ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Column A
            </h3>
            <BodyText text={content.left} />
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Column B
            </h3>
            <BodyText text={content.right} />
          </section>
        </div>
      ) : null}

      {content.template === "tabs" ? <TabsBlock tabs={content.tabs} /> : null}

      {content.template === "accordion" ? (
        <AccordionBlock items={content.items} />
      ) : null}

      {content.template === "mcq" ? <McqBlock content={content} /> : null}

      {content.template === "mrq" ? <MrqBlock content={content} /> : null}

      {content.template === "true_false" ? (
        <TrueFalseBlock content={content} />
      ) : null}

      {content.template === "final_quiz" ? (
        <FinalQuizBlock content={content} />
      ) : null}
    </article>
  );
}

function VideoBlock({ url }: { url: string }) {
  const embed = videoEmbedUrl(url);
  if (!url.trim()) {
    return <p className="text-sm text-zinc-500">No video URL set.</p>;
  }
  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-200 bg-black shadow-sm dark:border-zinc-700">
        <iframe
          title="Video"
          src={embed}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <p className="text-sm">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
      >
        Open video link
      </a>
    </p>
  );
}

function TabsBlock({
  tabs,
}: {
  tabs: { id: string; label: string; body: string }[];
}) {
  const [active, setActive] = useState(0);
  const safe = tabs.length ? tabs : [{ id: "x", label: "Tab", body: "" }];
  return (
    <div>
      <div
        className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-700"
        role="tablist"
        aria-label="Tabs"
      >
        {safe.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              i === active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            onClick={() => setActive(i)}
          >
            {tab.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      <div
        className="border border-t-0 border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-950/50"
        role="tabpanel"
      >
        <BodyText text={safe[active]?.body ?? ""} />
      </div>
    </div>
  );
}

function AccordionBlock({
  items,
}: {
  items: { id: string; title: string; body: string }[];
}) {
  const safe = items.length
    ? items
    : [{ id: "x", title: "Section", body: "" }];
  return (
    <div className="space-y-2">
      {safe.map((item) => (
        <details
          key={item.id}
          className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950/50"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-900 marker:hidden dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              {item.title || "Section"}
              <span className="text-zinc-400 group-open:rotate-180">▼</span>
            </span>
          </summary>
          <div className="border-t border-zinc-100 px-4 pb-4 pt-2 dark:border-zinc-800">
            <BodyText text={item.body} />
          </div>
        </details>
      ))}
    </div>
  );
}

function McqBlock({
  content,
}: {
  content: Extract<PageContentV1, { template: "mcq" }>;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {content.question || "Question"}
      </p>
      <ul className="space-y-2">
        {content.options.map((opt, idx) => {
          const isCorrect = idx === content.correctIndex;
          const isPicked = picked === idx;
          let itemClass =
            "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500";
          if (show && isPicked) {
            itemClass = isCorrect
              ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
              : "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40";
          } else if (show && isCorrect) {
            itemClass =
              "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40";
          }
          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => {
                  setPicked(idx);
                  setShow(true);
                }}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${itemClass}`}
              >
                {opt || `Option ${idx + 1}`}
              </button>
            </li>
          );
        })}
      </ul>
      {show && picked !== null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {picked === content.correctIndex
            ? "Correct."
            : "Incorrect."}
        </p>
      ) : null}
    </div>
  );
}

function MrqBlock({
  content,
}: {
  content: Extract<PageContentV1, { template: "mrq" }>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [show, setShow] = useState(false);

  const correctSet = useMemo(
    () => new Set(content.correctIndices),
    [content.correctIndices],
  );

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function check() {
    setShow(true);
  }

  const isMatch =
    correctSet.size === selected.size &&
    [...correctSet].every((i) => selected.has(i));

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {content.question || "Question"}
      </p>
      <ul className="space-y-2">
        {content.options.map((opt, idx) => {
          const on = selected.has(idx);
          const should = correctSet.has(idx);
          let itemClass =
            "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500";
          if (show) {
            if (should && on) {
              itemClass =
                "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40";
            } else if (should && !on) {
              itemClass =
                "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30";
            } else if (!should && on) {
              itemClass =
                "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40";
            }
          } else if (on) {
            itemClass =
              "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800";
          }
          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => {
                  toggle(idx);
                  setShow(false);
                }}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${itemClass}`}
              >
                {opt || `Option ${idx + 1}`}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={check}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Check answer
      </button>
      {show ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isMatch ? "Correct — all right choices selected." : "Not quite — review the highlighted options."}
        </p>
      ) : null}
    </div>
  );
}

function TrueFalseBlock({
  content,
}: {
  content: Extract<PageContentV1, { template: "true_false" }>;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {content.question || "Statement"}
      </p>
      <div className="flex flex-wrap gap-3">
        {([true, false] as const).map((val) => (
          <button
            key={String(val)}
            type="button"
            onClick={() => setPicked(val)}
            className={`rounded-lg border px-6 py-3 text-sm font-medium transition-colors ${
              picked === val
                ? val === content.correct
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100"
                : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
            }`}
          >
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
      {picked !== null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {picked === content.correct ? "Correct." : "Incorrect."}
        </p>
      ) : null}
    </div>
  );
}

function FinalQuizBlock({
  content,
}: {
  content: Extract<PageContentV1, { template: "final_quiz" }>;
}) {
  return (
    <div className="space-y-6 rounded-xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
      <BodyText text={content.intro} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-300">
            Pass
          </p>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {content.passMessage || "—"}
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-white p-4 dark:border-red-900 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase text-red-800 dark:text-red-300">
            Fail
          </p>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {content.failMessage || "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Full scoring and LMS completion will be wired with SCORM export later.
      </p>
    </div>
  );
}
