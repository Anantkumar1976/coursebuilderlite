import { NextResponse } from "next/server";

import {
  BillingEnforcementError,
  ensureAuthorSeatAvailable,
  ensureMonthlyExportLimitAvailable,
  recordExportEvent,
} from "@/lib/billing/enforcement";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { parseNavigationFlow } from "@/lib/course-player/navigation-flow";
import { parseThemeColors, parseThemeFonts } from "@/lib/course-theme/theme";
import { reportScormExportFailure } from "@/lib/monitoring/errors";
import {
  buildPackagePlan,
  exportZipFilename,
  isExportFormat,
  type PackageMediaFile,
} from "@/lib/scorm/build-package";
import type { ExportPlanResponse } from "@/lib/scorm/export-plan";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * Returns the package's text files plus short-lived signed media URLs.
 * The browser assembles the zip, so package size isn't bound by the
 * serverless response body limit.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    format?: unknown;
  } | null;
  const format = body?.format;
  if (!isExportFormat(format)) {
    return new NextResponse("Unknown export format", { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Please sign in again to export.", {
        status: 401,
      });
    }
    await ensureAuthorSeatAvailable(supabase, user);
    await ensureMonthlyExportLimitAvailable(supabase, user);

    const { data: course, error } = await supabase
      .from("courses")
      .select(
        "id, title, description, locale, scorm_passing_score_percent, assessment_attempts_limit, manifest_description, estimated_duration_minutes, custom_css, banner_asset_id, theme_fonts, theme_colors, navigation_flow",
      )
      .eq("id", courseId)
      .maybeSingle();

    if (error || !course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const [{ data: lessonRows }, { data: pageRows }, { data: refRows }] =
      await Promise.all([
        supabase
          .from("lessons")
          .select("id, title")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("pages")
          .select("id, title, content, lesson_id")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("course_reference_materials")
          .select("label, asset_id")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true }),
      ]);

    const lessons = (lessonRows ?? []).map((lesson) => ({
      title: lesson.title,
      pages: (pageRows ?? [])
        .filter((p) => p.lesson_id === lesson.id)
        .map((p) => ({ id: p.id, title: p.title, content: p.content })),
    }));

    const plan = await buildPackagePlan({
      courseTitle: course.title,
      courseId: course.id,
      lessons,
      bannerAssetId: course.banner_asset_id,
      references: (refRows ?? []).map((r) => ({
        label: r.label,
        assetId: r.asset_id,
      })),
      themeFonts: parseThemeFonts(course.theme_fonts),
      themeColors: parseThemeColors(course.theme_colors),
      navigationFlow: parseNavigationFlow(course.navigation_flow),
      supabase,
      locale: course.locale,
      scormPassingScorePercent: course.scorm_passing_score_percent,
      assessmentAttemptsLimit: parseAttemptsLimit(
        course.assessment_attempts_limit,
      ),
      manifestDescription: course.manifest_description,
      courseDescription: course.description,
      estimatedDurationMinutes: course.estimated_duration_minutes,
      customCss: course.custom_css,
      format,
    });

    const media = await signMediaFiles(supabase, plan.mediaFiles);
    await recordExportEvent(supabase, user, courseId, format);

    return NextResponse.json({
      filename: exportZipFilename(course.title, format),
      textFiles: plan.textFiles,
      media,
    } satisfies ExportPlanResponse);
  } catch (err) {
    if (err instanceof BillingEnforcementError) {
      const status = err.code === "export-limit-reached" ? 429 : 403;
      return new NextResponse(err.message, { status });
    }
    reportScormExportFailure(err, { courseId, format });
    console.error("[course-export]", courseId, format, err);
    return new NextResponse("Export failed. Please try again.", {
      status: 500,
    });
  }
}

async function signMediaFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  files: PackageMediaFile[],
): Promise<ExportPlanResponse["media"]> {
  const byBucket = new Map<string, PackageMediaFile[]>();
  for (const file of files) {
    byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file]);
  }
  const signed = await Promise.all(
    [...byBucket].map(async ([bucket, bucketFiles]) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(
          bucketFiles.map((f) => f.storagePath),
          SIGNED_URL_TTL_SECONDS,
        );
      if (error) throw error;
      return bucketFiles.flatMap((file, i) => {
        const url = data[i]?.signedUrl;
        return url ? [{ path: file.path, url }] : [];
      });
    }),
  );
  return signed.flat();
}
