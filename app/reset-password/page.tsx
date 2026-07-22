import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  HEADER_PRODUCT_LABEL,
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
} from "@/lib/branding/site";
import { createClient } from "@/lib/supabase/server";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=session");
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
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {user.email}. Enter your new password below.
          </p>
          <div className="mt-8">
            <ResetPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
