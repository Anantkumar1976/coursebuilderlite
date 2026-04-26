import { NextResponse } from "next/server";

import { reportScormExportFailure } from "@/lib/monitoring/errors";
import {
  buildScormZipBuffer,
  scormZipFilename,
} from "@/lib/scorm/build-package";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { data: course, error } = await supabase
      .from("courses")
      .select(
        "id, title, description, locale, scorm_passing_score_percent, assessment_attempts_limit, manifest_description, estimated_duration_minutes, custom_css",
      )
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !course) {
      return new NextResponse("Not found", { status: 404 });
    }

    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("id, sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });

    const { data: pageRows } = await supabase
      .from("pages")
      .select("id, title, content, sort_order, lesson_id")
      .eq("course_id", courseId);

    const lessonOrder = new Map(
      (lessonRows ?? []).map((l) => [l.id, l.sort_order] as const),
    );
    const pages = [...(pageRows ?? [])]
      .sort((a, b) => {
        const la = lessonOrder.get(a.lesson_id) ?? 0;
        const lb = lessonOrder.get(b.lesson_id) ?? 0;
        if (la !== lb) return la - lb;
        return a.sort_order - b.sort_order;
      })
      .map((p) => ({ id: p.id, title: p.title, content: p.content }));

    const buf = await buildScormZipBuffer({
      courseTitle: course.title,
      courseId: course.id,
      pages,
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
    });

    const filename = scormZipFilename(course.title);

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    reportScormExportFailure(err, { courseId });
    console.error("[scorm-export]", courseId, err);
    return new NextResponse("Export failed", { status: 500 });
  }
}
