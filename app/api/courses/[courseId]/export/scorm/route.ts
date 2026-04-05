import { NextResponse } from "next/server";

import {
  buildScormZipBuffer,
  scormZipFilename,
} from "@/lib/scorm/build-package";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title, user_id")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !course) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: pages } = await supabase
    .from("pages")
    .select("title, content")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const buf = await buildScormZipBuffer({
    courseTitle: course.title,
    courseId: course.id,
    pages: pages ?? [],
  });

  const filename = scormZipFilename(course.title);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
