import type { User } from "@supabase/supabase-js";

import { isMasterAdminUser } from "@/lib/auth/admin";
import { getMasterAdminPlanMetadata } from "@/lib/billing/master-admin-workspace";
import type { Database } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type UserPlanMetadata = {
  subscriptionId: string;
  planKey: string;
  authorsLimit: number;
  monthlyExportsLimit: number;
};

export class BillingEnforcementError extends Error {
  code:
    | "missing-plan-metadata"
    | "invalid-plan-metadata"
    | "subscription-inactive"
    | "author-limit-reached"
    | "export-limit-reached"
    | "enforcement-query-failed";

  constructor(
    code: BillingEnforcementError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

function readPositiveInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const int = Math.floor(n);
  return int >= 0 ? int : null;
}

export function getPlanMetadataFromUser(user: User): UserPlanMetadata {
  // Master admin always has a synthetic Pro workspace (no PayPal required).
  if (isMasterAdminUser(user)) {
    return getMasterAdminPlanMetadata();
  }

  const raw = user.user_metadata ?? {};
  const subscriptionId = raw.paypal_subscription_id;
  const planKey = raw.subscription_plan;
  const authorsLimit = readPositiveInt(raw.authors_limit);
  const monthlyExportsLimit = readPositiveInt(raw.monthly_exports_limit);

  if (typeof subscriptionId !== "string" || typeof planKey !== "string") {
    throw new BillingEnforcementError(
      "missing-plan-metadata",
      "Your subscription metadata is incomplete. Contact support.",
    );
  }
  if (authorsLimit === null || monthlyExportsLimit === null || authorsLimit < 1) {
    throw new BillingEnforcementError(
      "invalid-plan-metadata",
      "Your subscription limits are invalid. Contact support.",
    );
  }
  return {
    subscriptionId,
    planKey,
    authorsLimit,
    monthlyExportsLimit,
  };
}

export async function ensureAuthorSeatAvailable(
  supabase: SupabaseServerClient,
  user: User,
) {
  if (isMasterAdminUser(user)) {
    return;
  }
  await syncAndValidateSubscriptionStatus(supabase, user);
  const metadata = getPlanMetadataFromUser(user);
  const { data: ownMembership, error: ownMembershipError } = await supabase
    .from("billing_subscription_memberships")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (ownMembershipError) {
    throw new BillingEnforcementError(
      "enforcement-query-failed",
      ownMembershipError.message,
    );
  }
  if (ownMembership?.id) {
    return;
  }

  const { count, error: membersCountError } = await supabase
    .from("billing_subscription_memberships")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", metadata.subscriptionId);
  if (membersCountError) {
    throw new BillingEnforcementError(
      "enforcement-query-failed",
      membersCountError.message,
    );
  }
  if ((count ?? 0) >= metadata.authorsLimit) {
    throw new BillingEnforcementError(
      "author-limit-reached",
      `Author limit reached for this subscription (${metadata.authorsLimit}).`,
    );
  }

  const { error: insertError } = await supabase
    .from("billing_subscription_memberships")
    .insert({
      user_id: user.id,
      subscription_id: metadata.subscriptionId,
      plan_key: metadata.planKey,
      authors_limit: metadata.authorsLimit,
      monthly_exports_limit: metadata.monthlyExportsLimit,
    });
  if (insertError) {
    throw new BillingEnforcementError(
      "enforcement-query-failed",
      insertError.message,
    );
  }
}

export async function syncAndValidateSubscriptionStatus(
  supabase: SupabaseServerClient,
  user: User,
) {
  if (isMasterAdminUser(user)) {
    return;
  }
  const metadata = getPlanMetadataFromUser(user);
  const { data: row, error: selectError } = await supabase
    .from("billing_subscriptions")
    .select("id, user_id, status")
    .eq("subscription_id", metadata.subscriptionId)
    .maybeSingle();
  if (selectError) {
    throw new BillingEnforcementError(
      "enforcement-query-failed",
      selectError.message,
    );
  }

  if (!row?.id) {
    const statusFromMetadata =
      typeof user.user_metadata?.subscription_status === "string"
        ? user.user_metadata.subscription_status
        : "pending_activation";
    const { error: insertError } = await supabase
      .from("billing_subscriptions")
      .insert({
        user_id: user.id,
        subscription_id: metadata.subscriptionId,
        provider: "paypal",
        plan_key: metadata.planKey,
        status: statusFromMetadata,
      });
    if (insertError) {
      throw new BillingEnforcementError(
        "enforcement-query-failed",
        insertError.message,
      );
    }
    if (statusFromMetadata === "cancelled") {
      throw new BillingEnforcementError(
        "subscription-inactive",
        "Your subscription has been cancelled.",
      );
    }
    return;
  }

  if (!row.user_id) {
    const { error: claimError } = await supabase
      .from("billing_subscriptions")
      .update({ user_id: user.id })
      .eq("id", row.id);
    if (claimError) {
      throw new BillingEnforcementError(
        "enforcement-query-failed",
        claimError.message,
      );
    }
  }

  if (row.status === "cancelled" || row.status === "suspended" || row.status === "expired") {
    throw new BillingEnforcementError(
      "subscription-inactive",
      "Your subscription is inactive. Please renew to continue.",
    );
  }
}

function startOfMonthIso() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return start.toISOString();
}

export async function ensureMonthlyExportLimitAvailable(
  supabase: SupabaseServerClient,
  user: User,
) {
  if (isMasterAdminUser(user)) {
    return;
  }
  await syncAndValidateSubscriptionStatus(supabase, user);
  const metadata = getPlanMetadataFromUser(user);
  const { count, error } = await supabase
    .from("billing_export_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonthIso());
  if (error) {
    throw new BillingEnforcementError("enforcement-query-failed", error.message);
  }
  if ((count ?? 0) >= metadata.monthlyExportsLimit) {
    throw new BillingEnforcementError(
      "export-limit-reached",
      `Monthly export limit reached (${metadata.monthlyExportsLimit}).`,
    );
  }
}

export async function recordExportEvent(
  supabase: SupabaseServerClient,
  user: User,
  courseId: string,
  format: "scorm12" | "scorm2004" | "standalone",
) {
  if (isMasterAdminUser(user)) {
    return;
  }
  const metadata = getPlanMetadataFromUser(user);
  const payload: Database["public"]["Tables"]["billing_export_events"]["Insert"] = {
    user_id: user.id,
    course_id: courseId,
    subscription_id: metadata.subscriptionId,
    export_format: format,
  };
  const { error } = await supabase.from("billing_export_events").insert(payload);
  if (error) {
    throw new BillingEnforcementError("enforcement-query-failed", error.message);
  }
}
