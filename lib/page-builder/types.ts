/** PRD template ids — stored in pages.content JSON (v1). */

export const TEMPLATE_IDS = [
  "text",
  "text_image",
  "text_video",
  "two_column",
  "embed_pdf",
  "image_carousel",
  "image_grid",
  "tabs",
  "accordion",
  "course_completion",
  "mcq",
  "mrq",
  "true_false",
  "final_quiz",
  "quiz_results",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Rich-text HTML from the Tiptap editor (sanitized on read in the player). */
export type RichBodyHtmlString = string;

/** Layout variants for template `text_image` (one template, many layouts). */
export const TEXT_IMAGE_LAYOUTS = [
  "text_top_image_bottom_full",
  "image_top_full",
  "image_left",
  "image_right",
  "columns_2",
  "columns_3",
  "columns_4",
] as const;

export type TextImageLayout = (typeof TEXT_IMAGE_LAYOUTS)[number];

/** Layout variants for template `text_video` (one template, many layouts). */
export const TEXT_VIDEO_LAYOUTS = [
  "text_top",
  "video_top",
  "video_left",
  "video_right",
  "video_only",
] as const;

export type TextVideoLayout = (typeof TEXT_VIDEO_LAYOUTS)[number];

export const IMAGE_GRID_LAYOUTS = ["grid_2x2", "grid_3x3", "grid_4x4"] as const;
export type ImageGridLayout = (typeof IMAGE_GRID_LAYOUTS)[number];

export const IMAGE_GRID_CAPTION_MODES = ["hover", "below"] as const;
export type ImageGridCaptionMode = (typeof IMAGE_GRID_CAPTION_MODES)[number];
export const IMAGE_GRID_ROW_MODES = ["single_row", "two_rows"] as const;
export type ImageGridRowMode = (typeof IMAGE_GRID_ROW_MODES)[number];

export type ImageGridLinkKind = "none" | "page" | "external";
export const IMAGE_CAROUSEL_CAPTION_MODES = ["overlay", "below"] as const;
export type ImageCarouselCaptionMode = (typeof IMAGE_CAROUSEL_CAPTION_MODES)[number];

export const TAB_LAYOUTS = ["horizontal", "vertical_left"] as const;
export type TabLayout = (typeof TAB_LAYOUTS)[number];

export type TextImageBlockItem = {
  id: string;
  body: RichBodyHtmlString;
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
};

export type TabItem = {
  id: string;
  label: string;
  body: RichBodyHtmlString;
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
};
export type AccordionItem = {
  id: string;
  title: string;
  body: RichBodyHtmlString;
};
export type ImageGridItem = {
  id: string;
  title: string;
  caption: string;
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
  linkKind: ImageGridLinkKind;
  targetPageId: string | null;
  externalUrl: string;
};
export type ImageCarouselItem = {
  id: string;
  title: string;
  caption: string;
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
};
export type EmbedPdfContent = {
  intro: RichBodyHtmlString;
  pdfAssetId?: string | null;
  pdfUrl: string;
};

/** Discriminated union for versioned page content (stored as JSONB). */
export type PageContentV1 =
  | { v: 1; template: "text"; body: RichBodyHtmlString }
  | {
      v: 1;
      template: "text_image";
      /** Visual arrangement of image vs body (and optional multi-block stacks). */
      layout: TextImageLayout;
      body: RichBodyHtmlString;
      /** Supabase Storage asset row id when using an uploaded file. */
      imageAssetId?: string | null;
      imageUrl: string;
      imageAlt: string;
      /** Set when layout is columns_2 | columns_3 | columns_4 — one column each: image top, text below. */
      blocks?: TextImageBlockItem[];
    }
  | {
      v: 1;
      template: "text_video";
      /** Visual arrangement of video vs body. */
      layout: TextVideoLayout;
      body: RichBodyHtmlString;
      videoUrl: string;
    }
  | {
      v: 1;
      template: "two_column";
      left: RichBodyHtmlString;
      right: RichBodyHtmlString;
    }
  | {
      v: 1;
      template: "embed_pdf";
      intro: RichBodyHtmlString;
      pdfAssetId?: string | null;
      pdfUrl: string;
    }
  | {
      v: 1;
      template: "image_carousel";
      intro: RichBodyHtmlString;
      captionMode: ImageCarouselCaptionMode;
      items: ImageCarouselItem[];
    }
  | {
      v: 1;
      template: "image_grid";
      layout: ImageGridLayout;
      rowMode: ImageGridRowMode;
      captionMode: ImageGridCaptionMode;
      intro: RichBodyHtmlString;
      items: ImageGridItem[];
    }
  | { v: 1; template: "tabs"; layout: TabLayout; tabs: TabItem[] }
  | { v: 1; template: "accordion"; items: AccordionItem[] }
  | {
      v: 1;
      template: "course_completion";
      summary: RichBodyHtmlString;
      logoAssetId?: string | null;
      logoUrl: string;
      logoAlt: string;
    }
  | {
      v: 1;
      template: "mcq";
      question: string;
      options: string[];
      correctIndex: number;
    }
  | {
      v: 1;
      template: "mrq";
      question: string;
      options: string[];
      correctIndices: number[];
    }
  | { v: 1; template: "true_false"; question: string; correct: boolean }
  | {
      v: 1;
      template: "final_quiz";
      /**
       * Intro / instructions only. Add separate pages (MCQ, MRQ, True/False)
       * in the same lesson, then a Quiz results page — scores roll up per lesson.
       */
      intro: RichBodyHtmlString;
    }
  | {
      v: 1;
      template: "quiz_results";
      /** Optional intro (e.g. “Your results”) shown above the outcome. */
      intro: RichBodyHtmlString;
      passMessage: RichBodyHtmlString;
      failMessage: RichBodyHtmlString;
    };

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === "string" &&
    (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}
