import { notFound } from "next/navigation";

import { CoursePlayer } from "@/components/course-player/course-player";
import { collectImageAssetIdsFromPages } from "@/lib/assets/collect-image-asset-ids";
import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { parseNavigationFlow } from "@/lib/course-player/navigation-flow";
import { parseThemeFonts, parseThemeColors } from "@/lib/course-theme/theme";
import type { LessonNav } from "@/lib/course-player/types";
import { parsePageContent } from "@/lib/page-builder";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Public demo player. Only serves courses with `is_featured = true`
 * (enforced by RLS + explicit check). Learner name defaults to "Guest" and
 * progress is stored client-side in localStorage the same as the authored
 * experience.
 */
export default async function DemoPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const startRaw = sp.start;
  const resumeFromUrl =
    startRaw !== undefined ? Math.max(0, parseInt(startRaw, 10) || 0) : null;

  const anon = await createClient();

  const { data: course, error } = await anon
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (
    error ||
    !course ||
    !(course as Record<string, unknown>).is_featured
  ) {
    notFound();
  }

  const { data: lessonRows } = await anon
    .from("lessons")
    .select("id, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const { data: pageRows } = await anon
    .from("pages")
    .select("id, title, sort_order, content, lesson_id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const lessonsList = lessonRows ?? [];
  const pagesList = pageRows ?? [];

  const lessons: LessonNav[] = lessonsList.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    pages: pagesList
      .filter((p) => p.lesson_id === lesson.id)
      .map((p) => ({
        id: p.id,
        title: p.title,
        lessonId: lesson.id,
        content: parsePageContent(p.content),
      })),
  }));

  // Storage RLS is workspace-scoped, so use the service-role client (when
  // configured) to mint signed URLs for anon visitors.
  const signingClient = hasAdminSupabaseEnv() ? createAdminClient() : anon;

  const assetIds = collectImageAssetIdsFromPages(
    pagesList.map((p) => ({ content: p.content })),
  );
  const signedImageUrls = await getSignedUrlsForAssetIds(
    signingClient,
    assetIds,
  );

  const bannerAssetId = course.banner_asset_id ?? null;

  const { data: refRows } = await anon
    .from("course_reference_materials")
    .select("id, label, asset_id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const refList = refRows ?? [];
  const refAssetIds = refList.map((r) => r.asset_id);
  const refSigned = await getSignedUrlsForAssetIds(signingClient, refAssetIds);
  const referenceMaterials = refList.map((m) => ({
    id: m.id,
    label: m.label,
    downloadUrl: refSigned[m.asset_id] ?? "#",
  }));

  const bannerSigned = bannerAssetId
    ? await getSignedUrlsForAssetIds(signingClient, [bannerAssetId])
    : {};
  const bannerUrl = bannerAssetId
    ? bannerSigned[bannerAssetId] ?? null
    : null;

  return (
    <CoursePlayer
      courseId={course.id}
      courseTitle={course.title}
      bannerUrl={bannerUrl}
      lessons={lessons}
      referenceMaterials={referenceMaterials}
      themeFonts={parseThemeFonts(course.theme_fonts)}
      themeColors={parseThemeColors(course.theme_colors)}
      signedImageUrls={signedImageUrls}
      resumeFromUrl={resumeFromUrl}
      passingScorePercent={course.scorm_passing_score_percent ?? 70}
      navigationFlow={parseNavigationFlow(course.navigation_flow)}
      attemptsLimit={parseAttemptsLimit(course.attempts_limit)}
      assessmentAttemptsLimit={parseAttemptsLimit(
        course.assessment_attempts_limit,
      )}
      learnerName="Guest"
      customCss={course.custom_css}
      launchHref={`/demo/${course.id}`}
      hideAuthorLinks
    />
  );
}
