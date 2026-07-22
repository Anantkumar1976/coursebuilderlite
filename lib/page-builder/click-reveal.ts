import type { ClickRevealItem } from "./types";

export const CLICK_REVEAL_MIN_CARDS = 1;
export const CLICK_REVEAL_MAX_CARDS = 8;

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `cr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function emptyClickRevealItem(index = 0): ClickRevealItem {
  return {
    id: newId(),
    cardTitle: `Item ${index + 1}`,
    cardBody: "",
    cardImageAssetId: null,
    cardImageUrl: "",
    cardImageAlt: "",
    revealTitle: "",
    revealBody: "",
    revealImageAssetId: null,
    revealImageUrl: "",
    revealImageAlt: "",
    revealAudioAssetId: null,
  };
}

export function normalizeClickRevealItems(
  raw: ClickRevealItem[] | undefined,
): ClickRevealItem[] {
  const items = raw?.length ? [...raw] : [emptyClickRevealItem(0)];
  const trimmed = items.slice(0, CLICK_REVEAL_MAX_CARDS);
  while (trimmed.length < CLICK_REVEAL_MIN_CARDS) {
    trimmed.push(emptyClickRevealItem(trimmed.length));
  }
  return trimmed.map((item, index) => ({
    id: item.id || newId(),
    cardTitle: item.cardTitle ?? `Item ${index + 1}`,
    cardBody: item.cardBody ?? "",
    cardImageAssetId: item.cardImageAssetId ?? null,
    cardImageUrl: item.cardImageUrl ?? "",
    cardImageAlt: item.cardImageAlt ?? "",
    revealTitle: item.revealTitle ?? "",
    revealBody: item.revealBody ?? "",
    revealImageAssetId: item.revealImageAssetId ?? null,
    revealImageUrl: item.revealImageUrl ?? "",
    revealImageAlt: item.revealImageAlt ?? "",
    revealAudioAssetId: item.revealAudioAssetId ?? null,
  }));
}

export function resolveClickRevealAudioSrc(
  assetId: string | null | undefined,
  signedAssetUrls?: Record<string, string>,
): string | null {
  if (!assetId) return null;
  return signedAssetUrls?.[assetId] ?? null;
}

/** Container layout for 1–8 visible cards. */
export function clickRevealContainerClass(count: number): string {
  const n = Math.max(1, Math.min(CLICK_REVEAL_MAX_CARDS, count));
  switch (n) {
    case 1:
      return "flex w-full justify-center";
    case 2:
      return "grid w-full grid-cols-2 gap-4";
    case 3:
      return "grid w-full grid-cols-1 gap-4 sm:grid-cols-3";
    case 4:
      return "grid w-full grid-cols-2 gap-4 lg:grid-cols-4";
    default:
      return "grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";
  }
}

/** Per-card width constraint (single-card centering). */
export function clickRevealItemClass(count: number): string {
  return count === 1 ? "w-full max-w-sm" : "w-full min-w-0";
}

/** @deprecated Use clickRevealContainerClass */
export function clickRevealGridClass(count: number): string {
  return clickRevealContainerClass(count);
}

export function scormClickRevealGridClass(count: number): string {
  const n = Math.max(1, Math.min(CLICK_REVEAL_MAX_CARDS, count));
  if (n >= 5) return "cb-cr-grid-multi";
  return `cb-cr-grid-cols-${n}`;
}
