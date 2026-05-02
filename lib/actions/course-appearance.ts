"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseThemeColors,
  parseThemeFonts,
  themeColorsToJson,
  themeFontsToJson,
} from "@/lib/course-theme/theme";
import { createClient } from "@/lib/supabase/server";

async function requireOwnerCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!course) {
    redirect("/courses");
  }
  return { supabase, user };
}

export async function updateCourseAppearanceSettings(
  courseId: string,
  formData: FormData,
) {
  const { supabase } = await requireOwnerCourse(courseId);

  const fonts = parseThemeFonts({
    courseTitle: String(formData.get("font_course_title") ?? ""),
    pageTitle: String(formData.get("font_page_title") ?? ""),
    pageContent: String(formData.get("font_page_content") ?? ""),
    courseTitleSize: String(formData.get("font_size_course_title") ?? ""),
    pageTitleSize: String(formData.get("font_size_page_title") ?? ""),
    pageContentSize: String(formData.get("font_size_page_content") ?? ""),
  });
  const colors = parseThemeColors({
    button: String(formData.get("color_button") ?? ""),
    highlight: String(formData.get("color_highlight") ?? ""),
  });

  const customCss = (formData.get("custom_css") as string)?.trim() || null;

  const themeUpdate = {
    theme_fonts: themeFontsToJson(fonts),
    theme_colors: themeColorsToJson(colors),
  };

  let { error } = await supabase
    .from("courses")
    .update({ ...themeUpdate, custom_css: customCss })
    .eq("id", courseId);

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const looksLikeMissingCustomCss = msg.includes("custom_css");
    if (looksLikeMissingCustomCss) {
      const { error: err2 } = await supabase
        .from("courses")
        .update(themeUpdate)
        .eq("id", courseId);
      if (!err2) {
        console.warn(
          "[updateCourseAppearanceSettings] custom_css column missing; saved theme only. Apply migrations for custom CSS.",
        );
        error = null;
      } else {
        error = err2;
      }
    }
  }

  if (error) {
    console.error("[updateCourseAppearanceSettings]", courseId, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/courses/${courseId}?error=save-failed`);
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/play`);
  redirect(`/courses/${courseId}?saved=1`);
}

export async function setCourseBannerAsset(
  courseId: string,
  assetId: string | null,
) {
  const { supabase, user } = await requireOwnerCourse(courseId);

  if (assetId) {
    const { data: asset } = await supabase
      .from("assets")
      .select("id, course_id, user_id, mime_type")
      .eq("id", assetId)
      .maybeSingle();
    if (
      !asset ||
      asset.user_id !== user.id ||
      asset.course_id !== courseId ||
      !(asset.mime_type?.startsWith("image/") ?? false)
    ) {
      return { error: "invalid-banner" as const };
    }
  }

  const { error } = await supabase
    .from("courses")
    .update({ banner_asset_id: assetId })
    .eq("id", courseId);

  if (error) {
    console.error(error);
    return { error: "save-failed" as const };
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/play`);
  return { ok: true as const };
}

export async function addCourseReferenceMaterial(
  courseId: string,
  assetId: string,
  label: string,
) {
  const { supabase, user } = await requireOwnerCourse(courseId);

  const { data: asset } = await supabase
    .from("assets")
    .select("id, course_id, user_id")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset || asset.user_id !== user.id || asset.course_id !== courseId) {
    return { error: "invalid-asset" as const };
  }

  const { data: last } = await supabase
    .from("course_reference_materials")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("course_reference_materials").insert({
    course_id: courseId,
    asset_id: assetId,
    label: label.trim() || "Reference",
    sort_order: sortOrder,
  });

  if (error) {
    console.error(error);
    return { error: "insert-failed" as const };
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/play`);
  return { ok: true as const };
}

export async function deleteCourseReferenceMaterialAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  if (!courseId || !materialId) {
    redirect("/courses?error=bad-request");
  }

  const { supabase } = await requireOwnerCourse(courseId);

  const { error } = await supabase
    .from("course_reference_materials")
    .delete()
    .eq("id", materialId)
    .eq("course_id", courseId);

  if (error) {
    console.error(error);
    redirect(`/courses/${courseId}?error=save-failed`);
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/play`);
  redirect(`/courses/${courseId}?saved=1`);
}
