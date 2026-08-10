import type { User } from "@supabase/supabase-js";

import { isMasterAdminUser } from "@/lib/auth/admin";
import { MASTER_ADMIN_SUBSCRIPTION_ID } from "@/lib/billing/master-admin-workspace";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** PayPal (or master-admin) subscription id for the signed-in user's team workspace. */
export function getSubscriptionIdFromUser(user: User): string | null {
  if (isMasterAdminUser(user)) {
    return MASTER_ADMIN_SUBSCRIPTION_ID;
  }
  const raw = user.user_metadata?.paypal_subscription_id;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return null;
}

/** True when RLS grants access to the course (workspace member or legacy owner). */
export async function canAccessCourse(
  supabase: SupabaseServerClient,
  courseId: string,
) {
  const { data } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();
  return !!data;
}
