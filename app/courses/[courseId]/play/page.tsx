import { notFound } from "next/navigation";

import { CoursePlayer } from "@/components/course-player/course-player";
import { collectImageAssetIdsFromPages } from "@/lib/assets/collect-image-asset-ids";
import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { parsePageContent } from "@/lib/page-builder";
import { createClient } from "@/lib/supabase/server";

export default async function CoursePlayPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) {
    notFound();
  }

  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, content")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const playerPages = (pages ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    content: parsePageContent(p.content),
  }));

  const assetIds = collectImageAssetIdsFromPages(pages ?? []);
  const signedImageUrls = await getSignedUrlsForAssetIds(supabase, assetIds);

  return (
    <CoursePlayer
      courseId={course.id}
      courseTitle={course.title}
      pages={playerPages}
      signedImageUrls={signedImageUrls}
    />
  );
}
