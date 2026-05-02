import { parsePageContent } from "@/lib/page-builder";
import { isColumnsLayout } from "@/lib/page-builder/text-image";
import type { Json } from "@/lib/supabase/database.types";

export function collectImageAssetIdsFromPages(
  pages: { content: Json }[],
): string[] {
  const ids = new Set<string>();
  for (const p of pages) {
    const c = parsePageContent(p.content);
    if (c.template === "text_image") {
      if (c.imageAssetId) ids.add(c.imageAssetId);
      if (isColumnsLayout(c.layout) && c.blocks?.length) {
        for (const b of c.blocks) {
          if (b.imageAssetId) ids.add(b.imageAssetId);
        }
      }
    }
    if (c.template === "embed_pdf" && c.pdfAssetId) {
      ids.add(c.pdfAssetId);
    }
    if (c.template === "course_completion" && c.logoAssetId) {
      ids.add(c.logoAssetId);
    }
    if (c.template === "tabs") {
      for (const tab of c.tabs) {
        if (tab.imageAssetId) ids.add(tab.imageAssetId);
      }
    }
    if (c.template === "image_carousel") {
      for (const item of c.items) {
        if (item.imageAssetId) ids.add(item.imageAssetId);
      }
    }
    if (c.template === "image_grid") {
      for (const item of c.items) {
        if (item.imageAssetId) ids.add(item.imageAssetId);
      }
    }
  }
  return [...ids];
}
