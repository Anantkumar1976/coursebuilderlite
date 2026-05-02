import Link from "next/link";

import { createCourse } from "@/lib/actions/course";

function errorMessage(code: string | null) {
  if (code === "missing-title") {
    return "Enter a course title.";
  }
  if (code === "create-failed") {
    return "Could not create the course. Try again.";
  }
  if (code === "author-limit") {
    return "Your plan author limit has been reached.";
  }
  if (code === "billing-check-failed") {
    return "Could not verify your subscription limits. Try again.";
  }
  return null;
}

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const err = errorMessage(params.error ?? null);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/courses"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to courses
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">New course</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        You can rename this later. Pages and templates come in the builder next.
      </p>

      <form action={createCourse} className="mt-8 flex flex-col gap-4">
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
            placeholder="e.g. Onboarding 101"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        {err ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create course
          </button>
          <Link
            href="/courses"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
