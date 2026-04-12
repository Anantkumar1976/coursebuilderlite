/** Object key inside bucket `assets` (not including bucket name). */
export function buildAssetStoragePath(
  userId: string,
  courseId: string,
  assetId: string,
  originalFilename: string,
): string {
  const safe = sanitizeFilename(originalFilename);
  return `${userId}/${courseId}/${assetId}_${safe}`;
}

function sanitizeFilename(name: string): string {
  const base = name.trim() || "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function extensionFromFilename(filename: string): string {
  const m = filename.match(/(\.[a-zA-Z0-9._-]+)$/);
  return m ? m[1] : "";
}
