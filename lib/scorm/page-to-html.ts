import { videoEmbedUrl } from "@/lib/course-player/embed-url";
import {
  hasQuestionFeedback,
  normalizeClickRevealItems,
  normalizeImageCarouselItems,
  normalizeImageGridItems,
  scormClickRevealGridClass,
  type ClickRevealItem,
  type PageContentV1,
  type QuestionFeedbackFields,
} from "@/lib/page-builder";
import {
  blockCountForLayout,
  isColumnsLayout,
  normalizeTextImageContent,
} from "@/lib/page-builder/text-image";
import { isLikelyRichHtml } from "@/lib/rich-text/is-likely-html";
import { sanitizeBodyHtml } from "@/lib/rich-text/sanitize";

import { escapeAttr, escapeHtml } from "./html-escape";

/** When exporting SCORM, map asset ids to paths inside the zip (e.g. media/uuid.png). */
export type PageHtmlScormOptions = {
  scormRelative?: Record<string, string>;
  pageIndexById?: Record<string, number>;
};

function textImageSrc(
  content: Extract<PageContentV1, { template: "text_image" }>,
  scorm?: Record<string, string>,
): string {
  if (content.imageAssetId && scorm?.[content.imageAssetId]) {
    return scorm[content.imageAssetId];
  }
  return content.imageUrl.trim();
}

function textImageBlockSrc(
  block: {
    imageAssetId?: string | null;
    imageUrl: string;
  },
  scorm?: Record<string, string>,
): string {
  if (block.imageAssetId && scorm?.[block.imageAssetId]) {
    return scorm[block.imageAssetId];
  }
  return block.imageUrl.trim();
}

function tabImageSrc(
  tab: {
    imageAssetId?: string | null;
    imageUrl: string;
  },
  scorm?: Record<string, string>,
): string {
  if (tab.imageAssetId && scorm?.[tab.imageAssetId]) {
    return scorm[tab.imageAssetId];
  }
  return tab.imageUrl.trim();
}

function imageGridCardHtml(
  item: {
    id: string;
    title: string;
    caption: string;
    imageAssetId?: string | null;
    imageUrl: string;
    imageAlt: string;
    linkKind: "none" | "page" | "external";
    targetPageId: string | null;
    externalUrl: string;
  },
  scorm?: Record<string, string>,
  pageIndexById?: Record<string, number>,
  captionMode: "hover" | "below" = "hover",
): string {
  const src = tabImageSrc(item, scorm);
  const img = src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(item.imageAlt || item.title || "Image")}" loading="lazy"/>`
    : `<div class="cb-grid-no-image">No image</div>`;

  let attrs = "";
  if (item.linkKind === "external" && item.externalUrl.trim()) {
    attrs = ` data-link-kind="external" data-link-url="${escapeAttr(item.externalUrl.trim())}"`;
  } else if (
    item.linkKind === "page" &&
    item.targetPageId &&
    pageIndexById &&
    typeof pageIndexById[item.targetPageId] === "number"
  ) {
    attrs = ` data-link-kind="page" data-jump-index="${pageIndexById[item.targetPageId]}"`;
  }

  const hoverCaption =
    captionMode === "hover"
      ? `<div class="cb-grid-hover"><p class="cb-grid-title">${escapeHtml(item.title || "Tile")}</p>${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ""}</div>`
      : "";
  const belowCaption =
    captionMode === "below"
      ? `<div class="cb-grid-below"><p class="cb-grid-title">${escapeHtml(item.title || "Tile")}</p>${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ""}</div>`
      : "";

  return `<button type="button" class="cb-grid-card"${attrs}><div class="cb-grid-media">${img}${hoverCaption}</div>${belowCaption}</button>`;
}

function imageCarouselSlideHtml(
  item: {
    id: string;
    title: string;
    caption: string;
    imageAssetId?: string | null;
    imageUrl: string;
    imageAlt: string;
  },
  scorm?: Record<string, string>,
  captionMode: "overlay" | "below" = "overlay",
): string {
  const src = tabImageSrc(item, scorm);
  const image = src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(item.imageAlt || item.title || "Slide image")}" loading="lazy"/>`
    : `<div class="cb-carousel-no-image">No image</div>`;
  const overlay =
    captionMode === "overlay"
      ? `<div class="cb-carousel-overlay"><p class="cb-grid-title">${escapeHtml(item.title || "Slide")}</p>${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ""}</div>`
      : "";
  const below =
    captionMode === "below"
      ? `<div class="cb-carousel-below"><p class="cb-grid-title">${escapeHtml(item.title || "Slide")}</p>${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ""}</div>`
      : "";
  return `<div class="cb-carousel-slide"><div class="cb-carousel-media">${image}${overlay}</div>${below}</div>`;
}

function textImageFigureHtml(src: string, alt: string): string {
  return src
    ? `<figure class="cb-figure"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy"/>${alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : ""}</figure>`
    : '<p class="cb-muted">No image set.</p>';
}

function questionFeedbackAudioSrc(
  assetId: string | null | undefined,
  scorm?: Record<string, string>,
): string {
  if (assetId && scorm?.[assetId]) return scorm[assetId];
  return "";
}

function questionFeedbackAttrs(
  content: QuestionFeedbackFields,
  scorm?: Record<string, string>,
): string {
  if (!hasQuestionFeedback(content)) return "";
  const correctAudio = questionFeedbackAudioSrc(
    content.correctFeedbackAudioAssetId,
    scorm,
  );
  const incorrectAudio = questionFeedbackAudioSrc(
    content.incorrectFeedbackAudioAssetId,
    scorm,
  );
  return ` data-kc-feedback="true" data-correct-audio="${escapeAttr(correctAudio)}" data-incorrect-audio="${escapeAttr(incorrectAudio)}"`;
}

function questionFeedbackMarkup(content: QuestionFeedbackFields): string {
  if (!hasQuestionFeedback(content)) return "";
  return `<div class="cb-kc-feedback-src" hidden><div class="cb-kc-correct">${bodyContentForExport(content.correctFeedback ?? "")}</div><div class="cb-kc-incorrect">${bodyContentForExport(content.incorrectFeedback ?? "")}</div></div>`;
}

function clickRevealImageSrc(
  assetId: string | null | undefined,
  url: string,
  scorm?: Record<string, string>,
): string {
  if (assetId && scorm?.[assetId]) return scorm[assetId];
  return url.trim();
}

function clickRevealCardFrontHtml(
  card: ClickRevealItem,
  index: number,
  scorm?: Record<string, string>,
): string {
  const src = clickRevealImageSrc(
    card.cardImageAssetId,
    card.cardImageUrl,
    scorm,
  );
  const img = src
    ? `<div class="cb-cr-media"><img src="${escapeAttr(src)}" alt="${escapeAttr(card.cardImageAlt || card.cardTitle || `Item ${index + 1}`)}" loading="lazy"/></div>`
    : "";
  const title = card.cardTitle.trim()
    ? `<p class="cb-cr-title">${escapeHtml(card.cardTitle)}</p>`
    : "";
  const body = card.cardBody.trim()
    ? `<div class="cb-cr-teaser">${bodyContentForExport(card.cardBody)}</div>`
    : "";
  const cta = `<span class="cb-cr-cta">Learn more…</span>`;
  return `<button type="button" class="cb-cr-card" data-cr-index="${index}">${img}<div class="cb-cr-card-body">${title}${body}${cta}</div></button>`;
}

function clickRevealPanelHtml(
  card: ClickRevealItem,
  index: number,
  scorm?: Record<string, string>,
): string {
  const revealSrc =
    clickRevealImageSrc(card.revealImageAssetId, card.revealImageUrl, scorm) ||
    clickRevealImageSrc(card.cardImageAssetId, card.cardImageUrl, scorm);
  const img = revealSrc
    ? `<img class="cb-cr-dialog-img" src="${escapeAttr(revealSrc)}" alt="${escapeAttr(card.revealImageAlt || card.cardImageAlt || card.revealTitle || card.cardTitle || `Item ${index + 1}`)}" loading="lazy"/>`
    : "";
  const title = escapeHtml(
    card.revealTitle.trim() || card.cardTitle.trim() || "Details",
  );
  const body = card.revealBody.trim()
    ? `<div class="cb-block">${bodyContentForExport(card.revealBody)}</div>`
    : "";
  const audioSrc =
    card.revealAudioAssetId && scorm?.[card.revealAudioAssetId]
      ? scorm[card.revealAudioAssetId]
      : "";
  const audioAttr = audioSrc
    ? ` data-cr-audio-src="${escapeAttr(audioSrc)}"`
    : "";
  return `<div class="cb-cr-panel" data-cr-panel="${index}" hidden${audioAttr}>${img}<div class="cb-cr-panel-body"><h3 class="cb-cr-dialog-title">${title}</h3>${body}<button type="button" class="cb-cr-back">Go back</button></div></div>`;
}

function bodyParagraphs(text: string): string {
  if (!text.trim()) {
    return '<p class="cb-muted">No content yet.</p>';
  }
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map(
      (para) =>
        `<p class="cb-body">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n");
}

/** Rich HTML from the builder, or legacy plain text → escaped paragraphs. */
function bodyContentForExport(text: string): string {
  if (!text.trim()) {
    return '<p class="cb-muted">No content yet.</p>';
  }
  if (isLikelyRichHtml(text)) {
    return `<div class="cb-rich">${sanitizeBodyHtml(text)}</div>`;
  }
  return bodyParagraphs(text);
}

function videoHtml(url: string): string {
  const u = url.trim();
  if (!u) return '<p class="cb-muted">No video URL set.</p>';
  const embed = videoEmbedUrl(u);
  if (embed) {
    return `<div class="cb-video"><iframe title="Video" src="${escapeAttr(embed)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe></div>`;
  }
  return `<p><a href="${escapeAttr(u)}" target="_blank" rel="noopener noreferrer">Open video link</a></p>`;
}

export function pageContentToHtml(
  content: PageContentV1,
  scorm?: PageHtmlScormOptions,
): string {
  switch (content.template) {
    case "text":
      return `<div class="cb-block">${bodyContentForExport(content.body)}</div>`;

    case "text_image": {
      const c = normalizeTextImageContent(content);
      if (isColumnsLayout(c.layout)) {
        const n = blockCountForLayout(c.layout);
        const blocks = c.blocks ?? [];
        const colsClass =
          c.layout === "columns_2"
            ? "cb-ti-cols-2"
            : c.layout === "columns_3"
              ? "cb-ti-cols-3"
              : "cb-ti-cols-4";
        const parts: string[] = [];
        for (let i = 0; i < n; i++) {
          const b = blocks[i];
          if (!b) continue;
          const src = textImageBlockSrc(b, scorm?.scormRelative);
          parts.push(
            `<div class="cb-ti-block">${textImageFigureHtml(src, b.imageAlt)}<div class="cb-block">${bodyContentForExport(b.body)}</div></div>`,
          );
        }
        return `<div class="cb-ti-columns ${colsClass}">${parts.join("")}</div>`;
      }
      const src = textImageSrc(c, scorm?.scormRelative);
      const img = textImageFigureHtml(src, c.imageAlt);
      const bodyHtml = `<div class="cb-block">${bodyContentForExport(c.body)}</div>`;
      switch (c.layout) {
        case "image_left":
          return `<div class="cb-ti-row cb-ti-image-left">${img}${bodyHtml}</div>`;
        case "image_right":
          return `<div class="cb-ti-row cb-ti-image-right">${bodyHtml}${img}</div>`;
        case "image_top_full":
          return `<div class="cb-ti-stack">${img}${bodyHtml}</div>`;
        case "text_top_image_bottom_full":
        default:
          return `<div class="cb-ti-stack">${bodyHtml}${img}</div>`;
      }
    }

    case "text_video": {
      const vid = videoHtml(content.videoUrl);
      const bodyHtml = `<div class="cb-block">${bodyContentForExport(content.body)}</div>`;
      switch (content.layout) {
        case "video_only":
          return `${vid}`;
        case "video_top":
          return `<div class="cb-tv-stack">${vid}${bodyHtml}</div>`;
        case "video_left":
          return `<div class="cb-tv-row cb-tv-video-left">${vid}${bodyHtml}</div>`;
        case "video_right":
          return `<div class="cb-tv-row cb-tv-video-right">${bodyHtml}${vid}</div>`;
        case "text_top":
        default:
          return `<div class="cb-tv-stack">${bodyHtml}${vid}</div>`;
      }
    }

    case "two_column":
      return `<div class="cb-two-col"><section>${bodyContentForExport(content.left)}</section><section>${bodyContentForExport(content.right)}</section></div>`;

    case "embed_pdf": {
      const src = tabImageSrc(
        { imageAssetId: content.pdfAssetId, imageUrl: content.pdfUrl },
        scorm?.scormRelative,
      );
      const intro = content.intro.trim()
        ? `<div class="cb-block">${bodyContentForExport(content.intro)}</div>`
        : "";
      const note =
        '<p class="cb-note">Author note: PDF must be publicly available or accessible within your corporate network for learners to open it.</p>';
      if (!src) return `${intro}${note}<p class="cb-muted">No PDF selected yet.</p>`;
      return `${intro}${note}<div class="cb-pdf-wrap"><iframe src="${escapeAttr(src)}" title="Embedded PDF"></iframe></div><p class="cb-note"><a href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer">Open PDF in new tab</a></p>`;
    }

    case "image_carousel": {
      const items = normalizeImageCarouselItems(content.items).filter((it) =>
        !!tabImageSrc(it, scorm?.scormRelative),
      );
      if (!items.length) {
        const intro = content.intro.trim()
          ? `<div class="cb-block">${bodyContentForExport(content.intro)}</div>`
          : "";
        return `${intro}<p class="cb-muted">No carousel images set.</p>`;
      }
      const intro = content.intro.trim()
        ? `<div class="cb-block">${bodyContentForExport(content.intro)}</div>`
        : "";
      const slides = items
        .map((it) =>
          imageCarouselSlideHtml(it, scorm?.scormRelative, content.captionMode),
        )
        .join("");
      return `${intro}<div class="cb-carousel" data-interactive="carousel"><button type="button" class="cb-carousel-nav cb-carousel-prev" aria-label="Previous slide">&#8592;</button><div class="cb-carousel-track">${slides}</div><button type="button" class="cb-carousel-nav cb-carousel-next" aria-label="Next slide">&#8594;</button></div>`;
    }

    case "image_grid": {
      const items = normalizeImageGridItems(
        content.layout,
        content.rowMode,
        content.items,
      );
      const visibleItems = items.filter((it) =>
        !!tabImageSrc(it, scorm?.scormRelative),
      );
      const colCount =
        content.rowMode === "single_row"
          ? Math.max(1, visibleItems.length)
          : Math.max(1, Math.ceil(visibleItems.length / 2));
      const cols = `cb-grid-cols-${Math.min(8, colCount)}`;
      const cards = visibleItems
        .map((it) =>
          imageGridCardHtml(
            it,
            scorm?.scormRelative,
            scorm?.pageIndexById,
            content.captionMode,
          ),
        )
        .join("");
      const intro = content.intro.trim()
        ? `<div class="cb-block">${bodyContentForExport(content.intro)}</div>`
        : "";
      return `${intro}<div class="cb-grid ${cols}" data-row-mode="${content.rowMode}" data-interactive="image-grid">${cards}</div>`;
    }

    case "tabs": {
      const tabs = content.tabs.length
        ? content.tabs
        : [
            {
              id: "t",
              label: "Tab",
              body: "",
              imageAssetId: null,
              imageUrl: "",
              imageAlt: "",
            },
          ];
      const isVertical = content.layout === "vertical_left";
      const labels = tabs
        .map(
          (t, i) =>
            `<button type="button" class="cb-tab-btn" role="tab" data-tab="${i}"${i === 0 ? ' aria-selected="true"' : ""}>${escapeHtml(t.label || `Tab ${i + 1}`)}</button>`,
        )
        .join("");
      const panels = tabs
        .map(
          (t, i) => {
            const src = tabImageSrc(t, scorm?.scormRelative);
            const img = src
              ? `<div class="cb-tab-image-wrap">${textImageFigureHtml(src, t.imageAlt || "")}</div>`
              : "";
            const body = `<div class="cb-block">${bodyContentForExport(t.body)}</div>`;
            const panelInner = isVertical
              ? `${img}${body}`
              : src
                ? `<div class="cb-tab-media-row">${img}${body}</div>`
                : body;
            return `<div class="cb-tab-panel" role="tabpanel" data-panel="${i}"${i === 0 ? "" : ' hidden'}>${panelInner}</div>`;
          },
        )
        .join("");
      return `<div class="cb-tabs ${isVertical ? "cb-tabs-vertical" : "cb-tabs-horizontal"}" data-interactive="tabs"><div class="cb-tab-labels" role="tablist"${isVertical ? ' aria-orientation="vertical"' : ""}>${labels}</div><div class="cb-tab-panels">${panels}</div></div>`;
    }

    case "accordion": {
      const items = content.items.length
        ? content.items
        : [{ id: "a", title: "Section", body: "" }];
      return `${items
        .map(
          (it) =>
            `<details class="cb-details"><summary class="cb-summary">${escapeHtml(it.title || "Section")}</summary><div class="cb-details-body">${bodyContentForExport(it.body)}</div></details>`,
        )
        .join("")}`;
    }

    case "click_reveal": {
      const cards = normalizeClickRevealItems(content.cards).filter(
        (card) =>
          card.cardTitle.trim() ||
          card.cardBody.trim() ||
          clickRevealImageSrc(
            card.cardImageAssetId,
            card.cardImageUrl,
            scorm?.scormRelative,
          ),
      );
      const intro = content.intro.trim()
        ? `<div class="cb-block">${bodyContentForExport(content.intro)}</div>`
        : "";
      const gridClass = scormClickRevealGridClass(cards.length);
      const cardButtons = cards
        .map((card, i) =>
          clickRevealCardFrontHtml(card, i, scorm?.scormRelative),
        )
        .join("");
      const panels = cards
        .map((card, i) =>
          clickRevealPanelHtml(card, i, scorm?.scormRelative),
        )
        .join("");
      return `${intro}<div class="cb-click-reveal" data-interactive="click-reveal"><div class="cb-cr-grid ${gridClass}">${cardButtons}</div><div class="cb-cr-dialog" hidden aria-hidden="true"><div class="cb-cr-dialog-backdrop"></div><div class="cb-cr-dialog-shell" role="dialog" aria-modal="true"><div class="cb-cr-dialog-inner">${panels}</div></div></div></div>`;
    }

    case "course_completion":
      return `<div class="cb-final"><p class="cb-final-h">Course completion</p><div class="cb-block">${bodyContentForExport(content.summary)}</div><p class="cb-note">Certificate printing is available in the web player.</p></div>`;

    case "mcq": {
      const kc = hasQuestionFeedback(content);
      const opts = content.options
        .map(
          (opt, idx) =>
            `<li><button type="button" class="cb-opt" data-index="${idx}">${escapeHtml(opt || `Option ${idx + 1}`)}</button></li>`,
        )
        .join("");
      const submitBtn = kc
        ? `<button type="button" class="cb-submit-btn">Submit</button>`
        : "";
      return `<div class="cb-assess cb-mcq" data-correct-index="${content.correctIndex}"${questionFeedbackAttrs(content, scorm?.scormRelative)}><p class="cb-q">${escapeHtml(content.question || "Question")}</p><ul class="cb-opt-list">${opts}</ul>${submitBtn}<div class="cb-feedback" hidden></div>${questionFeedbackMarkup(content)}</div>`;
    }

    case "mrq": {
      const kc = hasQuestionFeedback(content);
      const correctJson = escapeAttr(JSON.stringify(content.correctIndices));
      const opts = content.options
        .map(
          (opt, idx) =>
            `<li><label class="cb-mrq-label"><input type="checkbox" class="cb-mrq-cb" data-index="${idx}"/> <span>${escapeHtml(opt || `Option ${idx + 1}`)}</span></label></li>`,
        )
        .join("");
      return `<div class="cb-assess cb-mrq" data-correct-indices="${correctJson}"${questionFeedbackAttrs(content, scorm?.scormRelative)}><p class="cb-q">${escapeHtml(content.question || "Question")}</p><ul class="cb-opt-list">${opts}</ul><button type="button" class="cb-check-btn">${kc ? "Submit" : "Check answer"}</button><div class="cb-feedback" hidden></div>${questionFeedbackMarkup(content)}</div>`;
    }

    case "true_false": {
      const kc = hasQuestionFeedback(content);
      const submitBtn = kc
        ? `<button type="button" class="cb-submit-btn">Submit</button>`
        : "";
      return `<div class="cb-assess cb-tf" data-correct="${content.correct ? "true" : "false"}"${questionFeedbackAttrs(content, scorm?.scormRelative)}><p class="cb-q">${escapeHtml(content.question || "Statement")}</p><div class="cb-tf-btns"><button type="button" class="cb-tf-btn" data-val="true">True</button><button type="button" class="cb-tf-btn" data-val="false">False</button></div>${submitBtn}<div class="cb-feedback" hidden></div>${questionFeedbackMarkup(content)}</div>`;
    }

    case "final_quiz":
      return `<div class="cb-final"><div class="cb-block">${bodyContentForExport(content.intro)}</div><p class="cb-note">Add separate question pages in the lesson; the LMS can aggregate scores from those pages.</p></div>`;

    case "quiz_results":
      return `<div class="cb-quiz-results"><div class="cb-block">${bodyContentForExport(content.intro)}</div><div class="cb-quiz-pass" hidden><p class="cb-final-h">Pass</p>${bodyContentForExport(content.passMessage)}</div><div class="cb-quiz-fail" hidden><p class="cb-final-h">Fail</p>${bodyContentForExport(content.failMessage)}</div><p class="cb-note">The LMS shows pass or fail here after the quiz is scored.</p></div>`;
  }
}
