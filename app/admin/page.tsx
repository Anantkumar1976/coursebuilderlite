import Link from "next/link";
import { redirect } from "next/navigation";

import {
  adminDeleteCourse,
  adminDeleteUser,
  adminDisableUser,
  adminEnableUser,
  adminSetSubscriptionStatus,
} from "@/lib/actions/admin";
import { isMasterAdminUser } from "@/lib/auth/admin";
import { PAYPAL_PLAN_CONFIG, type PaypalPlanKey } from "@/lib/paypal/subscriptions";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PLAN_PRICING: Record<PaypalPlanKey, number> = {
  starter: 29,
  pro: 99,
};

function asPlanKey(value: string | null | undefined): PaypalPlanKey | null {
  if (!value) return null;
  return Object.hasOwn(PAYPAL_PLAN_CONFIG, value) ? (value as PaypalPlanKey) : null;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (!isMasterAdminUser(user)) {
    redirect("/courses");
  }
  if (!hasAdminSupabaseEnv()) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Master admin dashboard</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Admin dashboard requires a server-side Supabase service role key.
        </p>
        <div className="mt-6 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Set <code>SUPABASE_SERVICE_ROLE_KEY</code> as a server-only environment
          variable (never prefix with <code>NEXT_PUBLIC_</code>). On Vercel: Project
          → Settings → Environment Variables → add it for Production (and Preview if
          needed), then Redeploy. Locally: add it to <code>.env.local</code> and
          restart <code>npm run dev</code>.
        </div>
        <Link
          href="/courses"
          className="mt-6 inline-flex text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Back to courses
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();
  const [
    usersResponse,
    coursesResult,
    subscriptionsResult,
    exportsCountResult,
    membershipsResult,
    coursesCountResult,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin
      .from("courses")
      .select("id, title, status, user_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
    admin
      .from("billing_subscriptions")
      .select("subscription_id, user_id, status, plan_key, workspace_name, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    admin.from("billing_export_events").select("id", { count: "exact", head: true }),
    admin.from("billing_subscription_memberships").select("id, user_id, subscription_id"),
    admin.from("courses").select("id", { count: "exact", head: true }),
  ]);

  const users = usersResponse.data.users ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const usersById = new Map(users.map((u) => [u.id, u]));
  const subscriptionById = new Map(
    subscriptions.map((s) => [s.subscription_id, s] as const),
  );
  const authorsBySubscription = new Map<string, { id: string; email: string | null }[]>();
  for (const membership of memberships) {
    const list = authorsBySubscription.get(membership.subscription_id) ?? [];
    const memberUser = usersById.get(membership.user_id);
    list.push({
      id: membership.user_id,
      email: memberUser?.email ?? null,
    });
    authorsBySubscription.set(membership.subscription_id, list);
  }
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const estimatedMrr = activeSubscriptions.reduce((sum, subscription) => {
    const plan = asPlanKey(subscription.plan_key);
    if (!plan) return sum;
    return sum + PLAN_PRICING[plan];
  }, 0);

  function workspaceForUser(userId: string): string | null {
    const authUser = usersById.get(userId);
    const fromMeta =
      typeof authUser?.user_metadata?.workspace_name === "string"
        ? authUser.user_metadata.workspace_name.trim()
        : "";
    if (fromMeta) return fromMeta;
    const subId =
      typeof authUser?.user_metadata?.paypal_subscription_id === "string"
        ? authUser.user_metadata.paypal_subscription_id
        : null;
    if (!subId) return null;
    return subscriptionById.get(subId)?.workspace_name?.trim() || null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master admin dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Global overview and controls for users, subscriptions, and courses.
          </p>
        </div>
        <Link
          href="/courses"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Back to courses
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Users</p>
          <p className="mt-2 text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Subscriptions</p>
          <p className="mt-2 text-2xl font-semibold">{subscriptions.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Courses</p>
          <p className="mt-2 text-2xl font-semibold">{coursesCountResult.count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Estimated MRR</p>
          <p className="mt-2 text-2xl font-semibold">${estimatedMrr}</p>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold">System totals</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Author seats in use: {memberships.length} · Total export events:{" "}
          {exportsCountResult.count ?? 0}
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold">Authors by company / workgroup</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Each subscription workspace and the authors currently on it.
        </p>
        <div className="mt-4 space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-sm text-zinc-500">No subscriptions yet.</p>
          ) : (
            subscriptions.map((s) => {
              const authors = authorsBySubscription.get(s.subscription_id) ?? [];
              const owner = s.user_id ? usersById.get(s.user_id) : null;
              const ownerListed = s.user_id
                ? authors.some((a) => a.id === s.user_id)
                : true;
              const displayAuthors = [
                ...(!ownerListed && s.user_id
                  ? [{ id: s.user_id, email: owner?.email ?? null }]
                  : []),
                ...authors,
              ];
              return (
                <article
                  key={`workspace-${s.subscription_id}`}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {s.workspace_name?.trim() || "Unnamed workgroup"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Plan: {s.plan_key ?? "unknown"} · Status: {s.status} ·{" "}
                    <span className="font-mono">{s.subscription_id}</span>
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {displayAuthors.length === 0 ? (
                      <li className="text-xs text-zinc-500">No authors linked yet.</li>
                    ) : (
                      displayAuthors.map((author) => (
                        <li key={author.id}>
                          {author.email ?? author.id}
                          {author.id === s.user_id ? (
                            <span className="ml-1 text-xs text-zinc-500">(subscriber)</span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold">Users</h2>
        <div className="mt-4 space-y-3">
          {users.map((u) => {
            const workgroup = workspaceForUser(u.id);
            return (
            <article key={u.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{u.email ?? u.id}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {workgroup ? `Workgroup: ${workgroup} · ` : null}
                Created {new Date(u.created_at).toLocaleDateString()} · Last sign in{" "}
                {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={adminDisableUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Disable
                  </button>
                </form>
                <form action={adminEnableUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Enable
                  </button>
                </form>
                <form action={adminDeleteUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-md border border-red-300 px-3 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold">Subscriptions</h2>
        <div className="mt-4 space-y-3">
          {subscriptions.map((s) => (
            <article
              key={s.subscription_id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-sm font-medium">
                {s.workspace_name?.trim() || "Unnamed workgroup"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-mono">{s.subscription_id}</span> · User:{" "}
                {s.user_id ? (usersById.get(s.user_id)?.email ?? s.user_id) : "unclaimed"} · Plan:{" "}
                {s.plan_key ?? "unknown"} · Status: {s.status}
              </p>
              <form action={adminSetSubscriptionStatus} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="subscription_id" value={s.subscription_id} />
                <select
                  name="status"
                  defaultValue={s.status}
                  className="h-8 rounded-md border border-zinc-300 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="active">active</option>
                  <option value="pending_activation">pending_activation</option>
                  <option value="cancelled">cancelled</option>
                  <option value="suspended">suspended</option>
                  <option value="expired">expired</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Update
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold">Courses</h2>
        <div className="mt-4 space-y-3">
          {(coursesResult.data ?? []).map((course) => (
            <article key={course.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-medium">{course.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Owner: {course.user_id} · Status: {course.status}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Open
                </Link>
                <form action={adminDeleteCourse}>
                  <input type="hidden" name="course_id" value={course.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-md border border-red-300 px-3 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
