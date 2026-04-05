const FEATURES = [
  {
    title: "Courses & pages",
    description:
      "Create courses and arrange pages with a template-driven builder—structured content, consistent layout.",
  },
  {
    title: "Media",
    description:
      "Add images and embed video links so lessons stay lightweight and fast to load.",
  },
  {
    title: "Responsive player",
    description:
      "Preview and deliver courses that read well on desktop, tablet, and phone.",
  },
  {
    title: "SCORM 1.2 export",
    description:
      "Export a single-SCO package with completion, score, and suspend data for your LMS.",
  },
] as const;

import Link from "next/link";

const TEMPLATES = [
  "Text",
  "Text + Image",
  "Text + Video",
  "Two Column",
  "Tabs",
  "Accordion",
  "MCQ",
  "MRQ",
  "True/False",
  "Final Quiz",
] as const;

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="text-sm font-semibold tracking-tight">
            CourseBuilder Lite
          </span>
          <nav
            className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400"
            aria-label="Primary"
          >
            <a
              href="#features"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Features
            </a>
            <a
              href="#templates"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Templates
            </a>
            <Link
              href="/login"
              className="font-medium text-zinc-900 transition-colors hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section
          id="get-started"
          className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20"
          aria-labelledby="hero-heading"
        >
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            MVP · Template-driven authoring
          </p>
          <h1
            id="hero-heading"
            className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl sm:leading-tight"
          >
            Build responsive SCORM courses without the heavy lift
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            A focused authoring tool for structured pages, assessments, and SCORM
            1.2 export—so you can ship training that works in your LMS.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get started
            </Link>
            <a
              href="#templates"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              See templates
            </a>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-zinc-200/80 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900/40"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="features-heading"
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              What you get in the MVP
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Course creation, a page builder backed by templates, media you control, a
              responsive player, and SCORM export—wired for Phase 1, with assessments
              and packaging in Phase 2.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-950/50"
                >
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="templates"
          className="border-t border-zinc-200/80 py-16 dark:border-zinc-800"
          aria-labelledby="templates-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="templates-heading"
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Page templates
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Every page uses a template—content types and quizzes stay consistent and
              export-friendly.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2" role="list">
              {TEMPLATES.map((name) => (
                <li key={name}>
                  <span className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-zinc-200/80 bg-white py-14 dark:border-zinc-800 dark:bg-zinc-900/40"
          aria-labelledby="roadmap-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2
              id="roadmap-heading"
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Roadmap at a glance
            </h2>
            <ol className="mt-6 space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-3">
                <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-200">
                  Phase 1
                </span>
                <span>Core builder—courses, pages, templates, media, player.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-200">
                  Phase 2
                </span>
                <span>Assessments and SCORM packaging (single SCO, tracking).</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-200">
                  Phase 3
                </span>
                <span>Themes and enhancements.</span>
              </li>
            </ol>
            <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
              No AI generation or branching logic in the MVP—just clear, template-based
              authoring.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200/80 py-8 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:px-6">
          <p>© {new Date().getFullYear()} CourseBuilder Lite</p>
          <p className="text-zinc-400 dark:text-zinc-500">
            Auth and courses powered by Supabase.
          </p>
        </div>
      </footer>
    </div>
  );
}
