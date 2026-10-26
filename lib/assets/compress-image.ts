interface CompressImageOptions {
  /** Longest edge in pixels after resizing. */
  maxDimension?: number;
  /** Encoder quality between 0 and 1 for JPEG/WebP output. */
  quality?: number;
}

/** Files at or below this size are uploaded untouched. */
const SKIP_BELOW_BYTES = 300 * 1024;

/** SVG is vector, GIF may be animated; re-encoding either would break them. */
const PASSTHROUGH_TYPES = new Set(["image/svg+xml", "image/gif"]);

/**
 * Downscales and re-encodes large photos in the browser before upload.
 * Returns the original file whenever compression wouldn't make it smaller.
 */
export async function compressImageForUpload(
  file: File,
  { maxDimension = 1920, quality = 0.82 }: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || PASSTHROUGH_TYPES.has(file.type)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await encodeCanvas(canvas, file.type, quality);
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${baseName(file.name)}.${ext}`, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

/** JPEG stays JPEG; everything else tries WebP so transparency survives. */
async function encodeCanvas(
  canvas: HTMLCanvasElement,
  sourceType: string,
  quality: number,
): Promise<Blob | null> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  if (sourceType === "image/jpeg") return toBlob("image/jpeg");

  const webp = await toBlob("image/webp");
  // Browsers without a WebP encoder silently fall back to PNG.
  return webp?.type === "image/webp" ? webp : null;
}

function baseName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename || "image";
}
