/** PRD template ids — stored in pages.content JSON (v1). */

export const TEMPLATE_IDS = [
  "text",
  "text_image",
  "text_video",
  "two_column",
  "tabs",
  "accordion",
  "mcq",
  "mrq",
  "true_false",
  "final_quiz",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type TabItem = { id: string; label: string; body: string };
export type AccordionItem = { id: string; title: string; body: string };

/** Discriminated union for versioned page content (stored as JSONB). */
export type PageContentV1 =
  | { v: 1; template: "text"; body: string }
  | {
      v: 1;
      template: "text_image";
      body: string;
      /** Supabase Storage asset row id when using an uploaded file. */
      imageAssetId?: string | null;
      imageUrl: string;
      imageAlt: string;
    }
  | { v: 1; template: "text_video"; body: string; videoUrl: string }
  | { v: 1; template: "two_column"; left: string; right: string }
  | { v: 1; template: "tabs"; tabs: TabItem[] }
  | { v: 1; template: "accordion"; items: AccordionItem[] }
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
      intro: string;
      passMessage: string;
      failMessage: string;
    };

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === "string" &&
    (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}
