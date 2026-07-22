import Link from "next/link";

import { getSignedUrlsForAssetIds } from "@/lib/assets/signed-urls";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Server component that lists featured courses on the marketing home page.
 * Silently renders nothing when there are no featured courses so the page
 * doesn't show an empty "See it in action" section.
 */
export async function FeaturedDemos() {
  const anon = await createClient();
  const { data: courses, error } = await anon
    .from("courses")
    .select(
      "id, title, description, estimated_duration_minutes, banner_asset_id, is_featured",
    )
    .eq("is_featured", true)
    .order("updated_at", { ascending: false })
    .limit(6);

  // Silently no-op when the migration hasn't been applied yet, or the query
  // otherwise fails — the marketing page must never blow up because of demos.
  if (error) return null;

  const list = courses ?? [];
  if (list.length === 0) return null;

  const bannerIds = list
    .map((c) => c.banner_asset_id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  const signer = hasAdminSupabaseEnv() ? createAdminClient() : anon;
  const signed = await getSignedUrlsForAssetIds(signer, bannerIds);

  const pageCounts: Record<string, number> = {};
  for (const course of list) {
    const { count } = await anon
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course.id);
    pageCounts[course.id] = count ?? 0;
  }

  return (
    <section
      id="demos"
      className="border-t border-slate-200 bg-white py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
            See it in action
          </p>
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-[#0f2745] sm:text-4xl md:text-5xl">
            Sample courses built with Akhila
          </h2>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Explore live sample courses to experience the learner side of
            Akhila. Every course below was authored using the same templates
            available to your team — no plugins, no scripting.
          </p>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((course) => {
            const bannerUrl = course.banner_asset_id
              ? signed[course.banner_asset_id] ?? null
              : null;
            const pageCount = pageCounts[course.id] ?? 0;
            return (
              <li
                key={course.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
                  {bannerUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- signed banner URLs are transient */
                    <img
                      src={bannerUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/70">
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Sample course
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-bold leading-snug tracking-tight text-[#0f2745]">
                    {course.title}
                  </h3>
                  {course.description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {course.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {pageCount > 0 ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5">
                        {pageCount} page{pageCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {course.estimated_duration_minutes ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5">
                        ~{course.estimated_duration_minutes} min
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 flex flex-1 items-end">
                    <Link
                      href={`/demo/${course.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f2745] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#12335b]"
                    >
                      Launch demo
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
