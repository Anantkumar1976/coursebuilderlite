import type { Json } from "@/lib/supabase/database.types";

import { defaultPageContent } from "./defaults";
import {
  normalizeTextImageContent,
  parseTextImageLayout,
} from "./text-image";
import { parseTextVideoLayout } from "./text-video";
import {
  DEFAULT_IMAGE_GRID_CAPTION_MODE,
  DEFAULT_IMAGE_GRID_LAYOUT,
  DEFAULT_IMAGE_GRID_ROW_MODE,
  emptyImageGridItem,
  normalizeImageGridItems,
} from "./image-grid";
import {
  DEFAULT_IMAGE_CAROUSEL_CAPTION_MODE,
  emptyImageCarouselItem,
  normalizeImageCarouselItems,
} from "./image-carousel";
import type {
  AccordionItem,
  ImageCarouselCaptionMode,
  ImageCarouselItem,
  ImageGridCaptionMode,
  ImageGridItem,
  ImageGridLayout,
  ImageGridRowMode,
  PageContentV1,
  TabItem,
  TemplateId,
  TabLayout,
  TextImageBlockItem,
} from "./types";
import {
  IMAGE_GRID_CAPTION_MODES,
  IMAGE_GRID_LAYOUTS,
  IMAGE_GRID_ROW_MODES,
  IMAGE_CAROUSEL_CAPTION_MODES,
  isTemplateId,
  TAB_LAYOUTS,
} from "./types";

function randomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseTextImageBlocks(raw: unknown): TextImageBlockItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: TextImageBlockItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: typeof r.id === "string" ? r.id : randomId(),
      body: typeof r.body === "string" ? r.body : "",
      imageAssetId:
        typeof r.imageAssetId === "string" && r.imageAssetId.length > 0
          ? r.imageAssetId
          : null,
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : "",
      imageAlt: typeof r.imageAlt === "string" ? r.imageAlt : "",
    });
  }
  return out.length ? out : undefined;
}

function parseTabs(raw: unknown): TabItem[] {
  if (!Array.isArray(raw)) return [];
  const out: TabItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: typeof r.id === "string" ? r.id : randomId(),
      label: typeof r.label === "string" ? r.label : "",
      body: typeof r.body === "string" ? r.body : "",
      imageAssetId:
        typeof r.imageAssetId === "string" && r.imageAssetId.length > 0
          ? r.imageAssetId
          : null,
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : "",
      imageAlt: typeof r.imageAlt === "string" ? r.imageAlt : "",
    });
  }
  return out.length
    ? out
    : [
        {
          id: randomId(),
          label: "Tab 1",
          body: "",
          imageAssetId: null,
          imageUrl: "",
          imageAlt: "",
        },
      ];
}

function parseImageCarouselCaptionMode(raw: unknown): ImageCarouselCaptionMode {
  if (typeof raw !== "string") return DEFAULT_IMAGE_CAROUSEL_CAPTION_MODE;
  return (IMAGE_CAROUSEL_CAPTION_MODES as readonly string[]).includes(raw)
    ? (raw as ImageCarouselCaptionMode)
    : DEFAULT_IMAGE_CAROUSEL_CAPTION_MODE;
}

function parseImageCarouselItems(raw: unknown): ImageCarouselItem[] {
  if (!Array.isArray(raw)) return normalizeImageCarouselItems(undefined);
  const out: ImageCarouselItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: typeof r.id === "string" ? r.id : randomId(),
      title: typeof r.title === "string" ? r.title : "",
      caption: typeof r.caption === "string" ? r.caption : "",
      imageAssetId:
        typeof r.imageAssetId === "string" && r.imageAssetId.length > 0
          ? r.imageAssetId
          : null,
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : "",
      imageAlt: typeof r.imageAlt === "string" ? r.imageAlt : "",
    });
  }
  return normalizeImageCarouselItems(
    out.length ? out : [emptyImageCarouselItem(0)],
  );
}

function parseTabLayout(raw: unknown): TabLayout {
  if (typeof raw !== "string") return "horizontal";
  return (TAB_LAYOUTS as readonly string[]).includes(raw)
    ? (raw as TabLayout)
    : "horizontal";
}

function parseAccordionItems(raw: unknown): AccordionItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AccordionItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: typeof r.id === "string" ? r.id : randomId(),
      title: typeof r.title === "string" ? r.title : "",
      body: typeof r.body === "string" ? r.body : "",
    });
  }
  return out.length
    ? out
    : [{ id: randomId(), title: "Section 1", body: "" }];
}

function parseImageGridLayout(raw: unknown): ImageGridLayout {
  if (typeof raw !== "string") return DEFAULT_IMAGE_GRID_LAYOUT;
  return (IMAGE_GRID_LAYOUTS as readonly string[]).includes(raw)
    ? (raw as ImageGridLayout)
    : DEFAULT_IMAGE_GRID_LAYOUT;
}

function parseImageGridCaptionMode(raw: unknown): ImageGridCaptionMode {
  if (typeof raw !== "string") return DEFAULT_IMAGE_GRID_CAPTION_MODE;
  return (IMAGE_GRID_CAPTION_MODES as readonly string[]).includes(raw)
    ? (raw as ImageGridCaptionMode)
    : DEFAULT_IMAGE_GRID_CAPTION_MODE;
}

function parseImageGridRowMode(raw: unknown): ImageGridRowMode {
  if (typeof raw !== "string") return DEFAULT_IMAGE_GRID_ROW_MODE;
  return (IMAGE_GRID_ROW_MODES as readonly string[]).includes(raw)
    ? (raw as ImageGridRowMode)
    : DEFAULT_IMAGE_GRID_ROW_MODE;
}

function parseImageGridItems(
  raw: unknown,
  layout: ImageGridLayout,
  rowMode: ImageGridRowMode,
): ImageGridItem[] {
  if (!Array.isArray(raw)) {
    return normalizeImageGridItems(layout, rowMode, undefined);
  }
  const out: ImageGridItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    out.push({
      id: typeof r.id === "string" ? r.id : randomId(),
      title: typeof r.title === "string" ? r.title : "",
      caption: typeof r.caption === "string" ? r.caption : "",
      imageAssetId:
        typeof r.imageAssetId === "string" && r.imageAssetId.length > 0
          ? r.imageAssetId
          : null,
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : "",
      imageAlt: typeof r.imageAlt === "string" ? r.imageAlt : "",
      linkKind:
        r.linkKind === "page" || r.linkKind === "external" ? r.linkKind : "none",
      targetPageId:
        typeof r.targetPageId === "string" && r.targetPageId.length > 0
          ? r.targetPageId
          : null,
      externalUrl: typeof r.externalUrl === "string" ? r.externalUrl : "",
    });
  }
  return normalizeImageGridItems(layout, rowMode, out.length ? out : undefined).map((it, i) =>
    out[i] ?? emptyImageGridItem(i),
  );
}

/** Coerce DB JSON into PageContentV1; invalid or legacy data becomes a Text block. */
export function parsePageContent(raw: Json | undefined): PageContentV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultPageContent("text");
  }
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || !isTemplateId(o.template)) {
    return {
      v: 1,
      template: "text",
      body:
        typeof o.body === "string"
          ? o.body
          : JSON.stringify(raw, null, 2),
    };
  }

  const t = o.template as TemplateId;
  switch (t) {
    case "text":
      return {
        v: 1,
        template: "text",
        body: typeof o.body === "string" ? o.body : "",
      };
    case "text_image": {
      const layout = parseTextImageLayout(o.layout);
      const blocks = parseTextImageBlocks(o.blocks);
      const base = {
        v: 1 as const,
        template: "text_image" as const,
        layout,
        body: typeof o.body === "string" ? o.body : "",
        imageAssetId:
          typeof o.imageAssetId === "string" && o.imageAssetId.length > 0
            ? o.imageAssetId
            : null,
        imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
        imageAlt: typeof o.imageAlt === "string" ? o.imageAlt : "",
        blocks,
      };
      return normalizeTextImageContent(base);
    }
    case "text_video":
      return {
        v: 1,
        template: "text_video",
        layout: parseTextVideoLayout(o.layout),
        body: typeof o.body === "string" ? o.body : "",
        videoUrl: typeof o.videoUrl === "string" ? o.videoUrl : "",
      };
    case "two_column":
      return {
        v: 1,
        template: "two_column",
        left: typeof o.left === "string" ? o.left : "",
        right: typeof o.right === "string" ? o.right : "",
      };
    case "embed_pdf":
      return {
        v: 1,
        template: "embed_pdf",
        intro: typeof o.intro === "string" ? o.intro : "",
        pdfAssetId:
          typeof o.pdfAssetId === "string" && o.pdfAssetId.length > 0
            ? o.pdfAssetId
            : null,
        pdfUrl: typeof o.pdfUrl === "string" ? o.pdfUrl : "",
      };
    case "image_carousel":
      return {
        v: 1,
        template: "image_carousel",
        intro: typeof o.intro === "string" ? o.intro : "",
        captionMode: parseImageCarouselCaptionMode(o.captionMode),
        items: parseImageCarouselItems(o.items),
      };
    case "image_grid": {
      const layout = parseImageGridLayout(o.layout);
      const rowMode = parseImageGridRowMode(o.rowMode);
      return {
        v: 1,
        template: "image_grid",
        layout,
        rowMode,
        captionMode: parseImageGridCaptionMode(o.captionMode),
        intro: typeof o.intro === "string" ? o.intro : "",
        items: parseImageGridItems(o.items, layout, rowMode),
      };
    }
    case "tabs":
      return {
        v: 1,
        template: "tabs",
        layout: parseTabLayout(o.layout),
        tabs: parseTabs(o.tabs),
      };
    case "accordion":
      return {
        v: 1,
        template: "accordion",
        items: parseAccordionItems(o.items),
      };
    case "course_completion":
      return {
        v: 1,
        template: "course_completion",
        summary: typeof o.summary === "string" ? o.summary : "",
        logoAssetId:
          typeof o.logoAssetId === "string" && o.logoAssetId.length > 0
            ? o.logoAssetId
            : null,
        logoUrl: typeof o.logoUrl === "string" ? o.logoUrl : "",
        logoAlt: typeof o.logoAlt === "string" ? o.logoAlt : "",
      };
    case "mcq": {
      const options = Array.isArray(o.options)
        ? o.options.map((x) => (typeof x === "string" ? x : ""))
        : ["", "", "", ""];
      const padded = options.length >= 2 ? options : ["", ""];
      const correctIndex =
        typeof o.correctIndex === "number" &&
        o.correctIndex >= 0 &&
        o.correctIndex < padded.length
          ? o.correctIndex
          : 0;
      return {
        v: 1,
        template: "mcq",
        question: typeof o.question === "string" ? o.question : "",
        options: padded.slice(0, 8),
        correctIndex,
      };
    }
    case "mrq": {
      const options = Array.isArray(o.options)
        ? o.options.map((x) => (typeof x === "string" ? x : ""))
        : ["", ""];
      const correctIndices = Array.isArray(o.correctIndices)
        ? o.correctIndices.filter((i): i is number => typeof i === "number")
        : [];
      return {
        v: 1,
        template: "mrq",
        question: typeof o.question === "string" ? o.question : "",
        options: options.length ? options : ["", ""],
        correctIndices,
      };
    }
    case "true_false":
      return {
        v: 1,
        template: "true_false",
        question: typeof o.question === "string" ? o.question : "",
        correct: o.correct === false ? false : true,
      };
    case "final_quiz":
      return {
        v: 1,
        template: "final_quiz",
        intro: typeof o.intro === "string" ? o.intro : "",
      };
    case "quiz_results":
      return {
        v: 1,
        template: "quiz_results",
        intro: typeof o.intro === "string" ? o.intro : "",
        passMessage:
          typeof o.passMessage === "string" ? o.passMessage : "",
        failMessage:
          typeof o.failMessage === "string" ? o.failMessage : "",
      };
    default:
      return defaultPageContent("text");
  }
}
