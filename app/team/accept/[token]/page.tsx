import Link from "next/link";

import { HEADER_PRODUCT_LABEL, PRODUCT_NAME } from "@/lib/branding/site";
import { createClient } from "@/lib/supabase/server";

import { InviteAcceptClient } from "./invite-accept-client";

export default async function AcceptTeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginNext = encodeURIComponent(`/team/accept/${token}`);
  const loginHref = `/login?next=${loginNext}`;

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            aria-label={PRODUCT_NAME}
          >
            {HEADER_PRODUCT_LABEL}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Team invite</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Accept your seat on the shared subscription.
        </p>
        <div className="mt-8">
          <InviteAcceptClient
            token={token}
            isLoggedIn={Boolean(user)}
            loginHref={loginHref}
          />
        </div>
      </main>
    </div>
  );
}
