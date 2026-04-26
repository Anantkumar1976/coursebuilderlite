import type {
  PageContentV1,
  TextImageBlockItem,
  TextImageLayout,
} from "./types";
import { TEXT_IMAGE_LAYOUTS } from "./types";

export type { TextImageBlockItem, TextImageLayout } from "./types";
export { TEXT_IMAGE_LAYOUTS } from "./types";

/** Human-readable labels for the layout picker. */
export const TEXT_IMAGE_LAYOUT_LABELS: Record<TextImageLayout, string> = {
  text_top_image_bottom_full: "Text top + image bottom",
  image_top_full: "Image top + text bottom",
  image_left: "Image left + text right",
  image_right: "Text left + image right",
  columns_2: "2 column text+image",
  columns_3: "3 column text+image",
  columns_4: "4 column text+image",
};

export const DEFAULT_TEXT_IMAGE_LAYOUT: TextImageLayout =
  "text_top_image_bottom_full";

/** Legacy layout ids saved before rename — mapped in parseTextImageLayout. */
const LEGACY_BLOCKS_TO_COLUMNS: Record<string, TextImageLayout> = {
  blocks_2: "columns_2",
  blocks_3: "columns_3",
  blocks_4: "columns_4",
};

export function newBlockId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyTextImageBlock(): TextImageBlockItem {
  return {
    id: newBlockId(),
    body: "",
    imageAssetId: null,
    imageUrl: "",
    imageAlt: "",
  };
}

/** Multi-column layouts (2–4 columns, each with image + text). */
export function isColumnsLayout(layout: TextImageLayout): boolean {
  return (
    layout === "columns_2" ||
    layout === "columns_3" ||
    layout === "columns_4"
  );
}

/** @deprecated use isColumnsLayout */
export const isBlocksLayout = isColumnsLayout;

export function blockCountForLayout(layout: TextImageLayout): number {
  switch (layout) {
    case "columns_2":
      return 2;
    case "columns_3":
      return 3;
    case "columns_4":
      return 4;
    default:
      return 0;
  }
}

export function parseTextImageLayout(raw: unknown): TextImageLayout {
  if (typeof raw !== "string") {
    return DEFAULT_TEXT_IMAGE_LAYOUT;
  }
  if ((TEXT_IMAGE_LAYOUTS as readonly string[]).includes(raw)) {
    return raw as TextImageLayout;
  }
  const migrated = LEGACY_BLOCKS_TO_COLUMNS[raw];
  if (migrated) return migrated;
  return DEFAULT_TEXT_IMAGE_LAYOUT;
}

type TextImagePage = Extract<PageContentV1, { template: "text_image" }>;

/** Ensure `blocks` length matches layout; pad or trim. */
export function normalizeTextImageContent(page: TextImagePage): TextImagePage {
  const layout = parseTextImageLayout(page.layout);
  const pageNorm = { ...page, layout };
  const n = blockCountForLayout(layout);
  if (n === 0) {
    return { ...pageNorm, blocks: undefined };
  }
  const prev = pageNorm.blocks?.length ? [...pageNorm.blocks] : [];
  const out: TextImageBlockItem[] = [];
  for (let i = 0; i < n; i++) {
    if (prev[i]) {
      const b = prev[i];
      out.push({
        ...b,
        id: b.id || newBlockId(),
      });
    } else {
      out.push(emptyTextImageBlock());
    }
  }
  return { ...pageNorm, blocks: out };
}
