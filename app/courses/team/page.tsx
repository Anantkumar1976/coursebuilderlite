import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createTeamInvite,
  removeTeamMember,
  revokeTeamInvite,
  updateWorkspaceName,
} from "@/lib/actions/team";
import { isMasterAdminUser } from "@/lib/auth/admin";
import { getSiteUrl } from "@/lib/auth/site-url";
import {
  BillingEnforcementError,
  getPlanMetadataFromUser,
  syncAndValidateSubscriptionStatus,
} from "@/lib/billing/enforcement";
import { ensureMasterAdminWorkspace } from "@/lib/billing/master-admin-workspace";
import { WORKSPACE_NAME_MAX_LENGTH } from "@/lib/billing/workspace-name";
import { hasAdminSupabaseEnv, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getInviteFeedback(params: {
  invite_sent?: string;
  email_sent?: string;
  email_skipped?: string;
  email_failed?: string;
  email?: string;
  workspace_saved?: string;
}) {
  if (params.workspace_saved === "1") {
    return {
      tone: "success" as const,
      message: "Company / workgroup name saved.",
    };
  }
  if (params.invite_sent !== "1") return null;
  if (params.email_sent === "1") {
    const target = params.email?.trim();
    return {
      tone: "success" as const,
      message: target
        ? `Invite created and email sent to ${target}.`
        : "Invite created and email sent.",
    };
  }
  if (params.email_skipped === "1") {
    return {
      tone: "warning" as const,
      message:
        "Invite created, but email is not configured (set RESEND_API_KEY). Copy a link from Pending invites below.",
    };
  }
  if (params.email_failed === "1") {
    const target = params.email?.trim();
    return {
      tone: "warning" as const,
      message: target
        ? `Invite created for ${target}, but the email could not be sent. Copy a link from Pending invites below.`
        : "Invite created, but the email could not be sent. Copy a link from Pending invites below.",
    };
  }
  return {
    tone: "success" as const,
    message: "Invite created.",
  };
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    invite_sent?: string;
    email_sent?: string;
    email_skipped?: string;
    email_failed?: string;
    email?: string;
    workspace_saved?: string;
  }>;
}) {
  const params = await searchParams;
  const feedback = getInviteFeedback(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/courses/team");

  const masterAdmin = isMasterAdminUser(user);
  if (masterAdmin) {
    await ensureMasterAdminWorkspace(user);
  }

  let metadata: ReturnType<typeof getPlanMetadataFromUser>;
  try {
    metadata = getPlanMetadataFromUser(user);
  } catch {
    redirect("/courses");
  }

  if (!masterAdmin) {
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

  const { data: subscriptionRow } = await supabase
    .from("billing_subscriptions")
    .select("workspace_name")
    .eq("subscription_id", metadata.subscriptionId)
    .maybeSingle();

  const workspaceLabel =
    subscriptionRow?.workspace_name?.trim() ||
    (typeof user.user_metadata?.workspace_name === "string"
      ? user.user_metadata.workspace_name.trim()
      : "") ||
    "";

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
        Courses live in one shared workspace for this subscription — removing a member frees their
        seat but keeps their courses available to the team.
      </p>
      {masterAdmin ? (
        <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100">
          Master admin workspace is on the <span className="font-semibold">Pro</span> plan (
          {metadata.authorsLimit} author seats) so you can invite co-authors to build sample
          courses.
        </p>
      ) : null}
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Subscription <span className="font-mono text-xs">{metadata.subscriptionId}</span> ·{" "}
        Plan <span className="font-medium">{metadata.planKey}</span> ·{" "}
        {used} / {metadata.authorsLimit} seats in use (including pending invites)
        {seatsRemaining > 0 ? ` · ${seatsRemaining} available` : " · none available"}
      </p>
      {feedback ? (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Company / workgroup
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This name appears on invites, your team courses list, and the admin dashboard.
        </p>
        <form action={updateWorkspaceName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label
              htmlFor="workspace_name"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name
            </label>
            <input
              id="workspace_name"
              name="workspace_name"
              type="text"
              required
              minLength={2}
              maxLength={WORKSPACE_NAME_MAX_LENGTH}
              defaultValue={workspaceLabel}
              autoComplete="organization"
              placeholder="e.g. Acme Learning Team"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invite a teammate</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter their email to send an invite (or copy a link from Pending invites if email is not
          configured yet).
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
          Backup links (if email delivery fails): new users use signup; existing users sign in first,
          then accept.
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pending invites</h2>
        <ul className="mt-4 space-y-3">
          {(invites ?? [])
            .filter((i) => i.status === "pending")
            .map((inv) => {
              const acceptUrl = `${getSiteUrl()}/team/accept/${inv.token}`;
              const signupUrl = `${getSiteUrl()}/signup?invite_token=${encodeURIComponent(inv.token)}`;
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
