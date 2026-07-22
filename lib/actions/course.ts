"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  BillingEnforcementError,
  ensureAuthorSeatAvailable,
} from "@/lib/billing/enforcement";
import { isMasterAdminUser } from "@/lib/auth/admin";
import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import {
  parseNavigationFlow,
  type NavigationFlow,
} from "@/lib/course-player/navigation-flow";
import { createAdminClient, hasAdminSupabaseEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionIdFromUser } from "@/lib/workspace/access";

function isMissingColumnMessage(message: string, column: string): boolean {
  const m = message.toLowerCase();
  const c = column.toLowerCase();
  if (!m.includes(c)) return false;
  return (
    m.includes("could not find") ||
    m.includes("does not exist") ||
    m.includes("unknown column")
  );
}

export async function createCourse(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    redirect("/courses/new?error=missing-title");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  try {
    await ensureAuthorSeatAvailable(supabase, user);
  } catch (error) {
    if (
      error instanceof BillingEnforcementError &&
      error.code === "author-limit-reached"
    ) {
      redirect("/courses/new?error=author-limit");
    }
    console.error("[createCourse] billing-enforcement", error);
    redirect("/courses/new?error=billing-check-failed");
  }

  if (isMasterAdminUser(user)) {
    if (!hasAdminSupabaseEnv()) {
      redirect("/courses/new?error=admin-config");
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("courses")
      .insert({ user_id: user.id, subscription_id: null, title })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      redirect("/courses/new?error=create-failed");
    }
    revalidatePath("/courses");
    redirect(`/courses/${data.id}`);
  }

  const subscriptionId = getSubscriptionIdFromUser(user);
  if (!subscriptionId) {
    redirect("/courses/new?error=no-subscription");
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({ user_id: user.id, subscription_id: subscriptionId, title })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    redirect("/courses/new?error=create-failed");
  }

  revalidatePath("/courses");
  redirect(`/courses/${data.id}`);
}

export async function updateCourseSettings(courseId: string, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    redirect(`/courses/${courseId}?error=missing-title`);
  }

  const description = (formData.get("description") as string)?.trim() || null;
  const manifestDescription =
    (formData.get("manifest_description") as string)?.trim() || null;
  const locale = (formData.get("locale") as string)?.trim() || "en";

  const passingRaw = formData.get("scorm_passing_score_percent");
  let scormPassingScorePercent = 70;
  if (typeof passingRaw === "string" && passingRaw.trim() !== "") {
    const n = Number(passingRaw);
    if (!Number.isNaN(n)) {
      scormPassingScorePercent = Math.min(100, Math.max(0, Math.floor(n)));
    }
  }

  const durRaw = formData.get("estimated_duration_minutes");
  let estimatedDurationMinutes: number | null = null;
  if (typeof durRaw === "string" && durRaw.trim() !== "") {
    const n = Math.floor(Number(durRaw));
    if (!Number.isNaN(n) && n >= 0) {
      estimatedDurationMinutes = n;
    }
  }

  const navigationFlow = parseNavigationFlow(
    formData.get("navigation_flow"),
  );

  const attemptsMode =
    typeof formData.get("attempts_mode") === "string"
      ? (formData.get("attempts_mode") as string)
      : "unlimited";
  const attemptsLimit =
    attemptsMode === "count"
      ? parseAttemptsLimit(formData.get("attempts_limit"))
      : null;

  const assessmentAttemptsMode =
    typeof formData.get("assessment_attempts_mode") === "string"
      ? (formData.get("assessment_attempts_mode") as string)
      : "unlimited";
  const assessmentAttemptsLimit =
    assessmentAttemptsMode === "count"
      ? parseAttemptsLimit(formData.get("assessment_attempts_limit"))
      : null;

  // is_featured is admin-only; parse (tri-state so we can skip it for non-admins).
  const featuredRaw = formData.get("is_featured");
  const isFeaturedRequested =
    typeof featuredRaw === "string" ? featuredRaw === "on" : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const canToggleFeatured = isMasterAdminUser(user);

  const corePayload = {
    title,
    description,
    manifest_description: manifestDescription,
    locale,
    scorm_passing_score_percent: scormPassingScorePercent,
    estimated_duration_minutes: estimatedDurationMinutes,
  };

  const { data: coreRow, error: coreError } = await supabase
    .from("courses")
    .update(corePayload)
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (coreError) {
    console.error("[updateCourseSettings] core", courseId, {
      message: coreError.message,
      code: coreError.code,
      details: coreError.details,
      hint: coreError.hint,
    });
    redirect(
      `/courses/${courseId}?error=save-failed&e=${encodeURIComponent(coreError.message.slice(0, 400))}`,
    );
  }
  if (!coreRow?.id) {
    console.error("[updateCourseSettings] no row updated (core)", courseId);
    redirect(
      `/courses/${courseId}?error=save-failed&e=${encodeURIComponent("No row updated. You may not have access to this course.")}`,
    );
  }

  type PlayerPayload = {
    navigation_flow?: NavigationFlow;
    attempts_limit?: number | null;
    assessment_attempts_limit?: number | null;
    is_featured?: boolean;
  };

  const playerPayload: PlayerPayload = {
    navigation_flow: navigationFlow,
    attempts_limit: attemptsLimit,
    assessment_attempts_limit: assessmentAttemptsLimit,
  };
  if (canToggleFeatured && isFeaturedRequested !== null) {
    playerPayload.is_featured = isFeaturedRequested;
  }

  const maxStripAttempts = 8;
  for (let i = 0; i < maxStripAttempts; i += 1) {
    if (Object.keys(playerPayload).length === 0) break;

    const { data: row, error } = await supabase
      .from("courses")
      .update(playerPayload)
      .eq("id", courseId)
      .select("id")
      .maybeSingle();

    if (!error && row?.id) break;

    if (!error && !row?.id) {
      console.error("[updateCourseSettings] no row updated (player)", courseId);
      redirect(
        `/courses/${courseId}?error=save-failed&e=${encodeURIComponent("No row updated while saving navigation and attempts.")}`,
      );
    }

    if (error) {
      const msg = error.message ?? "";
      console.error("[updateCourseSettings] player", courseId, {
        message: msg,
        code: error.code,
        attempt: i,
        keys: Object.keys(playerPayload),
      });

      if (isMissingColumnMessage(msg, "assessment_attempts_limit")) {
        delete playerPayload.assessment_attempts_limit;
        continue;
      }
      if (isMissingColumnMessage(msg, "attempts_limit")) {
        delete playerPayload.attempts_limit;
        continue;
      }
      if (isMissingColumnMessage(msg, "navigation_flow")) {
        delete playerPayload.navigation_flow;
        continue;
      }
      if (isMissingColumnMessage(msg, "is_featured")) {
        delete playerPayload.is_featured;
        continue;
      }

      redirect(
        `/courses/${courseId}?error=save-failed&e=${encodeURIComponent(msg.slice(0, 400))}`,
      );
    }
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  redirect(`/courses/${courseId}?saved=1`);
}
