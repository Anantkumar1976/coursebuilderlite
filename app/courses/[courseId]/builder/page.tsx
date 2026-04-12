import Link from "next/link";
import { notFound } from "next/navigation";

import { parsePageContent } from "@/lib/page-builder";
import { createClient } from "@/lib/supabase/server";

import { PageBuilder } from "./page-builder";

export default async function CourseBuilderPage({
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
    .select("id, title, sort_order, content")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const initialPages = (pages ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    sort_order: p.sort_order,
    content: parsePageContent(p.content),
  }));

  const { data: assetRows } = await supabase
    .from("assets")
    .select("id, filename, mime_type, bytes, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  const initialAssets = (assetRows ?? []).map((a) => ({
    id: a.id,
    filename: a.filename,
    mime_type: a.mime_type,
    bytes: a.bytes,
  }));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to course
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/courses/${courseId}/play`}
            className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
          >
            Preview
          </Link>
          <a
            href={`/api/courses/${courseId}/export/scorm`}
            className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
          >
            SCORM 1.2
          </a>
        </div>
      </div>
      <PageBuilder
        courseId={course.id}
        courseTitle={course.title}
        initialPages={initialPages}
        initialAssets={initialAssets}
      />
    </div>
  );
}
