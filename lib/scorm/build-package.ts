import type { SupabaseClient } from "@supabase/supabase-js";
import JSZip from "jszip";

import { collectImageAssetIdsFromPages } from "@/lib/assets/collect-image-asset-ids";
import { extensionFromFilename } from "@/lib/assets/storage-path";
import { parsePageContent } from "@/lib/page-builder";
import type { Database, Json } from "@/lib/supabase/database.types";

import { buildScormDriverWithCourseSettings } from "./apply-course-settings";
import { buildScormIndexHtml } from "./build-index-html";
import { buildImsManifest } from "./build-manifest";
import { pageContentToHtml } from "./page-to-html";

export type PageRow = {
  id: string;
  title: string;
  content: Json;
};

export async function buildScormZipBuffer(options: {
  courseTitle: string;
  courseId: string;
  pages: PageRow[];
  supabase: SupabaseClient<Database>;
  locale: string;
  scormPassingScorePercent: number;
  /** Max submitted assessment scores; null = unlimited (SCORM retake + exit flow). */
  assessmentAttemptsLimit: number | null;
  manifestDescription: string | null;
  courseDescription: string | null;
  estimatedDurationMinutes: number | null;
  customCss: string | null;
}): Promise<Buffer> {
  const assetIds = collectImageAssetIdsFromPages(options.pages);
  const scormRelative: Record<string, string> = {};
  const packageFiles: string[] = [];

  let assetRows: {
    id: string;
    bucket: string;
    storage_path: string;
    filename: string;
  }[] = [];
  if (assetIds.length > 0) {
    const { data } = await options.supabase
      .from("assets")
      .select("id, bucket, storage_path, filename")
      .in("id", assetIds);
    assetRows = data ?? [];
  }

  for (const row of assetRows) {
    const ext = extensionFromFilename(row.filename);
    const zipPath = `media/${row.id}${ext}`;
    scormRelative[row.id] = zipPath;
    packageFiles.push(zipPath);
  }

  const pageIndexById = Object.fromEntries(
    options.pages.map((row, idx) => [row.id, idx]),
  );
  const parsed: { title: string; innerHtml: string }[] = options.pages.map(
    (p) => {
      const content = parsePageContent(p.content);
      return {
        title: p.title || "Untitled page",
        innerHtml: pageContentToHtml(content, {
          scormRelative,
          pageIndexById,
        }),
      };
    },
  );

  const manifestSummary =
    options.manifestDescription?.trim() ||
    options.courseDescription?.trim() ||
    null;

  const indexHtml = buildScormIndexHtml(options.courseTitle, parsed, {
    lang: options.locale,
    customCss: options.customCss,
  });
  const manifest = buildImsManifest({
    courseTitle: options.courseTitle,
    manifestId: `cbl-${options.courseId}`,
    packageFiles,
    locale: options.locale,
    manifestSummary,
    estimatedDurationMinutes: options.estimatedDurationMinutes,
  });

  const driverJs = buildScormDriverWithCourseSettings(
    options.scormPassingScorePercent,
    options.assessmentAttemptsLimit,
  );

  const zip = new JSZip();

  for (const row of assetRows) {
    const zipPath = scormRelative[row.id];
    if (!zipPath) continue;
    const { data: blob, error } = await options.supabase.storage
      .from(row.bucket)
      .download(row.storage_path);
    if (error || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    zip.file(zipPath, buf);
  }

  zip.file("imsmanifest.xml", manifest);
  zip.file("index.html", indexHtml);
  zip.file("scormdriver.js", driverJs);

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export function scormZipFilename(courseTitle: string): string {
  const base = courseTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "course"}-scorm12.zip`;
}
