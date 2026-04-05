import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, status, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load courses. Check your Supabase connection and that the
          migration has been applied.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your courses</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a course, then add pages in the builder (next).
          </p>
        </div>
        <Link
          href="/courses/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New course
        </Link>
      </div>

      <ul className="mt-10 divide-y divide-zinc-200 rounded-xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40">
        {courses?.length ? (
          courses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/courses/${c.id}`}
                className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-zinc-50 sm:px-5 dark:hover:bg-zinc-900/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {c.status === "published" ? "Published" : "Draft"} · Updated{" "}
                    {new Date(c.updated_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  Open →
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="px-4 py-12 text-center text-sm text-zinc-600 dark:text-zinc-400 sm:px-5">
            No courses yet.{" "}
            <Link
              href="/courses/new"
              className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
            >
              Create your first course
            </Link>
            .
          </li>
        )}
      </ul>
    </main>
  );
}
