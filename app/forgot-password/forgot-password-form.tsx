"use client";

import Link from "next/link";
import { useState } from "react";

import { getSiteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = (fd.get("email") as string)?.trim();

    if (!email) {
      setError("Enter your email address.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSubmittedEmail(email);
      setInfo(
        "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.",
      );
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Failed to fetch"
          ? "Could not reach the auth server. Check your connection and Supabase configuration."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          readOnly={submittedEmail !== null}
          defaultValue={submittedEmail ?? undefined}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 read-only:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:read-only:bg-zinc-900"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || submittedEmail !== null}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Sending link…" : submittedEmail ? "Email sent" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
