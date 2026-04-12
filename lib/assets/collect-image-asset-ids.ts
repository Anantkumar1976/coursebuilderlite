import { parsePageContent } from "@/lib/page-builder";
import type { Json } from "@/lib/supabase/database.types";

export function collectImageAssetIdsFromPages(
  pages: { content: Json }[],
): string[] {
  const ids = new Set<string>();
  for (const p of pages) {
    const c = parsePageContent(p.content);
    if (c.template === "text_image" && c.imageAssetId) {
      ids.add(c.imageAssetId);
    }
  }
  return [...ids];
}
