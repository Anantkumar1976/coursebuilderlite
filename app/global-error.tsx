"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 font-sans text-neutral-900 antialiased">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-neutral-600 text-center max-w-md">
          We could not load this page. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
