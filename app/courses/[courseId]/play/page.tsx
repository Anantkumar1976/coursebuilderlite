import { notFound } from "next/navigation";

import { CourseLaunch } from "@/components/course-player/course-launch";
import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { parseNavigationFlow } from "@/lib/course-player/navigation-flow";
import { parseThemeFonts } from "@/lib/course-theme/theme";
import { createClient } from "@/lib/supabase/server";

export default async function CoursePlayLaunchPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) {
    notFound();
  }

  const { count: pageCount } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { count: lessonCount } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const bannerAssetId = course.banner_asset_id ?? null;
  const assetIds: string[] = [];
  if (bannerAssetId) assetIds.push(bannerAssetId);

  const signed = await getSignedUrlsForAssetIds(supabase, assetIds);
  const bannerUrl = bannerAssetId ? signed[bannerAssetId] ?? null : null;
  const themeFonts = parseThemeFonts(course.theme_fonts);
  const manualMode = parseNavigationFlow(course.navigation_flow) === "website";

  return (
    <CourseLaunch
      courseId={course.id}
      courseTitle={course.title}
      themeFonts={themeFonts}
      description={course.description}
      estimatedDurationMinutes={course.estimated_duration_minutes ?? null}
      bannerUrl={bannerUrl}
      lessonCount={lessonCount ?? 0}
      pageCount={pageCount ?? 0}
      themeColorsJson={course.theme_colors ?? {}}
      attemptsLimit={parseAttemptsLimit(course.attempts_limit)}
      manualMode={manualMode}
    />
  );
}
