import type { User } from "@supabase/supabase-js";

import { isMasterAdminUser } from "@/lib/auth/admin";
import { PAYPAL_PLAN_CONFIG } from "@/lib/paypal/subscriptions";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";

/** Stable synthetic subscription id for the master-admin Pro workspace (no PayPal). */
export const MASTER_ADMIN_SUBSCRIPTION_ID = "master-admin-workspace";

const PRO = PAYPAL_PLAN_CONFIG.pro;

export type MasterAdminPlanMetadata = {
  subscriptionId: string;
  planKey: "pro";
  authorsLimit: number;
  monthlyExportsLimit: number;
};

export function getMasterAdminPlanMetadata(): MasterAdminPlanMetadata {
  return {
    subscriptionId: MASTER_ADMIN_SUBSCRIPTION_ID,
    planKey: "pro",
    authorsLimit: PRO.authorsLimit,
    monthlyExportsLimit: PRO.monthlyExportsLimit,
  };
}

/**
 * Ensures the master admin has an active Pro-like internal subscription,
 * a membership seat, matching auth metadata, and that their existing
 * owner-only courses are attached to the shared workspace.
 *
 * Safe to call on every request; no-ops for non-admins or when the
 * service-role key is missing.
 */
export async function ensureMasterAdminWorkspace(user: User): Promise<void> {
  if (!isMasterAdminUser(user)) return;
  if (!hasAdminSupabaseEnv()) return;

  const admin = createAdminClient();
  const meta = getMasterAdminPlanMetadata();
  const now = new Date().toISOString();

  const { data: existingSub } = await admin
    .from("billing_subscriptions")
    .select("id, status")
    .eq("subscription_id", meta.subscriptionId)
    .maybeSingle();

  if (!existingSub?.id) {
    const { error } = await admin.from("billing_subscriptions").insert({
      user_id: user.id,
      subscription_id: meta.subscriptionId,
      provider: "internal",
      plan_key: meta.planKey,
      status: "active",
      activated_at: now,
    });
    if (error) {
      console.error("[ensureMasterAdminWorkspace] subscription insert", error);
      return;
    }
  } else if (existingSub.status !== "active") {
    const { error } = await admin
      .from("billing_subscriptions")
      .update({
        status: "active",
        user_id: user.id,
        plan_key: meta.planKey,
        provider: "internal",
        activated_at: now,
        cancelled_at: null,
      })
      .eq("id", existingSub.id);
    if (error) {
      console.error("[ensureMasterAdminWorkspace] subscription update", error);
    }
  }

  const { data: membership } = await admin
    .from("billing_subscription_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("subscription_id", meta.subscriptionId)
    .maybeSingle();

  if (!membership?.id) {
    const { error } = await admin
      .from("billing_subscription_memberships")
      .insert({
        user_id: user.id,
        subscription_id: meta.subscriptionId,
        plan_key: meta.planKey,
        authors_limit: meta.authorsLimit,
        monthly_exports_limit: meta.monthlyExportsLimit,
      });
    if (error) {
      console.error("[ensureMasterAdminWorkspace] membership insert", error);
    }
  }

  const raw = user.user_metadata ?? {};
  const needsMetaUpdate =
    raw.paypal_subscription_id !== meta.subscriptionId ||
    raw.subscription_plan !== meta.planKey ||
    String(raw.authors_limit) !== String(meta.authorsLimit) ||
    String(raw.monthly_exports_limit) !== String(meta.monthlyExportsLimit) ||
    raw.subscription_status !== "active";

  if (needsMetaUpdate) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...raw,
        paypal_subscription_id: meta.subscriptionId,
        subscription_plan: meta.planKey,
        authors_limit: meta.authorsLimit,
        monthly_exports_limit: meta.monthlyExportsLimit,
        subscription_status: "active",
      },
    });
    if (error) {
      console.error("[ensureMasterAdminWorkspace] metadata update", error);
    }
  }

  // Attach legacy admin courses (subscription_id null) to the shared workspace.
  const { error: backfillError } = await admin
    .from("courses")
    .update({ subscription_id: meta.subscriptionId })
    .eq("user_id", user.id)
    .is("subscription_id", null);
  if (backfillError) {
    console.error("[ensureMasterAdminWorkspace] course backfill", backfillError);
  }
}
