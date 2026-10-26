import type { SupabaseClient } from "@supabase/supabase-js";

import { collectImageAssetIdsFromPages } from "@/lib/assets/collect-image-asset-ids";
import { extensionFromFilename } from "@/lib/assets/storage-path";
import type { NavigationFlow } from "@/lib/course-player/navigation-flow";
import type { ThemeColors, ThemeFonts } from "@/lib/course-theme/theme";
import { parsePageContent, resolvePageAudioSrcForExport } from "@/lib/page-builder";
import type { Database, Json } from "@/lib/supabase/database.types";

import { buildScormDriver } from "./build-driver";
import { buildScormIndexHtml } from "./build-index-html";
import { buildImsManifest, buildImsManifest2004 } from "./build-manifest";
import { pageContentToHtml } from "./page-to-html";

export const EXPORT_FORMATS = ["scorm12", "scorm2004", "standalone"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportFormat(value: unknown): value is ExportFormat {
  return (EXPORT_FORMATS as readonly unknown[]).includes(value);
}

export type PageRow = {
  id: string;
  title: string;
  content: Json;
};

export interface LessonRow {
  title: string;
  pages: PageRow[];
}

export interface ReferenceRow {
  label: string;
  assetId: string;
}

export interface PackageTextFile {
  path: string;
  content: string;
}

export interface PackageMediaFile {
  path: string;
  bucket: string;
  storagePath: string;
}

/** Everything needed to assemble the zip; media bytes are fetched separately. */
export interface PackagePlan {
  textFiles: PackageTextFile[];
  mediaFiles: PackageMediaFile[];
}

export async function buildPackagePlan(options: {
  courseTitle: string;
  courseId: string;
  lessons: LessonRow[];
  supabase: SupabaseClient<Database>;
  locale: string;
  scormPassingScorePercent: number;
  /** Max submitted assessment scores; null = unlimited (SCORM retake + exit flow). */
  assessmentAttemptsLimit: number | null;
  manifestDescription: string | null;
  courseDescription: string | null;
  estimatedDurationMinutes: number | null;
  customCss: string | null;
  bannerAssetId: string | null;
  references: ReferenceRow[];
  themeFonts: ThemeFonts;
  themeColors: ThemeColors;
  navigationFlow: NavigationFlow;
  format: ExportFormat;
}): Promise<PackagePlan> {
  const { format } = options;
  const pages = options.lessons.flatMap((lesson) => lesson.pages);
  const assetIds = new Set(collectImageAssetIdsFromPages(pages));
  if (options.bannerAssetId) assetIds.add(options.bannerAssetId);
  for (const ref of options.references) assetIds.add(ref.assetId);

  const scormRelative: Record<string, string> = {};
  const mediaFiles: PackageMediaFile[] = [];

  if (assetIds.size > 0) {
    const { data } = await options.supabase
      .from("assets")
      .select("id, bucket, storage_path, filename")
      .in("id", [...assetIds]);
    for (const row of data ?? []) {
      const path = `media/${row.id}${extensionFromFilename(row.filename)}`;
      scormRelative[row.id] = path;
      mediaFiles.push({
        path,
        bucket: row.bucket,
        storagePath: row.storage_path,
      });
    }
  }

  const pageIndexById = Object.fromEntries(
    pages.map((row, idx) => [row.id, idx]),
  );
  const lessons = options.lessons.map((lesson) => ({
    title: lesson.title,
    pages: lesson.pages.map((p) => {
      const content = parsePageContent(p.content);
      return {
        title: p.title || "Untitled page",
        innerHtml: pageContentToHtml(content, { scormRelative, pageIndexById }),
        pageAudioSrc: resolvePageAudioSrcForExport(content, scormRelative),
        isCompletion: content.template === "course_completion",
      };
    }),
  }));
  const references = options.references.flatMap((ref) => {
    const href = scormRelative[ref.assetId];
    return href ? [{ label: ref.label, href }] : [];
  });

  const manifestSummary =
    options.manifestDescription?.trim() ||
    options.courseDescription?.trim() ||
    null;
  const manifestOptions = {
    courseTitle: options.courseTitle,
    manifestId: `cbl-${options.courseId}`,
    packageFiles: mediaFiles.map((m) => m.path),
    locale: options.locale,
    manifestSummary,
    estimatedDurationMinutes: options.estimatedDurationMinutes,
  };

  const driverJs = buildScormDriver(format, {
    passingScore: options.scormPassingScorePercent,
    assessmentAttemptsLimit: options.assessmentAttemptsLimit,
    navigationFlow: options.navigationFlow,
  });

  const textFiles: PackageTextFile[] = [];
  if (format !== "standalone") {
    textFiles.push({
      path: "imsmanifest.xml",
      content:
        format === "scorm2004"
          ? buildImsManifest2004(manifestOptions)
          : buildImsManifest(manifestOptions),
    });
  }
  textFiles.push(
    {
      path: "index.html",
      content: buildScormIndexHtml(options.courseTitle, lessons, {
        lang: options.locale,
        customCss: options.customCss,
        description: options.courseDescription,
        estimatedDurationMinutes: options.estimatedDurationMinutes,
        bannerSrc: options.bannerAssetId
          ? (scormRelative[options.bannerAssetId] ?? null)
          : null,
        references,
        themeFonts: options.themeFonts,
        themeColors: options.themeColors,
        navigationFlow: options.navigationFlow,
      }),
    },
    { path: "scormdriver.js", content: driverJs },
  );

  return { textFiles, mediaFiles };
}

const FILENAME_SUFFIX: Record<ExportFormat, string> = {
  scorm12: "scorm12",
  scorm2004: "scorm2004",
  standalone: "standalone-html",
};

export function exportZipFilename(
  courseTitle: string,
  format: ExportFormat,
): string {
  const base = courseTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "course"}-${FILENAME_SUFFIX[format]}.zip`;
}
