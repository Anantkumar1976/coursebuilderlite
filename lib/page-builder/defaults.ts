import type { PageContentV1, TemplateId } from "./types";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  text: "Text",
  text_image: "Text + Image",
  text_video: "Text + Video",
  two_column: "Two Column",
  tabs: "Tabs",
  accordion: "Accordion",
  mcq: "MCQ",
  mrq: "MRQ",
  true_false: "True/False",
  final_quiz: "Final Quiz",
};

export function defaultPageContent(template: TemplateId): PageContentV1 {
  switch (template) {
    case "text":
      return { v: 1, template: "text", body: "" };
    case "text_image":
      return {
        v: 1,
        template: "text_image",
        body: "",
        imageUrl: "",
        imageAlt: "",
      };
    case "text_video":
      return { v: 1, template: "text_video", body: "", videoUrl: "" };
    case "two_column":
      return { v: 1, template: "two_column", left: "", right: "" };
    case "tabs":
      return {
        v: 1,
        template: "tabs",
        tabs: [{ id: newId(), label: "Tab 1", body: "" }],
      };
    case "accordion":
      return {
        v: 1,
        template: "accordion",
        items: [{ id: newId(), title: "Section 1", body: "" }],
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
        passMessage: "",
        failMessage: "",
      };
  }
}
