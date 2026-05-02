import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createTeamInvite,
  removeTeamMember,
  revokeTeamInvite,
} from "@/lib/actions/team";
import { isMasterAdminUser } from "@/lib/auth/admin";
import {
  BillingEnforcementError,
  getPlanMetadataFromUser,
  syncAndValidateSubscriptionStatus,
} from "@/lib/billing/enforcement";
import { hasAdminSupabaseEnv, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/courses/team");

  if (isMasterAdminUser(user)) {
    redirect("/admin");
  }

  let metadata: ReturnType<typeof getPlanMetadataFromUser>;
  try {
    metadata = getPlanMetadataFromUser(user);
  } catch {
    redirect("/courses");
  }

  try {
    await syncAndValidateSubscriptionStatus(supabase, user);
  } catch (error) {
    if (
      error instanceof BillingEnforcementError &&
      error.code === "subscription-inactive"
    ) {
      redirect("/login?error=subscription-inactive");
    }
    throw error;
  }

  const { data: invites, error: invErr } = await supabase
    .from("billing_team_invites")
    .select("id, token, email_normalized, status, expires_at, created_at")
    .eq("subscription_id", metadata.subscriptionId)
    .order("created_at", { ascending: false });

  if (invErr) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm text-red-600" role="alert">
          Could not load invites. Apply the team invites migration if you have not yet.
        </p>
      </main>
    );
  }

  const { count: memberCount } = await supabase
    .from("billing_subscription_memberships")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", metadata.subscriptionId);

  const { count: pendingCount } = await supabase
    .from("billing_team_invites")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", metadata.subscriptionId)
    .eq("status", "pending");

  const used = (memberCount ?? 0) + (pendingCount ?? 0);
  const seatsRemaining = Math.max(0, metadata.authorsLimit - used);

  type MemberRow = { user_id: string; email: string | null };
  let members: MemberRow[] = [];
  if (hasAdminSupabaseEnv()) {
    const admin = createAdminClient();
    const { data: memRows } = await admin
      .from("billing_subscription_memberships")
      .select("user_id")
      .eq("subscription_id", metadata.subscriptionId);
    const ids = (memRows ?? []).map((m) => m.user_id);
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const byId = new Map((list.users ?? []).map((u) => [u.id, u.email ?? null]));
    members = ids.map((id) => ({ user_id: id, email: byId.get(id) ?? null }));
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/courses"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to courses
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Team &amp; seats</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Subscription <span className="font-mono text-xs">{metadata.subscriptionId}</span> ·{" "}
        {used} / {metadata.authorsLimit} seats in use (including pending invites)
        {seatsRemaining > 0 ? ` · ${seatsRemaining} available` : " · none available"}
      </p>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invite a teammate</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ll email the flow next; for now copy the links after you create an invite (or share
          the accept URL from your pending list once we add per-invite links below).
        </p>
        <form action={createTeamInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="colleague@company.com"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create invite
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          New users:{" "}
          <span className="font-mono">
            {baseUrl()}/signup?invite_token=…
          </span>
          <br />
          Existing users (sign in first):{" "}
          <span className="font-mono">
            {baseUrl()}/team/accept/…
          </span>
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pending invites</h2>
        <ul className="mt-4 space-y-3">
          {(invites ?? [])
            .filter((i) => i.status === "pending")
            .map((inv) => {
              const acceptUrl = `${baseUrl()}/team/accept/${inv.token}`;
              const signupUrl = `${baseUrl()}/signup?invite_token=${encodeURIComponent(inv.token)}`;
              return (
                <li
                  key={inv.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{inv.email_normalized}</p>
                    <form action={revokeTeamInvite}>
                      <input type="hidden" name="invite_id" value={inv.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Expires {new Date(inv.expires_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">
                    Accept (signed in): {acceptUrl}
                  </p>
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">
                    Sign up: {signupUrl}
                  </p>
                </li>
              );
            })}
          {(invites ?? []).filter((i) => i.status === "pending").length === 0 ? (
            <li className="text-sm text-zinc-500">No pending invites.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Members</h2>
        {!hasAdminSupabaseEnv() ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Add <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            to show emails and remove members.
          </p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span>
                {m.email ?? m.user_id}
                {m.user_id === user.id ? (
                  <span className="ml-2 text-xs text-zinc-500">(you)</span>
                ) : null}
              </span>
              {m.user_id !== user.id && hasAdminSupabaseEnv() ? (
                <form action={removeTeamMember}>
                  <input type="hidden" name="member_user_id" value={m.user_id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
