import { escapeHtml } from "@/lib/scorm/html-escape";

/**
 * Editor bootstrap: legacy plain text → HTML paragraphs.
 * If the value already looks like HTML from Tiptap, return as-is.
 */
export function plainTextToTipTapHtml(text: string): string {
  if (!text.trim()) return "<p></p>";
  if (isProbablyStoredHtml(text)) {
    return text;
  }
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function isProbablyStoredHtml(text: string): boolean {
  const t = text.trim();
  if (/^<[a-z]/i.test(t)) return true;
  if (/<\/(p|ul|ol|h[1-6]|li)>/i.test(text)) return true;
  return false;
}
