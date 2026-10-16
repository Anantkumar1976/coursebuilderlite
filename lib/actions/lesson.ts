"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { canAccessCourse } from "@/lib/workspace/access";

/** Lesson + its pages captured on delete so the builder can offer Undo. */
export type DeletedLessonSnapshot = {
  id: string;
  title: string;
  /** Index among the course's lessons at deletion time. */
  position: number;
  pages: { id: string; title: string; content: Json }[];
};

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

  const [{ data: lessonRows }, { data: pageRows }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("pages")
      .select("id, title, content")
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId)
      .order("sort_order", { ascending: true }),
  ]);
  const lessonList = lessonRows ?? [];
  const position = lessonList.findIndex((l) => l.id === lessonId);
  if (position === -1) return { error: "Lesson not found." as const };

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
  const snapshot: DeletedLessonSnapshot = {
    id: lessonId,
    title: lessonList[position].title,
    position,
    pages: pageRows ?? [],
  };
  return { ok: true as const, snapshot };
}

export async function restoreLesson(
  courseId: string,
  snapshot: DeletedLessonSnapshot,
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  const existingIds = (lessonRows ?? []).map((l) => l.id);

  const { error: lessonError } = await supabase.from("lessons").insert({
    id: snapshot.id,
    course_id: courseId,
    title: snapshot.title,
    sort_order: existingIds.length,
  });
  if (lessonError) {
    console.error(lessonError);
    return { error: "Could not restore lesson." as const };
  }

  if (snapshot.pages.length > 0) {
    const { error: pagesError } = await supabase.from("pages").insert(
      snapshot.pages.map((p, i) => ({
        id: p.id,
        course_id: courseId,
        lesson_id: snapshot.id,
        title: p.title,
        content: p.content,
        sort_order: i,
      })),
    );
    if (pagesError) {
      console.error(pagesError);
      return { error: "Lesson restored, but its pages could not be restored." as const };
    }
  }

  const at = Math.min(Math.max(0, snapshot.position), existingIds.length);
  const ordered = [...existingIds.slice(0, at), snapshot.id, ...existingIds.slice(at)];
  await Promise.all(
    ordered.map((id, i) =>
      supabase
        .from("lessons")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("course_id", courseId),
    ),
  );

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}
