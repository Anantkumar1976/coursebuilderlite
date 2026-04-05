import type { Json } from "@/lib/supabase/database.types";

import { defaultPageContent } from "./defaults";
import type {
  AccordionItem,
  PageContentV1,
  TabItem,
  TemplateId,
} from "./types";
import { isTemplateId } from "./types";

function randomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
    });
  }
  return out.length ? out : [{ id: randomId(), label: "Tab 1", body: "" }];
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
    case "text_image":
      return {
        v: 1,
        template: "text_image",
        body: typeof o.body === "string" ? o.body : "",
        imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
        imageAlt: typeof o.imageAlt === "string" ? o.imageAlt : "",
      };
    case "text_video":
      return {
        v: 1,
        template: "text_video",
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
    case "tabs":
      return { v: 1, template: "tabs", tabs: parseTabs(o.tabs) };
    case "accordion":
      return {
        v: 1,
        template: "accordion",
        items: parseAccordionItems(o.items),
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
        passMessage: typeof o.passMessage === "string" ? o.passMessage : "",
        failMessage: typeof o.failMessage === "string" ? o.failMessage : "",
      };
    default:
      return defaultPageContent("text");
  }
}
