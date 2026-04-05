import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title, description, status, created_at, updated_at")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/courses"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to courses
      </Link>
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {course.status === "published" ? "Published" : "Draft"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {course.title}
        </h1>
        {course.description ? (
          <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
            {course.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
            No description yet.
          </p>
        )}
      </div>

      <section className="mt-12 rounded-xl border border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Pages
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Add pages, pick templates, and edit JSON-backed content in the builder.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/courses/${courseId}/builder`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Open page builder
          </Link>
          <Link
            href={`/courses/${courseId}/play`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Preview course
          </Link>
          <a
            href={`/api/courses/${courseId}/export/scorm`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Download SCORM 1.2
          </a>
        </div>
      </section>
    </main>
  );
}
