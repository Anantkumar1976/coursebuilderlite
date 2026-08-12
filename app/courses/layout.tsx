import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/actions/auth";
import {
  BillingEnforcementError,
  syncAndValidateSubscriptionStatus,
} from "@/lib/billing/enforcement";
import { ensureMasterAdminWorkspace } from "@/lib/billing/master-admin-workspace";
import { isMasterAdminUser } from "@/lib/auth/admin";
import {
  HEADER_PRODUCT_LABEL,
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
} from "@/lib/branding/site";
import { createClient } from "@/lib/supabase/server";

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const masterAdmin = isMasterAdminUser(user);
  const hasSubscription =
    typeof user.user_metadata?.paypal_subscription_id === "string" &&
    user.user_metadata.paypal_subscription_id.length > 0;
  if (masterAdmin) {
    // Bootstrap the synthetic Pro workspace so Team invites + shared courses work.
    await ensureMasterAdminWorkspace(user);
  } else {
    try {
      await syncAndValidateSubscriptionStatus(supabase, user);
    } catch (error) {
      if (
        error instanceof BillingEnforcementError &&
        error.code === "subscription-inactive"
      ) {
        await supabase.auth.signOut();
        redirect("/login?error=subscription-inactive");
      }
      if (
        error instanceof BillingEnforcementError &&
        error.code === "team-invite-pending"
      ) {
        await supabase.auth.signOut();
        redirect("/login?error=team-invite-pending");
      }
      throw error;
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
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
              <span className="hidden truncate text-sm font-semibold tracking-tight sm:inline">
                {HEADER_PRODUCT_LABEL}
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link
                href="/courses"
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Courses
              </Link>
              {masterAdmin ? (
                <Link
                  href="/admin"
                  className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Admin
                </Link>
              ) : null}
              {masterAdmin || hasSubscription ? (
                <Link
                  href="/courses/team"
                  className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Team
                </Link>
              ) : null}
            </nav>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
