import type {
  ImageCarouselCaptionMode,
  ImageCarouselItem,
} from "./types";

export const DEFAULT_IMAGE_CAROUSEL_CAPTION_MODE: ImageCarouselCaptionMode =
  "overlay";

export const IMAGE_CAROUSEL_CAPTION_MODE_LABELS: Record<
  ImageCarouselCaptionMode,
  string
> = {
  overlay: "Overlay on image",
  below: "Below image",
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyImageCarouselItem(index = 0): ImageCarouselItem {
  return {
    id: newId(),
    title: `Slide ${index + 1}`,
    caption: "",
    imageAssetId: null,
    imageUrl: "",
    imageAlt: "",
  };
}

export function normalizeImageCarouselItems(
  items: ImageCarouselItem[] | undefined,
): ImageCarouselItem[] {
  const src = items ?? [];
  if (src.length === 0) return [emptyImageCarouselItem(0)];
  return src;
}

