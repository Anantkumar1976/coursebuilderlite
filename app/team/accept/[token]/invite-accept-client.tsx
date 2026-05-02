"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { acceptTeamInvite } from "@/lib/actions/team";

export function InviteAcceptClient({
  token,
  isLoggedIn,
  loginHref,
}: {
  token: string;
  isLoggedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || done) return;
    let cancelled = false;
    (async () => {
      try {
        await acceptTeamInvite(token);
        if (!cancelled) {
          setDone(true);
          router.push("/courses");
          router.refresh();
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not accept invite.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, token, done, router]);

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          Sign in with the email address that received the invite, then you&apos;ll join the team
          automatically.
        </p>
        <Link
          href={loginHref}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign in to accept
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-200" role="alert">
          {error}
        </p>
        <Link
          href="/courses"
          className="mt-4 inline-block text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
      Joining your team…
    </p>
  );
}
