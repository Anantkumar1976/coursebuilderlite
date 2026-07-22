"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultPageContent, type PageContentV1 } from "@/lib/page-builder";
import type {
  TemplateId,
  TextImageLayout,
  TextVideoLayout,
} from "@/lib/page-builder/types";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { canAccessCourse } from "@/lib/workspace/access";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

async function assertCourseAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
) {
  return canAccessCourse(supabase, courseId);
}

async function resolveLessonId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  preferredLessonId?: string,
): Promise<{ lessonId: string } | { error: string }> {
  if (preferredLessonId) {
    const { data } = await supabase
      .from("lessons")
      .select("id")
      .eq("id", preferredLessonId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (data) return { lessonId: data.id };
    return { error: "Invalid lesson." };
  }

  const { data: first } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (first) return { lessonId: first.id };

  const { data: created, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title: "Lesson 1",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error(error);
    return { error: "Could not create lesson." };
  }
  revalidatePath(`/courses/${courseId}/builder`);
  return { lessonId: created.id };
}

export async function createPage(
  courseId: string,
  template: TemplateId,
  lessonId?: string,
  /** When `template` is `text_image`, starts with this layout (e.g. column grids). */
  textImageLayout?: TextImageLayout,
  /** When `template` is `text_video`, starts with this layout (e.g. video only). */
  textVideoLayout?: TextVideoLayout,
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const resolved = await resolveLessonId(supabase, courseId, lessonId);
  if ("error" in resolved) {
    return {
      error:
        resolved.error === "Invalid lesson."
          ? ("Invalid lesson." as const)
          : ("Could not create lesson." as const),
    };
  }
  const targetLessonId = resolved.lessonId;

  const { data: last } = await supabase
    .from("pages")
    .select("sort_order")
    .eq("course_id", courseId)
    .eq("lesson_id", targetLessonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;
  const content = defaultPageContent(
    template,
    template === "text_image" && textImageLayout
      ? { textImageLayout }
      : template === "text_video" && textVideoLayout
        ? { textVideoLayout }
        : undefined,
  ) as unknown as Json;

  const label = template.replace(/_/g, " ");
  const { data, error } = await supabase
    .from("pages")
    .insert({
      course_id: courseId,
      lesson_id: targetLessonId,
      title: `New ${label}`,
      sort_order: sortOrder,
      content,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return { error: "Could not create page." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { id: data.id };
}

export async function savePage(
  courseId: string,
  pageId: string,
  payload: { title: string; content: PageContentV1 },
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const content = payload.content as unknown as Json;

  const { error } = await supabase
    .from("pages")
    .update({
      title: payload.title.trim() || "Untitled page",
      content,
    })
    .eq("id", pageId)
    .eq("course_id", courseId);

  if (error) {
    console.error(error);
    return { error: "Could not save page." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}

export async function reorderPages(
  courseId: string,
  lessonId: string,
  orderedPageIds: string[],
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { data: rows } = await supabase
    .from("pages")
    .select("id")
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId);

  const existing = new Set(rows?.map((r) => r.id) ?? []);
  if (
    orderedPageIds.length !== existing.size ||
    orderedPageIds.some((id) => !existing.has(id))
  ) {
    return { error: "Invalid page order." as const };
  }

  for (let i = 0; i < orderedPageIds.length; i++) {
    const { error } = await supabase
      .from("pages")
      .update({ sort_order: i })
      .eq("id", orderedPageIds[i])
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId);
    if (error) {
      console.error(error);
      return { error: "Could not reorder pages." as const };
    }
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}

export async function deletePage(courseId: string, pageId: string) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", pageId)
    .eq("course_id", courseId);

  if (error) {
    console.error(error);
    return { error: "Could not delete page." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}
