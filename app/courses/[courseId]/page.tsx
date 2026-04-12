import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCourseSettings } from "@/lib/actions/course";
import { createClient } from "@/lib/supabase/server";

function settingsMessage(error: string | null, saved: boolean) {
  if (saved) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
        Settings saved.
      </p>
    );
  }
  if (error === "missing-title") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        Enter a course title.
      </p>
    );
  }
  if (error === "save-failed") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        Could not save settings. Try again.
      </p>
    );
  }
  return null;
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const saved = sp.saved === "1";
  const err = sp.error ?? null;

  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select(
      "id, title, description, status, created_at, updated_at, locale, scorm_passing_score_percent, manifest_description, estimated_duration_minutes",
    )
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
            No description yet (use the form below).
          </p>
        )}
      </div>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Course settings
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Used for SCORM export (passing score, language, manifest text, duration).
          You can refine this UI later.
        </p>
        <form
          action={updateCourseSettings.bind(null, course.id)}
          className="mt-6 flex max-w-xl flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="title"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={course.title}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={course.description ?? ""}
              placeholder="Shown on the course page; also used in the SCORM manifest if manifest summary is empty."
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manifest_description"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Manifest summary (optional)
            </label>
            <textarea
              id="manifest_description"
              name="manifest_description"
              rows={2}
              defaultValue={course.manifest_description ?? ""}
              placeholder="LMS-oriented summary; if empty, falls back to description."
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="locale"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Language / locale (BCP 47)
            </label>
            <input
              id="locale"
              name="locale"
              type="text"
              defaultValue={course.locale}
              placeholder="en or en-US"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="scorm_passing_score_percent"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              SCORM passing score (0–100)
            </label>
            <input
              id="scorm_passing_score_percent"
              name="scorm_passing_score_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={course.scorm_passing_score_percent}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="estimated_duration_minutes"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Estimated duration (minutes, optional)
            </label>
            <input
              id="estimated_duration_minutes"
              name="estimated_duration_minutes"
              type="number"
              min={0}
              defaultValue={course.estimated_duration_minutes ?? ""}
              placeholder="e.g. 30"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          {settingsMessage(err, saved)}
          <button
            type="submit"
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save settings
          </button>
        </form>
      </section>

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
