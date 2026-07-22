import type { PageAudioFields, PageContentV1, PageContentV1Core } from "./types";

export function parsePageAudioFields(
  raw: Record<string, unknown>,
): PageAudioFields {
  return {
    pageAudioAssetId:
      typeof raw.pageAudioAssetId === "string" &&
      raw.pageAudioAssetId.length > 0
        ? raw.pageAudioAssetId
        : null,
    pageAudioTranscript:
      typeof raw.pageAudioTranscript === "string" ? raw.pageAudioTranscript : "",
  };
}

export function attachPageAudio<T extends PageContentV1Core>(
  content: T,
  raw: Record<string, unknown>,
): T & PageAudioFields {
  return { ...content, ...parsePageAudioFields(raw) };
}

export function resolvePageAudioSrc(
  content: PageContentV1,
  signedAssetUrls?: Record<string, string>,
): string | null {
  const assetId = content.pageAudioAssetId;
  if (!assetId) return null;
  return signedAssetUrls?.[assetId] ?? null;
}

/** Resolve packaged relative path for SCORM / standalone export. */
export function resolvePageAudioSrcForExport(
  content: PageContentV1,
  scormRelative?: Record<string, string>,
): string | null {
  const assetId = content.pageAudioAssetId;
  if (!assetId) return null;
  return scormRelative?.[assetId] ?? null;
}

export function hasPageAudio(content: PageContentV1): boolean {
  return Boolean(content.pageAudioAssetId && content.pageAudioAssetId.length > 0);
}

export function getPageAudioTranscript(content: PageContentV1): string {
  return content.pageAudioTranscript?.trim() ?? "";
}

export function hasPageAudioTranscript(content: PageContentV1): boolean {
  return hasPageAudio(content) && getPageAudioTranscript(content).length > 0;
}
