"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Supabase email links can land on Site URL with ?error= / #error= when a link
 * is expired. Send users to a clear login message instead of a broken home page.
 */
export function AuthRedirectError() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const error =
      params.get("error") ??
      hashParams.get("error") ??
      params.get("error_code") ??
      hashParams.get("error_code");
    const description =
      params.get("error_description") ??
      hashParams.get("error_description") ??
      "";

    if (!error) return;

    const expired =
      error === "access_denied" ||
      error === "otp_expired" ||
      description.toLowerCase().includes("expired") ||
      description.toLowerCase().includes("invalid");

    router.replace(
      expired ? "/login?error=email-link-expired" : "/login?error=auth-callback",
    );
  }, [router]);

  return null;
}
