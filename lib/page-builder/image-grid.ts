import type {
  ImageGridCaptionMode,
  ImageGridItem,
  ImageGridLayout,
  ImageGridRowMode,
} from "./types";

export const DEFAULT_IMAGE_GRID_LAYOUT: ImageGridLayout = "grid_2x2";
export const DEFAULT_IMAGE_GRID_CAPTION_MODE: ImageGridCaptionMode = "hover";
export const DEFAULT_IMAGE_GRID_ROW_MODE: ImageGridRowMode = "two_rows";

export const IMAGE_GRID_LAYOUT_LABELS: Record<ImageGridLayout, string> = {
  grid_2x2: "2 x 2",
  grid_3x3: "3 x 3",
  grid_4x4: "4 x 4",
};

export const IMAGE_GRID_CAPTION_MODE_LABELS: Record<ImageGridCaptionMode, string> =
  {
    hover: "Caption on hover",
    below: "Caption below image",
  };

export const IMAGE_GRID_ROW_MODE_LABELS: Record<ImageGridRowMode, string> = {
  single_row: "Single row",
  two_rows: "Two rows",
};

function imageGridColumns(layout: ImageGridLayout): number {
  switch (layout) {
    case "grid_3x3":
      return 3;
    case "grid_4x4":
      return 4;
    case "grid_2x2":
    default:
      return 2;
  }
}

export function imageGridCellCount(
  layout: ImageGridLayout,
  rowMode: ImageGridRowMode,
): number {
  void rowMode;
  const cols = imageGridColumns(layout);
  return cols * cols;
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyImageGridItem(index = 0): ImageGridItem {
  return {
    id: newId(),
    title: `Card ${index + 1}`,
    caption: "",
    imageAssetId: null,
    imageUrl: "",
    imageAlt: "",
    linkKind: "none",
    targetPageId: null,
    externalUrl: "",
  };
}

export function normalizeImageGridItems(
  layout: ImageGridLayout,
  rowMode: ImageGridRowMode,
  items: ImageGridItem[] | undefined,
): ImageGridItem[] {
  const n = imageGridCellCount(layout, rowMode);
  const out: ImageGridItem[] = [];
  const src = items ?? [];
  for (let i = 0; i < n; i++) {
    const cur = src[i];
    if (cur) out.push(cur);
    else out.push(emptyImageGridItem(i));
  }
  return out;
}

