"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseAttemptsLimit } from "@/lib/course-player/attempts";
import { parseNavigationFlow } from "@/lib/course-player/navigation-flow";
import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase
    .from("courses")
    .insert({ user_id: user.id, title })
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
  const customCss = (formData.get("custom_css") as string)?.trim() || null;

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("courses")
    .update({
      title,
      description,
      manifest_description: manifestDescription,
      locale,
      scorm_passing_score_percent: scormPassingScorePercent,
      estimated_duration_minutes: estimatedDurationMinutes,
      navigation_flow: navigationFlow,
      attempts_limit: attemptsLimit,
      assessment_attempts_limit: assessmentAttemptsLimit,
      custom_css: customCss,
    })
    .eq("id", courseId)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    redirect(`/courses/${courseId}?error=save-failed`);
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  redirect(`/courses/${courseId}?saved=1`);
}
