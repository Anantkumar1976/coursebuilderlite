import { notFound } from "next/navigation";

import { CourseLaunch } from "@/components/course-player/course-launch";
import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { parseNavigationFlow } from "@/lib/course-player/navigation-flow";
import { parseThemeFonts } from "@/lib/course-theme/theme";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Public demo launch page for a featured course.
 * No authentication required — RLS gates read access via courses.is_featured.
 * Storage-backed banner uses the service-role client (when configured) so anon
 * visitors get a signed URL without opening bucket policies to the world.
 */
export default async function DemoLaunchPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

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

  const { count: pageCount } = await anon
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { count: lessonCount } = await anon
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const bannerAssetId = course.banner_asset_id ?? null;
  const signingClient = hasAdminSupabaseEnv() ? createAdminClient() : anon;
  const signed = bannerAssetId
    ? await getSignedUrlsForAssetIds(signingClient, [bannerAssetId])
    : {};
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
      playHref={`/demo/${course.id}/play`}
      settingsHref={`/demo/${course.id}`}
      hideAuthorLinks
    />
  );
}
