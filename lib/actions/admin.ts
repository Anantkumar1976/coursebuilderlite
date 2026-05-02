"use server";

import { revalidatePath } from "next/cache";

import { isMasterAdminUser } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertMasterAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isMasterAdminUser(user)) {
    throw new Error("Forbidden");
  }
}

export async function adminDisableUser(formData: FormData) {
  await assertMasterAdmin();
  const userId = (formData.get("user_id") as string | null)?.trim();
  if (!userId) throw new Error("Missing user id.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function adminEnableUser(formData: FormData) {
  await assertMasterAdmin();
  const userId = (formData.get("user_id") as string | null)?.trim();
  if (!userId) throw new Error("Missing user id.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function adminDeleteUser(formData: FormData) {
  await assertMasterAdmin();
  const userId = (formData.get("user_id") as string | null)?.trim();
  if (!userId) throw new Error("Missing user id.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function adminSetSubscriptionStatus(formData: FormData) {
  await assertMasterAdmin();
  const subscriptionId = (formData.get("subscription_id") as string | null)?.trim();
  const status = (formData.get("status") as string | null)?.trim();
  if (!subscriptionId || !status) throw new Error("Missing subscription payload.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("billing_subscriptions")
    .update({ status, last_event_type: "ADMIN_OVERRIDE" })
    .eq("subscription_id", subscriptionId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function adminDeleteCourse(formData: FormData) {
  await assertMasterAdmin();
  const courseId = (formData.get("course_id") as string | null)?.trim();
  if (!courseId) throw new Error("Missing course id.");
  const admin = createAdminClient();
  const { error } = await admin.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
