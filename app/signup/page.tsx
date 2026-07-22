import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  HEADER_PRODUCT_LABEL,
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
} from "@/lib/branding/site";
import { hasAdminSupabaseEnv, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { SignupForm } from "./signup-form";

function isTeamInviteExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite_token?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = params.invite_token?.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/courses");
  }

  let invitePayload: {
    token: string;
    email_normalized: string;
    plan_key: string;
    authors_limit: number;
    monthly_exports_limit: number;
    subscription_id: string;
  } | null = null;
  let inviteError: string | null = null;

  if (inviteToken) {
    if (!hasAdminSupabaseEnv()) {
      inviteError =
        "Team signup requires SUPABASE_SERVICE_ROLE_KEY on the server. Ask your administrator.";
    } else {
      const admin = createAdminClient();
      const { data: inv, error } = await admin
        .from("billing_team_invites")
        .select(
          "token, email_normalized, plan_key, authors_limit, monthly_exports_limit, subscription_id, status, expires_at",
        )
        .eq("token", inviteToken)
        .maybeSingle();
      if (error || !inv) {
        inviteError = "Invite not found.";
      } else if (inv.status !== "pending") {
        inviteError = "This invite is no longer valid.";
      } else if (isTeamInviteExpired(inv.expires_at)) {
        inviteError = "This invite has expired.";
      } else {
        invitePayload = {
          token: inv.token,
          email_normalized: inv.email_normalized,
          plan_key: inv.plan_key,
          authors_limit: inv.authors_limit,
          monthly_exports_limit: inv.monthly_exports_limit,
          subscription_id: inv.subscription_id,
        };
      }
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-zinc-900 dark:text-zinc-50"
            aria-label={PRODUCT_NAME}
          >
            <Image
              src={PRODUCT_LOGO_SRC}
              alt=""
              width={120}
              height={32}
              className="h-7 w-auto shrink-0 object-contain object-left dark:brightness-[1.05]"
            />
            <span className="truncate text-sm font-semibold tracking-tight">
              {HEADER_PRODUCT_LABEL}
            </span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {invitePayload
              ? "You were invited to join a team. Create your account with the email that received the invite."
              : "Start your subscription with PayPal, then create your account."}
          </p>
          {inviteError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {inviteError}
            </p>
          ) : null}
          <div className="mt-8">
            <SignupForm invite={invitePayload} />
          </div>
        </div>
      </main>
    </div>
  );
}
