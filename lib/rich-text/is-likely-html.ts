/** True if the string looks like HTML (not plain text paragraphs). */
export function isLikelyRichHtml(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^<[a-z]/i.test(t);
}
