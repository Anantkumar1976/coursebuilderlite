import { notFound } from "next/navigation";

import { CoursePlayer } from "@/components/course-player/course-player";
import { collectImageAssetIdsFromPages } from "@/lib/assets/collect-image-asset-ids";
import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { parseNavigationFlow } from "@/lib/course-player/navigation-flow";
import { parseThemeFonts, parseThemeColors } from "@/lib/course-theme/theme";
import type { LessonNav } from "@/lib/course-player/types";
import { parsePageContent } from "@/lib/page-builder";
import { createClient } from "@/lib/supabase/server";

export default async function CoursePlayContentPage({
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const learnerName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : typeof user?.user_metadata?.name === "string" &&
          user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : "") || "Learner";
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) {
    notFound();
  }

  const { data: lessonRows, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const { data: pageRows, error: pagesError } = await supabase
    .from("pages")
    .select("id, title, sort_order, content, lesson_id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const lessonsList = lessonsError || !lessonRows ? [] : lessonRows;
  const pagesList = pagesError || !pageRows ? [] : pageRows;

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

  const assetIds = collectImageAssetIdsFromPages(
    pagesList.map((p) => ({ content: p.content })),
  );
  const signedImageUrls = await getSignedUrlsForAssetIds(supabase, assetIds);

  const bannerAssetId = course.banner_asset_id ?? null;
  const { data: refRows, error: refErr } = await supabase
    .from("course_reference_materials")
    .select("id, label, asset_id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const refList = refErr || !refRows ? [] : refRows;
  const refAssetIds = refList.map((r) => r.asset_id);
  const refSigned = await getSignedUrlsForAssetIds(supabase, refAssetIds);
  const referenceMaterials = refList.map((m) => ({
    id: m.id,
    label: m.label,
    downloadUrl: refSigned[m.asset_id] ?? "#",
  }));

  const bannerSigned = bannerAssetId
    ? await getSignedUrlsForAssetIds(supabase, [bannerAssetId])
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
      learnerName={learnerName}
      customCss={course.custom_css}
    />
  );
}
