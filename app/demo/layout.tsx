import Image from "next/image";
import Link from "next/link";

import {
  HEADER_PRODUCT_LABEL,
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
} from "@/lib/branding/site";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
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
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 sm:inline dark:bg-amber-900/40 dark:text-amber-200">
              Sample course
            </span>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Build your own
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
