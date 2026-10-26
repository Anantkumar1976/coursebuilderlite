import type { PackageTextFile } from "./build-package";

export interface ExportPlanResponse {
  filename: string;
  textFiles: PackageTextFile[];
  media: { path: string; url: string }[];
}

export type ExportProgress =
  | { stage: "media"; done: number; total: number }
  | { stage: "zipping"; percent: number };

const MEDIA_CONCURRENCY = 4;

/** Builds the course zip in the browser from an export plan. */
export async function assembleExportZip(
  plan: ExportPlanResponse,
  onProgress: (progress: ExportProgress) => void,
): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const file of plan.textFiles) {
    zip.file(file.path, file.content);
  }

  let done = 0;
  const total = plan.media.length;
  onProgress({ stage: "media", done, total });

  const queue = [...plan.media];
  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const res = await fetch(item.url);
      if (!res.ok) {
        throw new Error(`Could not download ${item.path} (${res.status}).`);
      }
      // Images, audio, and PDFs are already compressed; deflating them again only costs time.
      zip.file(item.path, await res.blob(), { compression: "STORE" });
      done += 1;
      onProgress({ stage: "media", done, total });
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(MEDIA_CONCURRENCY, total) }, worker),
  );

  return zip.generateAsync(
    { type: "blob", compression: "DEFLATE" },
    (meta) => onProgress({ stage: "zipping", percent: Math.round(meta.percent) }),
  );
}
