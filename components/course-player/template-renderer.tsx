"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  bumpAssessmentAttemptEpoch,
  canRetakeAssessment,
  isFinalAssessmentLocked,
  readAssessmentAttemptsUsed,
  tryCommitAssessmentCompletion,
} from "@/lib/course-player/assessment-attempts";
import {
  clearFinalQuizResult,
  readFinalQuizResult,
  writeFinalQuizResult,
} from "@/lib/course-player/final-quiz-result";
import {
  clearPageAssessmentsForPageIds,
  readPageAssessment,
  writePageAssessment,
} from "@/lib/course-player/lesson-assessment";
import { videoEmbedUrl } from "@/lib/course-player/embed-url";
import { PRODUCT_LOGO_SRC } from "@/lib/branding/site";
import {
  IMAGE_CAROUSEL_CAPTION_MODE_LABELS,
  IMAGE_GRID_LAYOUT_LABELS,
  normalizeImageCarouselItems,
  normalizeImageGridItems,
  resolveQuestionFeedbackAudioSrc,
  type PageContentV1,
  type QuestionFeedbackFields,
} from "@/lib/page-builder";
import {
  blockCountForLayout,
  isColumnsLayout,
  normalizeTextImageContent,
} from "@/lib/page-builder/text-image";
import {
  isEffectivelyEmptyHtml,
  sanitizeBodyHtml,
} from "@/lib/rich-text/sanitize";

import type { ThemeColors } from "@/lib/course-theme/theme";

import { ClickRevealBlock } from "./click-reveal-block";

function RichBodyHtml({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const safe = useMemo(() => sanitizeBodyHtml(html), [html]);
  if (!html.trim() || isEffectivelyEmptyHtml(html)) {
    return (
      <p className="text-sm italic text-zinc-500">No content yet.</p>
    );
  }
  return (
    <div
      className={`cb-rich max-w-none text-inherit leading-relaxed text-zinc-800 [&_a]:text-blue-600 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function QuestionFeedbackDisplay({
  isCorrect,
  content,
  signedAssetUrls,
}: {
  isCorrect: boolean;
  content: QuestionFeedbackFields;
  signedAssetUrls?: Record<string, string>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const text = isCorrect
    ? content.correctFeedback
    : content.incorrectFeedback;
  const assetId = isCorrect
    ? content.correctFeedbackAudioAssetId
    : content.incorrectFeedbackAudioAssetId;
  const src = resolveQuestionFeedbackAudioSrc(assetId, signedAssetUrls);

  useEffect(() => {
    const audio = audioRef.current;
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
  }, [src, isCorrect]);

  if (!text?.trim() && !src) return null;

  const toneClass = isCorrect
    ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-50"
    : "border-red-400 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950/60 dark:text-red-50";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-1 min-h-[3.75rem] rounded-lg border-2 px-5 py-4 text-sm leading-relaxed ${toneClass}`}
    >
      {src ? (
        <audio
          ref={audioRef}
          preload="auto"
          className="sr-only"
          aria-label={isCorrect ? "Correct answer feedback" : "Incorrect answer feedback"}
        />
      ) : null}
      {text?.trim() ? (
        <RichBodyHtml html={text} className="!text-inherit [&_p]:!text-inherit" />
      ) : null}
    </div>
  );
}

function assessSubmitButtonClass() {
  return "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
}

function TextImageFigure({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure className="mx-auto max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="mx-auto max-h-[min(70vh,560px)] w-full object-contain"
        loading="lazy"
      />
      {alt ? (
        <figcaption className="mt-2 text-center text-xs text-zinc-600">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

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

function TextImageTemplate({
  content,
  signedImageUrls,
}: {
  content: Extract<PageContentV1, { template: "text_image" }>;
  signedImageUrls?: Record<string, string>;
}) {
  if (isColumnsLayout(content.layout)) {
    const n = blockCountForLayout(content.layout);
    const blocks = content.blocks ?? [];
    const gridCols =
      content.layout === "columns_2"
        ? "md:grid-cols-2"
        : content.layout === "columns_3"
          ? "md:grid-cols-3"
          : "md:grid-cols-4";
    return (
      <div
        className={`grid grid-cols-1 gap-6 ${gridCols} md:items-start md:gap-6`}
      >
        {Array.from({ length: n }, (_, i) => {
          const block = blocks[i];
          if (!block) return null;
          const src = resolveTextImageSrc(
            block.imageAssetId,
            block.imageUrl,
            signedImageUrls,
          );
          return (
            <div key={block.id} className="flex min-w-0 flex-col gap-4">
              {src ? (
                <TextImageFigure src={src} alt={block.imageAlt || ""} />
              ) : (
                <p className="text-sm text-zinc-500">No image set.</p>
              )}
              <RichBodyHtml html={block.body} />
            </div>
          );
        })}
      </div>
    );
  }

  const src = resolveTextImageSrc(
    content.imageAssetId,
    content.imageUrl,
    signedImageUrls,
  );
  const imageEl = src ? (
    <TextImageFigure src={src} alt={content.imageAlt || ""} />
  ) : (
    <p className="text-sm text-zinc-500">No image set.</p>
  );
  const bodyEl = <RichBodyHtml html={content.body} />;

  switch (content.layout) {
    case "image_left":
      return (
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="w-full shrink-0 md:max-w-[45%]">{imageEl}</div>
          <div className="min-w-0 flex-1">{bodyEl}</div>
        </div>
      );
    case "image_right":
      return (
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="min-w-0 flex-1 md:order-1">{bodyEl}</div>
          <div className="w-full shrink-0 md:max-w-[45%] md:order-2">
            {imageEl}
          </div>
        </div>
      );
    case "image_top_full":
      return (
        <div className="space-y-6">
          {imageEl}
          {bodyEl}
        </div>
      );
    case "text_top_image_bottom_full":
    default:
      return (
        <div className="space-y-6">
          {bodyEl}
          {imageEl}
        </div>
      );
  }
}

export function TemplateRenderer({
  content,
  signedImageUrls,
  courseId,
  pageId,
  passingScorePercent,
  lessonAssessmentPageIds,
  isLastLessonInCourse,
  assessmentAttemptsLimit,
  knowledgeCheckFeedback,
  courseTitle,
  learnerName,
  courseComplete,
  hasFinalAssessment,
  themeColors,
  onNavigateToPageId,
}: {
  content: PageContentV1;
  signedImageUrls?: Record<string, string>;
  courseId?: string;
  /** Current page id (for storing MCQ/MRQ/TF attempts). */
  pageId?: string;
  /** Course mastery threshold (0–100); from course settings. */
  passingScorePercent?: number;
  /** Pages in the current lesson that count toward the lesson quiz score. */
  lessonAssessmentPageIds?: string[];
  /** When true, a completed lesson quiz also writes the LMS export score. */
  isLastLessonInCourse?: boolean;
  /** When true, show author feedback after submit (in-lesson knowledge checks). */
  knowledgeCheckFeedback?: boolean;
  /** Max submitted final-assessment scores; null = unlimited. */
  assessmentAttemptsLimit?: number | null;
  courseTitle?: string;
  learnerName?: string;
  courseComplete?: boolean;
  hasFinalAssessment?: boolean;
  /** Used for tab / accordion accent (highlight color). */
  themeColors?: ThemeColors;
  /** Optional page-id jump handler for navigational templates. */
  onNavigateToPageId?: (pageId: string) => void;
}) {
  const passPct = passingScorePercent ?? 70;
  const assessIds = lessonAssessmentPageIds ?? [];
  const lastLesson = isLastLessonInCourse ?? false;
  const kcFeedback = knowledgeCheckFeedback ?? false;
  const assessmentLimit = assessmentAttemptsLimit ?? null;
  const isComplete = courseComplete ?? false;
  const hasAssessment = hasFinalAssessment ?? false;
  const [assessVersion, setAssessVersion] = useState(0);
  const finalSnapshot = useMemo(
    () => (courseId ? readFinalQuizResult(courseId) : null),
    // assessVersion intentionally triggers re-read after assessment events
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version bump is the refresh signal
    [courseId, assessVersion],
  );

  useEffect(() => {
    const bump = () => setAssessVersion((v) => v + 1);
    window.addEventListener("cbl-final-quiz-updated", bump);
    window.addEventListener("cbl-lesson-assess-updated", bump);
    window.addEventListener("cbl-assessment-attempts-updated", bump);
    return () => {
      window.removeEventListener("cbl-final-quiz-updated", bump);
      window.removeEventListener("cbl-lesson-assess-updated", bump);
      window.removeEventListener("cbl-assessment-attempts-updated", bump);
    };
  }, []);

  const lessonAssessmentEditsLocked = useMemo(() => {
    if (!courseId || !lastLesson) return false;
    if (isFinalAssessmentLocked(courseId, assessmentLimit)) return true;
    return readFinalQuizResult(courseId) !== null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- assessVersion bump refreshes local storage reads
  }, [courseId, lastLesson, assessmentLimit, assessVersion]);

  return (
    <article className="space-y-6">
      {content.template === "text" ? <RichBodyHtml html={content.body} /> : null}

      {content.template === "text_image" ? (
        <TextImageTemplate
          content={normalizeTextImageContent(content)}
          signedImageUrls={signedImageUrls}
        />
      ) : null}

      {content.template === "text_video" ? (
        <TextVideoLayoutRenderer content={content} />
      ) : null}

      {content.template === "two_column" ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          <section className="min-w-0">
            <RichBodyHtml html={content.left} />
          </section>
          <section className="min-w-0">
            <RichBodyHtml html={content.right} />
          </section>
        </div>
      ) : null}

      {content.template === "embed_pdf" ? (
        <EmbedPdfBlock content={content} signedImageUrls={signedImageUrls} />
      ) : null}

      {content.template === "image_carousel" ? (
        <ImageCarouselBlock content={content} signedImageUrls={signedImageUrls} />
      ) : null}

      {content.template === "image_grid" ? (
        <ImageGridBlock
          content={content}
          signedImageUrls={signedImageUrls}
          onNavigateToPageId={onNavigateToPageId}
        />
      ) : null}

      {content.template === "tabs" ? (
        <TabsBlock
          tabs={content.tabs}
          layout={content.layout}
          highlightColor={themeColors?.highlight}
          signedImageUrls={signedImageUrls}
        />
      ) : null}

      {content.template === "accordion" ? (
        <AccordionBlock
          items={content.items}
          highlightColor={themeColors?.highlight}
        />
      ) : null}

      {content.template === "click_reveal" ? (
        <ClickRevealBlock
          content={content}
          signedImageUrls={signedImageUrls}
          highlightColor={themeColors?.highlight}
        />
      ) : null}

      {content.template === "course_completion" ? (
        <CourseCompletionBlock
          content={content}
          unlocked={isComplete}
          courseTitle={courseTitle ?? "Course"}
          learnerName={learnerName ?? "Learner"}
          hasFinalAssessment={hasAssessment}
          scorePercent={finalSnapshot?.scorePercent ?? null}
          logoSrc={resolveTextImageSrc(
            content.logoAssetId,
            content.logoUrl,
            signedImageUrls,
          )}
        />
      ) : null}

      {content.template === "mcq" ? (
        <McqBlock
          content={content}
          courseId={courseId}
          pageId={pageId}
          interactionDisabled={lessonAssessmentEditsLocked}
          knowledgeCheckFeedback={kcFeedback}
          signedAssetUrls={signedImageUrls}
        />
      ) : null}

      {content.template === "mrq" ? (
        <MrqBlock
          content={content}
          courseId={courseId}
          pageId={pageId}
          interactionDisabled={lessonAssessmentEditsLocked}
          knowledgeCheckFeedback={kcFeedback}
          signedAssetUrls={signedImageUrls}
        />
      ) : null}

      {content.template === "true_false" ? (
        <TrueFalseBlock
          content={content}
          courseId={courseId}
          pageId={pageId}
          interactionDisabled={lessonAssessmentEditsLocked}
          knowledgeCheckFeedback={kcFeedback}
          signedAssetUrls={signedImageUrls}
        />
      ) : null}

      {content.template === "final_quiz" ? (
        <FinalQuizBlock
          content={content}
          passingScorePercent={passPct}
          assessmentAttemptsLimit={assessmentLimit}
        />
      ) : null}

      {content.template === "quiz_results" ? (
        <QuizResultsBlock
          content={content}
          courseId={courseId}
          passingScorePercent={passPct}
          lessonAssessmentPageIds={assessIds}
          isLastLessonInCourse={lastLesson}
          assessmentAttemptsLimit={assessmentLimit}
        />
      ) : null}
    </article>
  );
}

function CourseCompletionBlock({
  content,
  unlocked,
  courseTitle,
  learnerName,
  hasFinalAssessment,
  scorePercent,
  logoSrc,
}: {
  content: Extract<PageContentV1, { template: "course_completion" }>;
  unlocked: boolean;
  courseTitle: string;
  learnerName: string;
  hasFinalAssessment: boolean;
  scorePercent: number | null;
  logoSrc: string | null;
}) {
  async function handlePrintCertificate() {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    const scoreLine =
      hasFinalAssessment && typeof scorePercent === "number"
        ? `<p><strong>Passing Score:</strong> ${scorePercent}%</p>`
        : "";
    const printLogoSrc =
      logoSrc?.trim() ||
      `${window.location.origin}${PRODUCT_LOGO_SRC}`;
    const logoMarkup = `<img class="logo-img" src="${escapeAttrLite(printLogoSrc)}" alt="Akhila"/>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Certificate</title><style>@page{size:A4;margin:16mm}body{font-family:Georgia,"Times New Roman",serif;color:#10213a;background:#fff} .sheet{max-width:980px;margin:0 auto;border:12px solid #123a66;padding:12px} .inner{border:2px solid #caa85c;padding:28px 32px 36px} .brand{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px} .logo-box{width:88px;height:88px;border:2px solid #123a66;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff}.logo-placeholder{font:700 14px/1 Arial,sans-serif;color:#123a66;letter-spacing:.08em}.logo-img{width:100%;height:100%;object-fit:contain} .brand h1{margin:0;font:700 18px/1.2 Arial,sans-serif;color:#123a66;text-transform:uppercase;letter-spacing:.08em} .title{margin:18px 0 8px;text-align:center;font:700 40px/1.1 Georgia,serif;color:#0f2745} .lead{margin:0 0 18px;text-align:center;font:400 18px/1.6 Georgia,serif} .meta{margin:22px auto 0;max-width:640px;border-top:1px solid #d8c089;padding-top:14px;font:400 16px/1.7 Georgia,serif} .meta p{margin:4px 0} .sig-wrap{margin-top:38px;display:flex;justify-content:flex-end} .sig{width:240px;text-align:center;font:400 12px/1.2 Arial,sans-serif;color:#334} .sig-line{border-top:1px solid #334;margin-bottom:6px;height:0} .hint{font:italic 13px/1.4 Georgia,serif;color:#5d6a7a;margin-top:2px}.course-line{font-weight:700}</style></head><body><section class="sheet"><div class="inner"><header class="brand"><h1>Course Completion Certificate</h1><div class="logo-box">${logoMarkup}</div></header><h2 class="title">Certificate</h2><p class="lead">Congratulations! You have completed the course <span class="course-line">${escapeHtmlLite(courseTitle)}</span></p><div class="meta"><p><strong>Learner:</strong> ${escapeHtmlLite(learnerName)}</p><p><strong>Date:</strong> ${escapeHtmlLite(date)}</p><p><strong>Time:</strong> ${escapeHtmlLite(time)}</p>${scoreLine}</div><div class="sig-wrap"><div class="sig"><div class="sig-line"></div><div>Authorized Signature (optional)</div><div class="hint">Signature line can be left blank</div></div></div></div></section></body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      return;
    }

    const waitForLogo = () =>
      new Promise<void>((resolve) => {
        const d = iframe.contentDocument;
        if (!d) {
          resolve();
          return;
        }
        const img = d.querySelector<HTMLImageElement>(".logo-img");
        if (!img || img.complete) {
          resolve();
          return;
        }
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        window.setTimeout(done, 1500);
      });

    await waitForLogo();
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 500);
    }
  }

  if (!unlocked) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
        This page unlocks after the course is completed{hasFinalAssessment ? " and the final assessment is passed" : ""}.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/25">
      <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
        Congratulations! You have completed the course {courseTitle}.
      </p>
      <RichBodyHtml html={content.summary} />
      {content.showPrintCertificate !== false ? (
        <button
          type="button"
          onClick={() => {
            void handlePrintCertificate();
          }}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Print Certificate
        </button>
      ) : null}
    </div>
  );
}

function escapeHtmlLite(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttrLite(value: string): string {
  return escapeHtmlLite(value);
}

function EmbedPdfBlock({
  content,
  signedImageUrls,
}: {
  content: Extract<PageContentV1, { template: "embed_pdf" }>;
  signedImageUrls?: Record<string, string>;
}) {
  const src = resolveTextImageSrc(content.pdfAssetId, content.pdfUrl, signedImageUrls);
  return (
    <div className="space-y-4">
      {content.intro.trim() ? <RichBodyHtml html={content.intro} /> : null}
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        PDF must be publicly available or accessible within your corporate
        network to display for learners.
      </p>
      {src ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950/40">
          <iframe
            src={src}
            className="h-[70vh] min-h-[420px] w-full"
            title="Embedded PDF"
            loading="lazy"
          />
          <div className="border-t border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Open PDF in a new tab
            </a>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No PDF selected yet.</p>
      )}
    </div>
  );
}

function ImageCarouselBlock({
  content,
  signedImageUrls,
}: {
  content: Extract<PageContentV1, { template: "image_carousel" }>;
  signedImageUrls?: Record<string, string>;
}) {
  const items = normalizeImageCarouselItems(content.items).filter((item) =>
    resolveTextImageSrc(item.imageAssetId, item.imageUrl, signedImageUrls),
  );
  const [active, setActive] = useState(0);
  const clampedActive =
    items.length === 0 ? 0 : Math.min(active, Math.max(0, items.length - 1));

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No carousel images set.</p>;
  }

  const current = items[clampedActive];
  const src = resolveTextImageSrc(
    current.imageAssetId,
    current.imageUrl,
    signedImageUrls,
  );
  const canPrev = clampedActive > 0;
  const canNext = clampedActive < items.length - 1;

  return (
    <div className="space-y-3">
      {content.intro.trim() ? <RichBodyHtml html={content.intro} /> : null}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Image carousel · {IMAGE_CAROUSEL_CAPTION_MODE_LABELS[content.captionMode]}
      </p>

      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950/40">
        {src ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={current.imageAlt || current.title || `Slide ${clampedActive + 1}`}
              className="aspect-[16/9] w-full object-cover"
              loading="lazy"
            />
            {content.captionMode === "overlay" ? (
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-3 text-white">
                <p className="text-sm font-semibold">
                  {current.title || `Slide ${clampedActive + 1}`}
                </p>
                {current.caption ? (
                  <p className="mt-1 text-xs text-white/90">{current.caption}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {content.captionMode === "below" ? (
          <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {current.title || `Slide ${active + 1}`}
            </p>
            {current.caption ? (
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {current.caption}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setActive((x) => Math.max(0, x - 1))}
          aria-label="Previous slide"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white/95 p-2 text-sm text-zinc-900 shadow disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100"
        >
          &#8592;
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setActive((x) => Math.min(items.length - 1, x + 1))}
          aria-label="Next slide"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white/95 p-2 text-sm text-zinc-900 shadow disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100"
        >
          &#8594;
        </button>
      </div>
    </div>
  );
}

function TextVideoLayoutRenderer({
  content,
}: {
  content: Extract<PageContentV1, { template: "text_video" }>;
}) {
  const body = <RichBodyHtml html={content.body} />;
  const video = <VideoBlock url={content.videoUrl} />;

  switch (content.layout) {
    case "video_only":
      return <div>{video}</div>;
    case "video_top":
      return (
        <div className="space-y-6">
          {video}
          {body}
        </div>
      );
    case "video_left":
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <div className="min-w-0">{video}</div>
          <div className="min-w-0">{body}</div>
        </div>
      );
    case "video_right":
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <div className="min-w-0">{body}</div>
          <div className="min-w-0">{video}</div>
        </div>
      );
    case "text_top":
    default:
      return (
        <div className="space-y-6">
          {body}
          {video}
        </div>
      );
  }
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

function ImageGridBlock({
  content,
  signedImageUrls,
  onNavigateToPageId,
}: {
  content: Extract<PageContentV1, { template: "image_grid" }>;
  signedImageUrls?: Record<string, string>;
  onNavigateToPageId?: (pageId: string) => void;
}) {
  const items = normalizeImageGridItems(
    content.layout,
    content.rowMode,
    content.items,
  );
  const visible = items.filter((item) =>
    resolveTextImageSrc(item.imageAssetId, item.imageUrl, signedImageUrls),
  );
  const colCount =
    content.rowMode === "single_row"
      ? Math.max(1, visible.length)
      : Math.max(1, Math.ceil(visible.length / 2));
  const gridCols =
    colCount <= 1
      ? "md:grid-cols-1"
      : colCount === 2
        ? "md:grid-cols-2"
        : colCount === 3
          ? "md:grid-cols-3"
          : colCount === 4
            ? "md:grid-cols-4"
            : colCount === 5
              ? "md:grid-cols-5"
              : colCount === 6
                ? "md:grid-cols-6"
                : colCount === 7
                  ? "md:grid-cols-7"
                  : "md:grid-cols-8";

  function openAction(item: (typeof items)[number]) {
    if (item.linkKind === "page" && item.targetPageId && onNavigateToPageId) {
      onNavigateToPageId(item.targetPageId);
      return;
    }
    if (item.linkKind === "external" && item.externalUrl.trim()) {
      window.open(item.externalUrl.trim(), "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-4">
      {content.intro.trim() ? <RichBodyHtml html={content.intro} /> : null}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {IMAGE_GRID_LAYOUT_LABELS[content.layout]} image grid ·{" "}
        {content.rowMode === "single_row" ? "single row" : "two rows"}
      </p>
      <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
        {visible.map((item, idx) => {
          const src = resolveTextImageSrc(
            item.imageAssetId,
            item.imageUrl,
            signedImageUrls,
          );
          const clickable =
            (item.linkKind === "page" && !!item.targetPageId && !!onNavigateToPageId) ||
            (item.linkKind === "external" && !!item.externalUrl.trim());
          return (
            <div
              key={item.id}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950/40"
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => openAction(item)}
                className={`block w-full text-left ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="relative">
                  {src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={src}
                      alt={item.imageAlt || item.title || `Grid image ${idx + 1}`}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      No image
                    </div>
                  )}
                  {content.captionMode === "hover" ? (
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="font-semibold">{item.title || `Tile ${idx + 1}`}</p>
                      {item.caption ? <p className="mt-1">{item.caption}</p> : null}
                    </div>
                  ) : null}
                </div>
                {content.captionMode === "below" ? (
                  <div className="space-y-1 px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title || `Tile ${idx + 1}`}
                    </p>
                    {item.caption ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {item.caption}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabsBlock({
  tabs,
  layout,
  highlightColor,
  signedImageUrls,
}: {
  tabs: {
    id: string;
    label: string;
    body: string;
    imageAssetId?: string | null;
    imageUrl: string;
    imageAlt: string;
  }[];
  layout: "horizontal" | "vertical_left";
  highlightColor?: string;
  signedImageUrls?: Record<string, string>;
}) {
  const [active, setActive] = useState(0);
  const safe = tabs.length
    ? tabs
    : [
        {
          id: "x",
          label: "Tab",
          body: "",
          imageAssetId: null,
          imageUrl: "",
          imageAlt: "",
        },
      ];
  const hl = highlightColor?.trim();
  const activeTab = safe[active];
  const activeImgSrc = activeTab
    ? resolveTextImageSrc(
        activeTab.imageAssetId,
        activeTab.imageUrl,
        signedImageUrls,
      )
    : null;
  return (
    <div
      className={
        layout === "vertical_left"
          ? "grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start"
          : ""
      }
    >
      <div
        className={
          layout === "vertical_left"
            ? "flex flex-col gap-1 border-r border-zinc-200 pr-3 dark:border-zinc-700"
            : "flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-700"
        }
        role="tablist"
        aria-orientation={layout === "vertical_left" ? "vertical" : "horizontal"}
        aria-label="Tabs"
      >
        {safe.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={
              hl
                ? `${layout === "vertical_left" ? "rounded-md border-l-2" : "rounded-t-md border-b-2"} px-4 py-2 text-sm font-medium transition-colors ${
                    i === active
                      ? "font-semibold"
                      : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`
                : `rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                    i === active
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`
            }
            style={
              hl
                ? {
                    ...(layout === "vertical_left"
                      ? { borderLeftColor: i === active ? hl : "transparent" }
                      : { borderBottomColor: i === active ? hl : "transparent" }),
                    color: i === active ? hl : undefined,
                  }
                : undefined
            }
            onClick={() => setActive(i)}
          >
            {tab.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      <div
        className={
          layout === "vertical_left"
            ? "border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-950/50"
            : "border border-t-0 border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-950/50"
        }
        role="tabpanel"
      >
        {layout === "horizontal" && activeImgSrc ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
            <div className="min-w-0">
              <TextImageFigure src={activeImgSrc} alt={activeTab?.imageAlt || ""} />
            </div>
            <div className="min-w-0">
              <RichBodyHtml html={activeTab?.body ?? ""} />
            </div>
          </div>
        ) : layout === "vertical_left" && activeImgSrc ? (
          <div className="space-y-5">
            <TextImageFigure src={activeImgSrc} alt={activeTab?.imageAlt || ""} />
            <RichBodyHtml html={activeTab?.body ?? ""} />
          </div>
        ) : (
          <RichBodyHtml html={activeTab?.body ?? ""} />
        )}
      </div>
    </div>
  );
}

function AccordionBlock({
  items,
  highlightColor,
}: {
  items: { id: string; title: string; body: string }[];
  highlightColor?: string;
}) {
  const safe = items.length
    ? items
    : [{ id: "x", title: "Section", body: "" }];
  const hl = highlightColor?.trim();
  return (
    <div
      className="space-y-2"
      style={
        hl
          ? ({ ["--cbl-accordion-hl"]: hl } as CSSProperties)
          : undefined
      }
    >
      {safe.map((item) => (
        <details
          key={item.id}
          className={`group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950/50 ${
            hl
              ? "[&[open]]:border-l-4 [&[open]]:border-solid [&[open]]:border-[color:var(--cbl-accordion-hl)] [&[open]]:bg-zinc-50/70 dark:[&[open]]:bg-zinc-900/50"
              : ""
          }`}
        >
          <summary
            className={`cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-900 marker:hidden dark:text-zinc-100 [&::-webkit-details-marker]:hidden ${
              hl ? "group-open:text-[color:var(--cbl-accordion-hl)]" : ""
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              {item.title || "Section"}
              <span
                className={
                  hl
                    ? "text-zinc-400 transition-colors group-open:text-[color:var(--cbl-accordion-hl)] group-open:rotate-180"
                    : "text-zinc-400 group-open:rotate-180"
                }
              >
                ▼
              </span>
            </span>
          </summary>
          <div className="border-t border-zinc-100 px-4 pb-4 pt-2 dark:border-zinc-800">
            <RichBodyHtml html={item.body} />
          </div>
        </details>
      ))}
    </div>
  );
}

function McqBlock({
  content,
  courseId,
  pageId,
  interactionDisabled,
  knowledgeCheckFeedback,
  signedAssetUrls,
}: {
  content: Extract<PageContentV1, { template: "mcq" }>;
  courseId?: string;
  pageId?: string;
  interactionDisabled?: boolean;
  knowledgeCheckFeedback?: boolean;
  signedAssetUrls?: Record<string, string>;
}) {
  const kc = !!knowledgeCheckFeedback;
  const [picked, setPicked] = useState<number | null>(() => {
    if (typeof window === "undefined" || !courseId || !pageId) return null;
    const s = readPageAssessment(courseId, pageId);
    return typeof s?.mcqPick === "number" ? s.mcqPick : null;
  });
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === "undefined" || !courseId || !pageId) return false;
    return readPageAssessment(courseId, pageId) !== null;
  });

  useEffect(() => {
    if (!courseId || !pageId) return;
    const cid = courseId;
    const pid = pageId;
    function sync() {
      const s = readPageAssessment(cid, pid);
      setPicked(typeof s?.mcqPick === "number" ? s.mcqPick : null);
      setSubmitted(s !== null);
    }
    sync();
    window.addEventListener("cbl-lesson-assess-updated", sync);
    return () =>
      window.removeEventListener("cbl-lesson-assess-updated", sync);
  }, [courseId, pageId]);

  const frozen = !!interactionDisabled;
  const showResults = submitted;
  const isCorrect = picked === content.correctIndex;

  function handlePick(idx: number) {
    if (frozen || (kc && submitted)) return;
    setPicked(idx);
    if (!kc) {
      setSubmitted(true);
      if (courseId && pageId) {
        writePageAssessment(courseId, pageId, {
          correct: idx === content.correctIndex,
          mcqPick: idx,
        });
      }
    }
  }

  function handleSubmit() {
    if (frozen || !kc || submitted || picked === null) return;
    setSubmitted(true);
    if (courseId && pageId) {
      writePageAssessment(courseId, pageId, {
        correct: picked === content.correctIndex,
        mcqPick: picked,
      });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {content.question || "Question"}
      </p>
      <ul className="space-y-2">
        {content.options.map((opt, idx) => {
          const isCorrectOption = idx === content.correctIndex;
          const isPicked = picked === idx;
          let itemClass =
            "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500";
          if (showResults && isPicked) {
            itemClass = isCorrectOption
              ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
              : "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40";
          } else if (showResults && isCorrectOption) {
            itemClass =
              "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40";
          } else if (kc && isPicked && !submitted) {
            itemClass =
              "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800";
          }
          return (
            <li key={idx}>
              <button
                type="button"
                disabled={frozen}
                onClick={() => handlePick(idx)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${itemClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {opt || `Option ${idx + 1}`}
              </button>
            </li>
          );
        })}
      </ul>
      {kc && !submitted ? (
        <button
          type="button"
          disabled={frozen || picked === null}
          onClick={handleSubmit}
          className={assessSubmitButtonClass()}
        >
          Submit
        </button>
      ) : null}
      {showResults && picked !== null ? (
        kc ? (
          <QuestionFeedbackDisplay
            isCorrect={isCorrect}
            content={content}
            signedAssetUrls={signedAssetUrls}
          />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isCorrect ? "Correct." : "Incorrect."}
          </p>
        )
      ) : null}
    </div>
  );
}

function MrqBlock({
  content,
  courseId,
  pageId,
  interactionDisabled,
  knowledgeCheckFeedback,
  signedAssetUrls,
}: {
  content: Extract<PageContentV1, { template: "mrq" }>;
  courseId?: string;
  pageId?: string;
  interactionDisabled?: boolean;
  knowledgeCheckFeedback?: boolean;
  signedAssetUrls?: Record<string, string>;
}) {
  const kc = !!knowledgeCheckFeedback;
  const [selected, setSelected] = useState<Set<number>>(() => {
    if (typeof window === "undefined" || !courseId || !pageId) {
      return new Set();
    }
    const s = readPageAssessment(courseId, pageId);
    if (s && Array.isArray(s.mrqSelected)) return new Set(s.mrqSelected);
    return new Set();
  });
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === "undefined" || !courseId || !pageId) return false;
    return readPageAssessment(courseId, pageId) !== null;
  });

  useEffect(() => {
    if (!courseId || !pageId) return;
    const cid = courseId;
    const pid = pageId;
    function sync() {
      const s = readPageAssessment(cid, pid);
      if (s && Array.isArray(s.mrqSelected)) {
        setSelected(new Set(s.mrqSelected));
        setSubmitted(true);
      } else {
        setSelected(new Set());
        setSubmitted(false);
      }
    }
    sync();
    window.addEventListener("cbl-lesson-assess-updated", sync);
    return () =>
      window.removeEventListener("cbl-lesson-assess-updated", sync);
  }, [courseId, pageId]);

  const correctSet = useMemo(
    () => new Set(content.correctIndices),
    [content.correctIndices],
  );

  const frozen = !!interactionDisabled;

  function toggle(i: number) {
    if (frozen || submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function check() {
    if (frozen || submitted) return;
    setSubmitted(true);
    const isMatch =
      correctSet.size === selected.size &&
      [...correctSet].every((i) => selected.has(i));
    if (courseId && pageId) {
      writePageAssessment(courseId, pageId, {
        correct: isMatch,
        mrqSelected: [...selected].sort((a, b) => a - b),
      });
    }
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
          if (submitted) {
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
                disabled={frozen}
                onClick={() => toggle(idx)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${itemClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {opt || `Option ${idx + 1}`}
              </button>
            </li>
          );
        })}
      </ul>
      {!submitted ? (
        <button
          type="button"
          disabled={frozen || selected.size === 0}
          onClick={check}
          className={assessSubmitButtonClass()}
        >
          Submit
        </button>
      ) : null}
      {submitted ? (
        kc ? (
          <QuestionFeedbackDisplay
            isCorrect={isMatch}
            content={content}
            signedAssetUrls={signedAssetUrls}
          />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isMatch
              ? "Correct — all right choices selected."
              : "Not quite — review the highlighted options."}
          </p>
        )
      ) : null}
    </div>
  );
}

function TrueFalseBlock({
  content,
  courseId,
  pageId,
  interactionDisabled,
  knowledgeCheckFeedback,
  signedAssetUrls,
}: {
  content: Extract<PageContentV1, { template: "true_false" }>;
  courseId?: string;
  pageId?: string;
  interactionDisabled?: boolean;
  knowledgeCheckFeedback?: boolean;
  signedAssetUrls?: Record<string, string>;
}) {
  const kc = !!knowledgeCheckFeedback;
  const [picked, setPicked] = useState<boolean | null>(() => {
    if (typeof window === "undefined" || !courseId || !pageId) return null;
    const s = readPageAssessment(courseId, pageId);
    return typeof s?.tfPick === "boolean" ? s.tfPick : null;
  });
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === "undefined" || !courseId || !pageId) return false;
    return readPageAssessment(courseId, pageId) !== null;
  });

  useEffect(() => {
    if (!courseId || !pageId) return;
    const cid = courseId;
    const pid = pageId;
    function sync() {
      const s = readPageAssessment(cid, pid);
      setPicked(typeof s?.tfPick === "boolean" ? s.tfPick : null);
      setSubmitted(s !== null);
    }
    sync();
    window.addEventListener("cbl-lesson-assess-updated", sync);
    return () =>
      window.removeEventListener("cbl-lesson-assess-updated", sync);
  }, [courseId, pageId]);

  const frozen = !!interactionDisabled;
  const isCorrect = picked === content.correct;

  function handlePick(val: boolean) {
    if (frozen || (kc && submitted)) return;
    setPicked(val);
    if (!kc) {
      setSubmitted(true);
      if (courseId && pageId) {
        writePageAssessment(courseId, pageId, {
          correct: val === content.correct,
          tfPick: val,
        });
      }
    }
  }

  function handleSubmit() {
    if (frozen || !kc || submitted || picked === null) return;
    setSubmitted(true);
    if (courseId && pageId) {
      writePageAssessment(courseId, pageId, {
        correct: picked === content.correct,
        tfPick: picked,
      });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {content.question || "Statement"}
      </p>
      <div className="flex flex-wrap gap-3">
        {([true, false] as const).map((val) => {
          const isPicked = picked === val;
          let btnClass =
            "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500";
          if (submitted && isPicked) {
            btnClass =
              val === content.correct
                ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100";
          } else if (kc && isPicked && !submitted) {
            btnClass =
              "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800";
          }
          return (
            <button
              key={String(val)}
              type="button"
              disabled={frozen}
              onClick={() => handlePick(val)}
              className={`rounded-lg border px-6 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${btnClass}`}
            >
              {val ? "True" : "False"}
            </button>
          );
        })}
      </div>
      {kc && !submitted ? (
        <button
          type="button"
          disabled={frozen || picked === null}
          onClick={handleSubmit}
          className={assessSubmitButtonClass()}
        >
          Submit
        </button>
      ) : null}
      {submitted && picked !== null ? (
        kc ? (
          <QuestionFeedbackDisplay
            isCorrect={isCorrect}
            content={content}
            signedAssetUrls={signedAssetUrls}
          />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isCorrect ? "Correct." : "Incorrect."}
          </p>
        )
      ) : null}
    </div>
  );
}

function FinalQuizBlock({
  content,
  passingScorePercent,
  assessmentAttemptsLimit,
}: {
  content: Extract<PageContentV1, { template: "final_quiz" }>;
  passingScorePercent: number;
  assessmentAttemptsLimit: number | null;
}) {
  return (
    <div className="space-y-6 rounded-xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
      <RichBodyHtml html={content.intro} />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Passing score for this course:{" "}
        <span className="font-semibold">{passingScorePercent}%</span>
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Assessment attempts:{" "}
        {assessmentAttemptsLimit === null ? (
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            unlimited
          </span>
        ) : (
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            up to {assessmentAttemptsLimit} submitted score
            {assessmentAttemptsLimit === 1 ? "" : "s"}
          </span>
        )}
        . Use the lesson menu to open each question page (MCQ, MRQ, or
        True/False), then open the Quiz results page at the end of this lesson.
        Your score is recorded when every question is answered; use Retake
        assessment there if another attempt is allowed.
      </p>
    </div>
  );
}

function QuizResultsBlock({
  content,
  courseId,
  passingScorePercent,
  lessonAssessmentPageIds,
  isLastLessonInCourse,
  assessmentAttemptsLimit,
}: {
  content: Extract<PageContentV1, { template: "quiz_results" }>;
  courseId?: string;
  passingScorePercent: number;
  lessonAssessmentPageIds: string[];
  isLastLessonInCourse: boolean;
  assessmentAttemptsLimit: number | null;
}) {
  const [tick, setTick] = useState(0);
  const assessIdsKey = lessonAssessmentPageIds.join(",");

  useEffect(() => {
    function bump() {
      setTick((t) => t + 1);
    }
    window.addEventListener("cbl-lesson-assess-updated", bump);
    return () =>
      window.removeEventListener("cbl-lesson-assess-updated", bump);
  }, []);

  const summary = useMemo(() => {
    if (!courseId) {
      return {
        total: 0,
        answered: 0,
        correct: 0,
        scorePercent: 0,
        allAnswered: false,
        passed: false,
      };
    }
    const ids = lessonAssessmentPageIds;
    let correct = 0;
    let answered = 0;
    for (const id of ids) {
      const r = readPageAssessment(courseId, id);
      if (r === null) continue;
      answered += 1;
      if (r.correct) correct += 1;
    }
    const total = ids.length;
    const scorePercent =
      total === 0 ? 0 : Math.round((correct / total) * 100);
    const allAnswered = total > 0 && answered === total;
    const passed = scorePercent >= passingScorePercent;
    return { total, answered, correct, scorePercent, allAnswered, passed };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick bump refreshes lesson assessment reads
  }, [courseId, lessonAssessmentPageIds, tick, passingScorePercent]);

  useEffect(() => {
    if (
      !courseId ||
      !isLastLessonInCourse ||
      !summary.allAnswered ||
      summary.total === 0
    ) {
      return;
    }
    writeFinalQuizResult(courseId, {
      passed: summary.passed,
      scorePercent: summary.scorePercent,
    });
    const { committed } = tryCommitAssessmentCompletion(
      courseId,
      lessonAssessmentPageIds,
    );
    if (committed) {
      window.dispatchEvent(new Event("cbl-assessment-attempts-updated"));
    }
  }, [
    courseId,
    isLastLessonInCourse,
    summary.allAnswered,
    summary.passed,
    summary.scorePercent,
    summary.total,
    assessIdsKey,
    lessonAssessmentPageIds,
  ]);

  function handleRetake() {
    if (!courseId) return;
    bumpAssessmentAttemptEpoch(courseId);
    clearPageAssessmentsForPageIds(courseId, lessonAssessmentPageIds);
    clearFinalQuizResult(courseId);
    setTick((t) => t + 1);
  }

  const attemptsMeta =
    courseId && isLastLessonInCourse ? (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Submitted attempts (LMS score):{" "}
        {readAssessmentAttemptsUsed(courseId)}
        {assessmentAttemptsLimit === null
          ? " (unlimited)."
          : ` of ${assessmentAttemptsLimit} allowed.`}
      </p>
    ) : null;

  const retakeAllowed =
    !!courseId &&
    isLastLessonInCourse &&
    canRetakeAssessment(courseId, assessmentAttemptsLimit);

  const retakeFooter =
    courseId && isLastLessonInCourse && summary.allAnswered ? (
      <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {attemptsMeta}
        {retakeAllowed ? (
          <button
            type="button"
            onClick={handleRetake}
            className="w-fit rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Retake assessment
          </button>
        ) : assessmentAttemptsLimit !== null ? (
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Assessment locked — you have used all allowed attempts.
          </p>
        ) : null}
      </div>
    ) : null;

  const introBlock =
    content.intro.trim() ? (
      <div className="mb-4">
        <RichBodyHtml html={content.intro} />
      </div>
    ) : null;

  if (!courseId) {
    return (
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        {introBlock}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Quiz results need course context to display the learner&apos;s outcome.
        </p>
      </div>
    );
  }

  if (summary.total === 0) {
    return (
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        {introBlock}
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          There are no scored question pages (MCQ, MRQ, or True/False) in this
          lesson yet. Add them in the builder, before this results page.
        </p>
      </div>
    );
  }

  const scoreLine = (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-900/80">
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        You scored {summary.scorePercent}% on the test. The passing score is{" "}
        {passingScorePercent}%.
      </p>
    </div>
  );

  if (!summary.allAnswered) {
    const partialPct =
      summary.answered === 0
        ? null
        : Math.round((summary.correct / summary.answered) * 100);
    return (
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        {introBlock}
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          The passing score for this course is{" "}
          <span className="font-semibold">{passingScorePercent}%</span>.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You have answered {summary.answered} of {summary.total} question
          {summary.total === 1 ? "" : "s"} in this lesson.
          {partialPct !== null
            ? ` Score so far (answered questions only): ${partialPct}%.`
            : ""}{" "}
          Complete every question page in this lesson, then return here for your
          final score and feedback.
        </p>
      </div>
    );
  }

  if (summary.passed) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/25">
        {scoreLine}
        {introBlock}
        <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          You passed
        </p>
        <RichBodyHtml
          html={content.passMessage.trim() ? content.passMessage : "<p>Congratulations.</p>"}
        />
        {retakeFooter}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/90 p-6 dark:border-red-900/50 dark:bg-red-950/25">
      {scoreLine}
      {introBlock}
      <p className="text-lg font-semibold text-red-900 dark:text-red-100">
        You did not pass
      </p>
      <RichBodyHtml
        html={
          content.failMessage.trim()
            ? content.failMessage
            : "<p>Please review the material and try again.</p>"
        }
      />
      {retakeFooter}
    </div>
  );
}
