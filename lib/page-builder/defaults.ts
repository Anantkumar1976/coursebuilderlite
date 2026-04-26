import {
  DEFAULT_TEXT_IMAGE_LAYOUT,
  normalizeTextImageContent,
} from "./text-image";
import {
  DEFAULT_TEXT_VIDEO_LAYOUT,
  TEXT_VIDEO_LAYOUT_LABELS,
} from "./text-video";
import {
  DEFAULT_IMAGE_GRID_CAPTION_MODE,
  DEFAULT_IMAGE_GRID_LAYOUT,
  DEFAULT_IMAGE_GRID_ROW_MODE,
  emptyImageGridItem,
  IMAGE_GRID_CAPTION_MODE_LABELS,
  IMAGE_GRID_LAYOUT_LABELS,
  IMAGE_GRID_ROW_MODE_LABELS,
  imageGridCellCount,
} from "./image-grid";
import {
  DEFAULT_IMAGE_CAROUSEL_CAPTION_MODE,
  emptyImageCarouselItem,
  IMAGE_CAROUSEL_CAPTION_MODE_LABELS,
} from "./image-carousel";
import type {
  TabLayout,
  ImageCarouselCaptionMode,
  ImageGridCaptionMode,
  ImageGridLayout,
  PageContentV1,
  TemplateId,
  TextImageLayout,
  TextVideoLayout,
} from "./types";
import { isTemplateId } from "./types";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  text: "Text",
  text_image: "Text + Image",
  text_video: "Text + Video",
  two_column: "Two-column text",
  embed_pdf: "Embed PDF",
  image_carousel: "Image carousel",
  image_grid: "Image grid",
  tabs: "Tabs",
  accordion: "Accordion",
  course_completion: "Course completion/certificate",
  mcq: "MCQ",
  mrq: "MRQ",
  true_false: "True/False",
  final_quiz: "Final Quiz",
  quiz_results: "Quiz results",
};

export const TAB_LAYOUT_LABELS: Record<TabLayout, string> = {
  horizontal: "Horizontal tabs",
  vertical_left: "Vertical tabs (left)",
};

/** Values for the builder “add page” dropdown (includes text+image column presets). */
export const ADD_PAGE_TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "text", label: TEMPLATE_LABELS.text },
  { value: "text_image", label: TEMPLATE_LABELS.text_image },
  { value: "text_image__columns_2", label: "2 column text+image" },
  { value: "text_image__columns_3", label: "3 column text+image" },
  { value: "text_image__columns_4", label: "4 column text+image" },
  { value: "text_video", label: TEMPLATE_LABELS.text_video },
  { value: "text_video__video_only", label: "Video only" },
  { value: "text_video__video_top", label: "Video top + text bottom" },
  { value: "text_video__video_left", label: "Video left + text right" },
  { value: "text_video__video_right", label: "Text left + video right" },
  { value: "two_column", label: TEMPLATE_LABELS.two_column },
  { value: "embed_pdf", label: TEMPLATE_LABELS.embed_pdf },
  { value: "image_carousel", label: TEMPLATE_LABELS.image_carousel },
  { value: "image_grid", label: TEMPLATE_LABELS.image_grid },
  { value: "tabs", label: TEMPLATE_LABELS.tabs },
  { value: "accordion", label: TEMPLATE_LABELS.accordion },
  { value: "course_completion", label: TEMPLATE_LABELS.course_completion },
  { value: "mcq", label: TEMPLATE_LABELS.mcq },
  { value: "mrq", label: TEMPLATE_LABELS.mrq },
  { value: "true_false", label: TEMPLATE_LABELS.true_false },
  { value: "final_quiz", label: TEMPLATE_LABELS.final_quiz },
  { value: "quiz_results", label: TEMPLATE_LABELS.quiz_results },
];

export function parseAddPageTemplateValue(v: string): {
  template: TemplateId;
  textImageLayout?: TextImageLayout;
  textVideoLayout?: TextVideoLayout;
} {
  if (v === "text_image__columns_2") {
    return { template: "text_image", textImageLayout: "columns_2" };
  }
  if (v === "text_image__columns_3") {
    return { template: "text_image", textImageLayout: "columns_3" };
  }
  if (v === "text_image__columns_4") {
    return { template: "text_image", textImageLayout: "columns_4" };
  }
  if (v === "text_video__video_only") {
    return { template: "text_video", textVideoLayout: "video_only" };
  }
  if (v === "text_video__video_top") {
    return { template: "text_video", textVideoLayout: "video_top" };
  }
  if (v === "text_video__video_left") {
    return { template: "text_video", textVideoLayout: "video_left" };
  }
  if (v === "text_video__video_right") {
    return { template: "text_video", textVideoLayout: "video_right" };
  }
  if (isTemplateId(v)) {
    return { template: v };
  }
  return { template: "text" };
}

/** Sidebar / list label: distinguishes text+image column & text+video layouts from other templates. */
export function templateDisplayLabel(content: PageContentV1): string {
  if (content.template === "text_image") {
    if (
      content.layout === "columns_2" ||
      content.layout === "columns_3" ||
      content.layout === "columns_4"
    ) {
      const n =
        content.layout === "columns_2"
          ? 2
          : content.layout === "columns_3"
            ? 3
            : 4;
      return `${n} column text+image`;
    }
  }
  if (content.template === "text_video" && content.layout !== "text_top") {
    return TEXT_VIDEO_LAYOUT_LABELS[content.layout];
  }
  if (content.template === "image_grid") {
    return `Image grid (${IMAGE_GRID_LAYOUT_LABELS[content.layout]}, ${IMAGE_GRID_ROW_MODE_LABELS[content.rowMode]})`;
  }
  if (content.template === "image_carousel") {
    return `Image carousel (${IMAGE_CAROUSEL_CAPTION_MODE_LABELS[content.captionMode]})`;
  }
  return TEMPLATE_LABELS[content.template];
}

export function defaultPageContent(
  template: TemplateId,
  opts?: {
    textImageLayout?: TextImageLayout;
    textVideoLayout?: TextVideoLayout;
    imageGridLayout?: ImageGridLayout;
    imageGridRowMode?: import("./types").ImageGridRowMode;
    imageGridCaptionMode?: ImageGridCaptionMode;
    imageCarouselCaptionMode?: ImageCarouselCaptionMode;
  },
): PageContentV1 {
  switch (template) {
    case "text":
      return { v: 1, template: "text", body: "" };
    case "text_image": {
      const layout = opts?.textImageLayout ?? DEFAULT_TEXT_IMAGE_LAYOUT;
      const base = {
        v: 1 as const,
        template: "text_image" as const,
        layout,
        body: "",
        imageAssetId: null as string | null,
        imageUrl: "",
        imageAlt: "",
      };
      return normalizeTextImageContent(base);
    }
    case "text_video":
      return {
        v: 1,
        template: "text_video",
        layout: opts?.textVideoLayout ?? DEFAULT_TEXT_VIDEO_LAYOUT,
        body: "",
        videoUrl: "",
      };
    case "two_column":
      return { v: 1, template: "two_column", left: "", right: "" };
    case "embed_pdf":
      return {
        v: 1,
        template: "embed_pdf",
        intro: "",
        pdfAssetId: null,
        pdfUrl: "",
      };
    case "image_carousel":
      return {
        v: 1,
        template: "image_carousel",
        intro: "",
        captionMode:
          opts?.imageCarouselCaptionMode ?? DEFAULT_IMAGE_CAROUSEL_CAPTION_MODE,
        items: [emptyImageCarouselItem(0)],
      };
    case "image_grid":
      const rowMode = opts?.imageGridRowMode ?? DEFAULT_IMAGE_GRID_ROW_MODE;
      return {
        v: 1,
        template: "image_grid",
        layout: opts?.imageGridLayout ?? DEFAULT_IMAGE_GRID_LAYOUT,
        rowMode,
        captionMode:
          opts?.imageGridCaptionMode ?? DEFAULT_IMAGE_GRID_CAPTION_MODE,
        intro: "",
        items: Array.from(
          { length: imageGridCellCount(opts?.imageGridLayout ?? DEFAULT_IMAGE_GRID_LAYOUT, rowMode) },
          (_, i) => emptyImageGridItem(i),
        ),
      };
    case "tabs":
      return {
        v: 1,
        template: "tabs",
        layout: "horizontal",
        tabs: [
          {
            id: newId(),
            label: "Tab 1",
            body: "",
            imageAssetId: null,
            imageUrl: "",
            imageAlt: "",
          },
        ],
      };
    case "accordion":
      return {
        v: 1,
        template: "accordion",
        items: [{ id: newId(), title: "Section 1", body: "" }],
      };
    case "course_completion":
      return {
        v: 1,
        template: "course_completion",
        summary: "",
        logoAssetId: null,
        logoUrl: "",
        logoAlt: "",
      };
    case "mcq":
      return {
        v: 1,
        template: "mcq",
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      };
    case "mrq":
      return {
        v: 1,
        template: "mrq",
        question: "",
        options: ["", ""],
        correctIndices: [],
      };
    case "true_false":
      return {
        v: 1,
        template: "true_false",
        question: "",
        correct: true,
      };
    case "final_quiz":
      return {
        v: 1,
        template: "final_quiz",
        intro: "",
      };
    case "quiz_results":
      return {
        v: 1,
        template: "quiz_results",
        intro: "",
        passMessage: "",
        failMessage: "",
      };
  }
}
