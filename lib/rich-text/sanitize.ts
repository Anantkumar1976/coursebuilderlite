import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "strike",
  "u",
  "span",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
];

/** Safe HTML for learner-facing body content (matches Tiptap output). */
export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ["href", "target", "rel", "style", "class"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

/** Strip tags to detect empty rich text (e.g. `<p></p>`). */
export function isEffectivelyEmptyHtml(html: string): boolean {
  return !html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}
