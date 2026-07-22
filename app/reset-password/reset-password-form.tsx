"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (!password) {
      setError("Enter a new password.");
      setPending(false);
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    const supabase = createClient();

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push("/courses");
      router.refresh();
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
        <label
          htmlFor="password"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirm"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Updating password…" : "Update password"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Link expired?{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Request a new one
        </Link>
      </p>
    </form>
  );
}
