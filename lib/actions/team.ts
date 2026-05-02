"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { isMasterAdminUser } from "@/lib/auth/admin";
import {
  BillingEnforcementError,
  getPlanMetadataFromUser,
  syncAndValidateSubscriptionStatus,
} from "@/lib/billing/enforcement";
import { PAYPAL_PLAN_CONFIG, type PaypalPlanKey } from "@/lib/paypal/subscriptions";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function inviteExpiryIso() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
}

function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

async function assertCanManageSubscription(subscriptionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (isMasterAdminUser(user)) return { supabase, user };

  const metaSub =
    typeof user.user_metadata?.paypal_subscription_id === "string"
      ? user.user_metadata.paypal_subscription_id
      : null;
  if (metaSub === subscriptionId) {
    await syncAndValidateSubscriptionStatus(supabase, user);
    return { supabase, user };
  }

  const { data: membership } = await supabase
    .from("billing_subscription_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (!membership?.id) {
    throw new Error("You cannot manage invites for this subscription.");
  }
  await syncAndValidateSubscriptionStatus(supabase, user);
  return { supabase, user };
}

export async function createTeamInvite(formData: FormData) {
  const emailRaw = (formData.get("email") as string | null)?.trim();
  if (!emailRaw) throw new Error("Enter an email address.");
  const email = normalizeEmail(emailRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (isMasterAdminUser(user)) {
    throw new Error("Master admin uses the admin dashboard instead.");
  }

  let metadata;
  try {
    metadata = getPlanMetadataFromUser(user);
  } catch {
    throw new Error("Only subscribers can send team invites.");
  }
  await syncAndValidateSubscriptionStatus(supabase, user);

  if (normalizeEmail(user.email ?? "") === email) {
    throw new Error("You cannot invite your own email.");
  }

  const { count: memberCount, error: memberErr } = await supabase
    .from("billing_subscription_memberships")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", metadata.subscriptionId);
  if (memberErr) throw new Error(memberErr.message);

  const { count: pendingCount, error: pendingErr } = await supabase
    .from("billing_team_invites")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", metadata.subscriptionId)
    .eq("status", "pending");
  if (pendingErr) throw new Error(pendingErr.message);

  const used = (memberCount ?? 0) + (pendingCount ?? 0);
  if (used >= metadata.authorsLimit) {
    throw new Error(
      `No seats available (${metadata.authorsLimit} authors including pending invites).`,
    );
  }

  const planKey = metadata.planKey as PaypalPlanKey;
  if (!Object.hasOwn(PAYPAL_PLAN_CONFIG, planKey)) {
    throw new Error("Invalid plan on your account.");
  }

  const token = generateInviteToken();
  const { error } = await supabase.from("billing_team_invites").insert({
    subscription_id: metadata.subscriptionId,
    invited_by_user_id: user.id,
    email_normalized: email,
    token,
    status: "pending",
    plan_key: planKey,
    authors_limit: metadata.authorsLimit,
    monthly_exports_limit: metadata.monthlyExportsLimit,
    expires_at: inviteExpiryIso(),
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("An invite is already pending for that email.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/courses/team");
}

export async function revokeTeamInvite(formData: FormData) {
  const inviteId = (formData.get("invite_id") as string | null)?.trim();
  if (!inviteId) throw new Error("Missing invite.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: row, error: selErr } = await supabase
    .from("billing_team_invites")
    .select("id, subscription_id")
    .eq("id", inviteId)
    .maybeSingle();
  if (selErr || !row) throw new Error("Invite not found.");

  await assertCanManageSubscription(row.subscription_id);

  const { error } = await supabase
    .from("billing_team_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
  revalidatePath("/courses/team");
}

export async function removeTeamMember(formData: FormData) {
  const memberUserId = (formData.get("member_user_id") as string | null)?.trim();
  if (!memberUserId) throw new Error("Missing member.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (memberUserId === user.id) {
    throw new Error("You cannot remove yourself this way. Transfer ownership first (contact support).");
  }

  let metadata;
  try {
    metadata = getPlanMetadataFromUser(user);
  } catch {
    throw new Error("Only subscription members can remove teammates.");
  }
  await assertCanManageSubscription(metadata.subscriptionId);

  if (!hasAdminSupabaseEnv()) {
    throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY; cannot remove members.");
  }
  const admin = createAdminClient();

  const { data: target } = await admin.auth.admin.getUserById(memberUserId);
  const targetSub =
    typeof target.user?.user_metadata?.paypal_subscription_id === "string"
      ? target.user.user_metadata.paypal_subscription_id
      : null;
  if (targetSub !== metadata.subscriptionId) {
    throw new Error("That user is not on your subscription.");
  }

  await admin.from("billing_subscription_memberships").delete().eq("user_id", memberUserId);
  const prevMeta = target.user?.user_metadata ?? {};
  await admin.auth.admin.updateUserById(memberUserId, {
    user_metadata: {
      ...prevMeta,
      subscription_provider: null,
      subscription_plan: null,
      subscription_plan_label: null,
      subscription_price_monthly: null,
      authors_limit: null,
      monthly_exports_limit: null,
      paypal_subscription_id: null,
      subscription_status: null,
    },
  });
  revalidatePath("/courses/team");
}

export async function acceptTeamInvite(token: string) {
  const trimmed = token?.trim();
  if (!trimmed) throw new Error("Missing invite token.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("You must be signed in to accept an invite.");

  if (!hasAdminSupabaseEnv()) {
    throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY; cannot complete invite.");
  }
  const admin = createAdminClient();

  const { data: invite, error: invErr } = await admin
    .from("billing_team_invites")
    .select("*")
    .eq("token", trimmed)
    .maybeSingle();
  if (invErr || !invite) throw new Error("Invite not found.");
  if (invite.status === "accepted" && invite.accepted_user_id === user.id) {
    revalidatePath("/courses");
    return;
  }
  if (invite.status !== "pending") throw new Error("This invite is no longer valid.");
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("This invite has expired.");
  }

  if (normalizeEmail(user.email) !== normalizeEmail(invite.email_normalized)) {
    throw new Error("Sign in with the email address that received the invite.");
  }

  const { data: subRow } = await admin
    .from("billing_subscriptions")
    .select("status")
    .eq("subscription_id", invite.subscription_id)
    .maybeSingle();
  if (
    subRow?.status === "cancelled" ||
    subRow?.status === "suspended" ||
    subRow?.status === "expired"
  ) {
    throw new Error("This subscription is no longer active.");
  }

  const existingSub =
    typeof user.user_metadata?.paypal_subscription_id === "string"
      ? user.user_metadata.paypal_subscription_id
      : null;
  if (existingSub && existingSub !== invite.subscription_id) {
    throw new Error("Your account is already on a different subscription.");
  }

  const { count: memberCount, error: mcErr } = await admin
    .from("billing_subscription_memberships")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", invite.subscription_id);
  if (mcErr) throw new Error(mcErr.message);
  if ((memberCount ?? 0) >= invite.authors_limit) {
    throw new Error("This team has no free seats left.");
  }

  const planKey = invite.plan_key as PaypalPlanKey;
  const planCfg = Object.hasOwn(PAYPAL_PLAN_CONFIG, planKey)
    ? PAYPAL_PLAN_CONFIG[planKey]
    : null;
  const planLabel = planCfg?.label ?? invite.plan_key;
  const priceLabel = planCfg?.priceLabel ?? "";

  const prevMeta = user.user_metadata ?? {};
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...prevMeta,
      subscription_provider: "paypal",
      subscription_plan: invite.plan_key,
      subscription_plan_label: planLabel,
      subscription_price_monthly: priceLabel,
      authors_limit: invite.authors_limit,
      monthly_exports_limit: invite.monthly_exports_limit,
      paypal_subscription_id: invite.subscription_id,
      subscription_status: "active",
    },
  });

  const { data: existingMembership } = await admin
    .from("billing_subscription_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("subscription_id", invite.subscription_id)
    .maybeSingle();

  if (!existingMembership?.id) {
    const { error: memErr } = await admin.from("billing_subscription_memberships").insert({
      user_id: user.id,
      subscription_id: invite.subscription_id,
      plan_key: invite.plan_key,
      authors_limit: invite.authors_limit,
      monthly_exports_limit: invite.monthly_exports_limit,
    });
    if (memErr) throw new Error(memErr.message);
  }

  await admin
    .from("billing_team_invites")
    .update({
      status: "accepted",
      accepted_user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  revalidatePath("/courses");
  revalidatePath("/courses/team");
}
