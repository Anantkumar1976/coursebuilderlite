"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  clickRevealContainerClass,
  clickRevealItemClass,
  normalizeClickRevealItems,
  resolveClickRevealAudioSrc,
  type ClickRevealItem,
  type PageContentV1,
} from "@/lib/page-builder";
import { isEffectivelyEmptyHtml, sanitizeBodyHtml } from "@/lib/rich-text/sanitize";

function resolveTextImageSrc(
  imageAssetId: string | null | undefined,
  imageUrl: string,
  signedImageUrls?: Record<string, string>,
): string | null {
  if (imageAssetId && signedImageUrls?.[imageAssetId]) {
    return signedImageUrls[imageAssetId];
  }
  const u = imageUrl.trim();
  return u || null;
}

function RichBodyHtml({ html, className = "" }: { html: string; className?: string }) {
  const safe = useMemo(() => sanitizeBodyHtml(html), [html]);
  if (!html.trim() || isEffectivelyEmptyHtml(html)) return null;
  return (
    <div
      className={`cb-rich max-w-none leading-relaxed [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

type Props = {
  content: Extract<PageContentV1, { template: "click_reveal" }>;
  signedImageUrls?: Record<string, string>;
  highlightColor?: string;
};

function cardImageSrc(
  card: ClickRevealItem,
  signedImageUrls?: Record<string, string>,
) {
  return resolveTextImageSrc(
    card.cardImageAssetId,
    card.cardImageUrl,
    signedImageUrls,
  );
}

function revealImageSrc(
  card: ClickRevealItem,
  signedImageUrls?: Record<string, string>,
) {
  return (
    resolveTextImageSrc(
      card.revealImageAssetId,
      card.revealImageUrl,
      signedImageUrls,
    ) ?? cardImageSrc(card, signedImageUrls)
  );
}

function hasCardFront(card: ClickRevealItem, signedImageUrls?: Record<string, string>) {
  return (
    card.cardTitle.trim().length > 0 ||
    card.cardBody.trim().length > 0 ||
    Boolean(cardImageSrc(card, signedImageUrls))
  );
}

function hasRevealContent(
  card: ClickRevealItem,
  signedImageUrls?: Record<string, string>,
) {
  return (
    card.revealTitle.trim().length > 0 ||
    card.revealBody.trim().length > 0 ||
    Boolean(revealImageSrc(card, signedImageUrls)) ||
    Boolean(resolveClickRevealAudioSrc(card.revealAudioAssetId, signedImageUrls))
  );
}

export function ClickRevealBlock({
  content,
  signedImageUrls,
  highlightColor = "#18181b",
}: Props) {
  const cards = normalizeClickRevealItems(content.cards).filter((card) =>
    hasCardFront(card, signedImageUrls),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const revealAudioRef = useRef<HTMLAudioElement>(null);

  const openCard = cards.find((c) => c.id === openId) ?? null;

  const markVisited = useCallback((id: string) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!openId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    const el = document.getElementById(dialogId) as HTMLDialogElement | null;
    el?.showModal();
  }, [dialogId, openId]);

  useEffect(() => {
    const audio = revealAudioRef.current;
    if (!openId || !openCard) {
      audio?.pause();
      if (audio) audio.currentTime = 0;
      return;
    }
    const src = resolveClickRevealAudioSrc(
      openCard.revealAudioAssetId,
      signedImageUrls,
    );
    if (!src || !audio) return;
    audio.src = src;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay may be blocked until the learner interacts with the page.
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [openId, openCard, signedImageUrls]);

  function handleOpen(card: ClickRevealItem) {
    if (!hasRevealContent(card, signedImageUrls)) return;
    setOpenId(card.id);
    markVisited(card.id);
  }

  function handleClose() {
    revealAudioRef.current?.pause();
    if (revealAudioRef.current) revealAudioRef.current.currentTime = 0;
    setOpenId(null);
    const el = document.getElementById(dialogId) as HTMLDialogElement | null;
    el?.close();
  }

  if (!cards.length) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No click-and-reveal cards configured yet.
      </p>
    );
  }

  const revealSrc = openCard
    ? revealImageSrc(openCard, signedImageUrls)
    : null;
  const revealHeading =
    openCard?.revealTitle.trim() ||
    openCard?.cardTitle.trim() ||
    "Details";

  return (
    <div className="space-y-6">
      {content.intro.trim() ? <RichBodyHtml html={content.intro} /> : null}

      <div
        className={`${clickRevealContainerClass(cards.length)}`}
        role="list"
      >
        {cards.map((card, idx) => {
          const src = cardImageSrc(card, signedImageUrls);
          const isVisited = visited.has(card.id);
          const clickable = hasRevealContent(card, signedImageUrls);

          return (
            <button
              key={card.id}
              type="button"
              role="listitem"
              disabled={!clickable}
              onClick={() => handleOpen(card)}
              className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition dark:bg-zinc-950/40 ${clickRevealItemClass(cards.length)} ${
                isVisited
                  ? "ring-2 ring-offset-2 dark:ring-offset-zinc-950"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              } ${clickable ? "cursor-pointer" : "cursor-default opacity-80"}`}
              style={
                isVisited
                  ? {
                      borderColor: highlightColor,
                      // ringColor via CSS variable
                      ["--tw-ring-color" as string]: highlightColor,
                    }
                  : undefined
              }
              aria-label={
                card.cardTitle.trim() ||
                `Reveal item ${idx + 1}${isVisited ? " (visited)" : ""}`
              }
            >
              {src ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={src}
                  alt={card.cardImageAlt || card.cardTitle || `Item ${idx + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="flex flex-1 flex-col gap-2 p-4">
                {card.cardTitle.trim() ? (
                  <p
                    className="font-semibold text-zinc-900 dark:text-zinc-50"
                    style={isVisited ? { color: highlightColor } : undefined}
                  >
                    {card.cardTitle}
                  </p>
                ) : null}
                {card.cardBody.trim() ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 [&_p]:m-0">
                    <RichBodyHtml html={card.cardBody} />
                  </div>
                ) : null}
                {clickable ? (
                  <span
                    className="mt-auto text-xs font-medium"
                    style={{ color: highlightColor }}
                  >
                    {isVisited ? "View again" : "Learn more…"}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <dialog
        id={dialogId}
        aria-labelledby={titleId}
        className="fixed left-1/2 top-1/2 z-[70] w-[min(42rem,calc(100vw-2rem))] max-h-[min(36rem,90vh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 open:flex open:flex-col dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        onClose={() => {
          revealAudioRef.current?.pause();
          setOpenId(null);
        }}
      >
        {openCard ? (
          <>
            <audio
              ref={revealAudioRef}
              preload="auto"
              className="sr-only"
              aria-label="Card narration"
            />
            {revealSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={revealSrc}
                alt={
                  openCard.revealImageAlt ||
                  openCard.cardImageAlt ||
                  revealHeading
                }
                className="max-h-56 w-full shrink-0 object-cover"
              />
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6">
              <h2
                id={titleId}
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {revealHeading}
              </h2>
              {openCard.revealBody.trim() ? (
                <div className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <RichBodyHtml html={openCard.revealBody} />
                </div>
              ) : null}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: highlightColor }}
                >
                  Go back
                </button>
              </div>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
