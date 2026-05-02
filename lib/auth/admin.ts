import type { User } from "@supabase/supabase-js";

const DEFAULT_MASTER_ADMIN_EMAIL = "anant@abanyantree.com";

export function getMasterAdminEmail() {
  return (
    process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase() ??
    DEFAULT_MASTER_ADMIN_EMAIL
  );
}

export function isMasterAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return email.trim().toLowerCase() === getMasterAdminEmail();
}

export function isMasterAdminUser(user: User | null | undefined) {
  return isMasterAdminEmail(user?.email);
}
