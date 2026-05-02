import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseAssessmentAttemptsField } from "@/components/course-settings/course-assessment-attempts-field";
import { CourseAttemptsField } from "@/components/course-settings/course-attempts-field";
import { CourseBannerUpload } from "@/components/course-settings/course-banner-upload";
import { CourseReferenceMaterialsEditor } from "@/components/course-settings/course-reference-materials";
import { updateCourseSettings } from "@/lib/actions/course";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import {
  NAVIGATION_FLOW_LABELS,
  NAVIGATION_FLOWS,
  parseNavigationFlow,
} from "@/lib/course-player/navigation-flow";
import { updateCourseAppearanceSettings } from "@/lib/actions/course-appearance";
import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { parseThemeColors, parseThemeFonts } from "@/lib/course-theme/theme";
import { createClient } from "@/lib/supabase/server";

function settingsMessage(
  error: string | null,
  saved: boolean,
  errorDetail: string | null,
) {
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
    let decoded = "";
    if (errorDetail) {
      try {
        decoded = decodeURIComponent(errorDetail).trim();
      } catch {
        decoded = "";
      }
    }
    return (
      <div className="space-y-2" role="alert">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Could not save settings.
        </p>
        {decoded ? (
          <pre className="max-w-xl overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
            {decoded}
          </pre>
        ) : (
          <p className="text-xs text-red-700/90 dark:text-red-300/90">
            Apply pending Supabase migrations (especially{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/80">
              navigation_flow
            </code>
            ,{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/80">
              attempts_limit
            </code>
            ,{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/80">
              assessment_attempts_limit
            </code>
            ) or check the server console for{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/80">
              [updateCourseSettings]
            </code>
            .
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; e?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const saved = sp.saved === "1";
  const err = sp.error ?? null;
  const saveErrorDetail = sp.e ?? null;

  const supabase = await createClient();
  // Use * so missing migrations (extra columns) do not make this query fail with 404.
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) {
    notFound();
  }

  const { data: referenceRows, error: referenceError } = await supabase
    .from("course_reference_materials")
    .select("id, label, asset_id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const referenceList =
    referenceError || !referenceRows ? [] : referenceRows;

  const bannerId = course.banner_asset_id ?? null;
  const bannerIds = bannerId ? [bannerId] : [];
  const bannerSigned = await getSignedUrlsForAssetIds(supabase, bannerIds);
  const bannerPreviewUrl = bannerId ? bannerSigned[bannerId] ?? null : null;

  const themeFonts = parseThemeFonts(course.theme_fonts);
  const themeColors = parseThemeColors(course.theme_colors);
  const navigationFlow = parseNavigationFlow(course.navigation_flow);
  const attemptsLimit = parseAttemptsLimit(course.attempts_limit);
  const assessmentAttemptsLimit = parseAttemptsLimit(
    course.assessment_attempts_limit,
  );

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
          Player &amp; launch screen
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Banner, downloadable references, and theme used on the course home and
          in the player (more layout options coming next).
        </p>
        <div className="mt-8 space-y-10 border-t border-zinc-100 pt-8 dark:border-zinc-800">
          <CourseBannerUpload
            courseId={course.id}
            currentBannerAssetId={bannerId}
            previewUrl={bannerPreviewUrl}
          />
          <CourseReferenceMaterialsEditor
            courseId={course.id}
            materials={referenceList}
          />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Fonts &amp; colors
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              CSS font-family stacks, font sizes in{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">px</code>{" "}
              (e.g. <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">16px</code>
              ), and accent colors (buttons &amp; links).
            </p>
            <form
              action={updateCourseAppearanceSettings.bind(null, course.id)}
              className="mt-4 flex max-w-xl flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="font_course_title"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Course title font
                </label>
                <input
                  id="font_course_title"
                  name="font_course_title"
                  type="text"
                  defaultValue={themeFonts.courseTitle}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="font_page_title"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Page title font
                </label>
                <input
                  id="font_page_title"
                  name="font_page_title"
                  type="text"
                  defaultValue={themeFonts.pageTitle}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="font_page_content"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Page content font
                </label>
                <input
                  id="font_page_content"
                  name="font_page_content"
                  type="text"
                  defaultValue={themeFonts.pageContent}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="font_size_course_title"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Course title font size
                </label>
                <input
                  id="font_size_course_title"
                  name="font_size_course_title"
                  type="text"
                  placeholder="12px"
                  defaultValue={themeFonts.courseTitleSize}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="font_size_page_title"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Page heading font size
                </label>
                <input
                  id="font_size_page_title"
                  name="font_size_page_title"
                  type="text"
                  placeholder="30px"
                  defaultValue={themeFonts.pageTitleSize}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="font_size_page_content"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Page content font size
                </label>
                <input
                  id="font_size_page_content"
                  name="font_size_page_content"
                  type="text"
                  placeholder="16px"
                  defaultValue={themeFonts.pageContentSize}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="color_button"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Primary button
                  </label>
                  <input
                    id="color_button"
                    name="color_button"
                    type="color"
                    defaultValue={themeColors.button}
                    className="h-10 w-full cursor-pointer rounded border border-zinc-200 bg-white dark:border-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="color_highlight"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Highlights &amp; links
                  </label>
                  <input
                    id="color_highlight"
                    name="color_highlight"
                    type="color"
                    defaultValue={themeColors.highlight}
                    className="h-10 w-full cursor-pointer rounded border border-zinc-200 bg-white dark:border-zinc-700"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="custom_css"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Custom CSS (advanced, optional)
                </label>
                <textarea
                  id="custom_css"
                  name="custom_css"
                  rows={8}
                  defaultValue={course.custom_css ?? ""}
                  placeholder=".cb-rich h2 { color: #1d4ed8; }"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Applied to the learner player and SCORM export. Save with
                  &quot;Save appearance&quot; below.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Save appearance
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          SCORM export &amp; metadata
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Passing score, language, manifest text, and duration for packaged
          export.
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
              defaultValue={course.locale ?? "en"}
              placeholder="en or en-US"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="navigation_flow"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Navigation flow (player)
            </label>
            <select
              id="navigation_flow"
              name="navigation_flow"
              defaultValue={navigationFlow}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {NAVIGATION_FLOWS.map((flow) => (
                <option key={flow} value={flow}>
                  {NAVIGATION_FLOW_LABELS[flow]}
                </option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Linear locks the outline until you reach the next page in order.
              Open lets learners open any page; completion requires visiting
              every page, and if the course includes a final assessment, passing
              it per the passing score. Website mode stacks all pages in one
              scroll with no Continue button.
            </p>
          </div>
          <CourseAttemptsField initialLimit={attemptsLimit} />
          <CourseAssessmentAttemptsField
            initialLimit={assessmentAttemptsLimit}
          />
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
              defaultValue={course.scorm_passing_score_percent ?? 70}
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
          {settingsMessage(err, saved, saveErrorDetail)}
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
          <a
            href={`/api/courses/${courseId}/export/scorm-2004`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Download SCORM 2004
          </a>
          <a
            href={`/api/courses/${courseId}/export/standalone`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Download Standalone HTML
          </a>
        </div>
      </section>
    </main>
  );
}
