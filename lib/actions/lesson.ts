"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function createLesson(courseId: string, title?: string) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { data: last } = await supabase
    .from("lessons")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;
  const label = title?.trim() || `Lesson ${sortOrder + 1}`;

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title: label,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return { error: "Could not create lesson." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { id: data.id };
}

export async function saveLessonTitle(
  courseId: string,
  lessonId: string,
  title: string,
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { error } = await supabase
    .from("lessons")
    .update({ title: title.trim() || "Untitled lesson" })
    .eq("id", lessonId)
    .eq("course_id", courseId);

  if (error) {
    console.error(error);
    return { error: "Could not save lesson." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}

export async function reorderLessons(
  courseId: string,
  orderedLessonIds: string[],
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { data: rows } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  const existing = new Set(rows?.map((r) => r.id) ?? []);
  if (
    orderedLessonIds.length !== existing.size ||
    orderedLessonIds.some((id) => !existing.has(id))
  ) {
    return { error: "Invalid lesson order." as const };
  }

  for (let i = 0; i < orderedLessonIds.length; i++) {
    const { error } = await supabase
      .from("lessons")
      .update({ sort_order: i })
      .eq("id", orderedLessonIds[i])
      .eq("course_id", courseId);
    if (error) {
      console.error(error);
      return { error: "Could not reorder lessons." as const };
    }
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("course_id", courseId);

  if (error) {
    console.error(error);
    return { error: "Could not delete lesson." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}
