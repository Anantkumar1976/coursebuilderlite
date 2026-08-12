import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  HEADER_PRODUCT_LABEL,
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
} from "@/lib/branding/site";
import { getSafeInternalPath } from "@/lib/navigation/safe-next";
import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

function getLoginErrorMessage(code: string | undefined) {
  if (code === "subscription-inactive") {
    return "Your subscription is inactive. Please reactivate it to continue.";
  }
  if (code === "team-invite-pending") {
    return "Your account exists, but you have not joined the team yet. Open the Accept (signed in) link from your invite email or ask your teammate to resend the invite.";
  }
  if (code === "email-link-expired") {
    return "That confirmation link is invalid or has expired. Sign in if you already confirmed, or ask your admin to resend the confirmation email from Supabase.";
  }
  if (code === "auth-callback") {
    return "That sign-in link is invalid or has expired. Request a new password reset link or sign in again.";
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const err = getLoginErrorMessage(params.error);
  const redirectNext = getSafeInternalPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(redirectNext);
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Use the email and password for your Supabase account.
          </p>
          {err ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {err}
            </p>
          ) : null}
          <div className="mt-8">
            <LoginForm redirectNext={params.next} />
          </div>
        </div>
      </main>
    </div>
  );
}
