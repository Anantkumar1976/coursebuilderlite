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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Raw page row returned on delete so the builder can offer Undo. */
export type DeletedPageSnapshot = {
  id: string;
  lesson_id: string;
  title: string;
  content: Json;
  /** Index within the lesson at deletion time. */
  position: number;
};

async function assertCourseAccess(
  supabase: SupabaseServerClient,
  courseId: string,
) {
  return canAccessCourse(supabase, courseId);
}

async function lessonBelongsToCourse(
  supabase: SupabaseServerClient,
  courseId: string,
  lessonId: string,
) {
  const { data } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  return Boolean(data);
}

async function orderedLessonPageIds(
  supabase: SupabaseServerClient,
  courseId: string,
  lessonId: string,
) {
  const { data } = await supabase
    .from("pages")
    .select("id")
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => r.id);
}

/** Writes lesson_id + contiguous sort_order for every page in `pageIds`. */
async function writeLessonPageOrder(
  supabase: SupabaseServerClient,
  courseId: string,
  lessonId: string,
  pageIds: string[],
) {
  const results = await Promise.all(
    pageIds.map((id, i) =>
      supabase
        .from("pages")
        .update({ lesson_id: lessonId, sort_order: i })
        .eq("id", id)
        .eq("course_id", courseId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error(failed.error);
    return false;
  }
  return true;
}

function insertAfter(ids: string[], newId: string, afterId?: string | null) {
  const rest = ids.filter((id) => id !== newId);
  const at = afterId ? rest.indexOf(afterId) : -1;
  if (at === -1) return [...rest, newId];
  return [...rest.slice(0, at + 1), newId, ...rest.slice(at + 1)];
}

async function resolveLessonId(
  supabase: SupabaseServerClient,
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
  /** Insert directly below this page (same lesson); otherwise append. */
  afterPageId?: string | null,
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

  const existingIds = await orderedLessonPageIds(
    supabase,
    courseId,
    targetLessonId,
  );
  const sortOrder = existingIds.length;
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

  if (afterPageId && existingIds.includes(afterPageId)) {
    const ordered = insertAfter(existingIds, data.id, afterPageId);
    if (!(await writeLessonPageOrder(supabase, courseId, targetLessonId, ordered))) {
      return { error: "Page created, but it could not be positioned." as const };
    }
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { id: data.id, lessonId: targetLessonId };
}

export async function duplicatePage(courseId: string, pageId: string) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }

  const { data: source } = await supabase
    .from("pages")
    .select("id, lesson_id, title, content")
    .eq("id", pageId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!source) return { error: "Page not found." as const };

  const existingIds = await orderedLessonPageIds(
    supabase,
    courseId,
    source.lesson_id,
  );
  const { data, error } = await supabase
    .from("pages")
    .insert({
      course_id: courseId,
      lesson_id: source.lesson_id,
      title: `${source.title.trim() || "Untitled page"} (copy)`,
      sort_order: existingIds.length,
      content: source.content,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error(error);
    return { error: "Could not duplicate page." as const };
  }

  const ordered = insertAfter(existingIds, data.id, source.id);
  if (!(await writeLessonPageOrder(supabase, courseId, source.lesson_id, ordered))) {
    return { error: "Page duplicated, but it could not be positioned." as const };
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { id: data.id, lessonId: source.lesson_id };
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

/**
 * Persists page order for the given lessons. Pages listed under a lesson are
 * moved into it, so this handles both reordering and moving across lessons.
 */
export async function setLessonPageLayout(
  courseId: string,
  layout: { lessonId: string; pageIds: string[] }[],
) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }
  if (layout.length === 0) return { ok: true as const };

  const lessonIds = layout.map((l) => l.lessonId);
  const pageIds = layout.flatMap((l) => l.pageIds);
  if (new Set(pageIds).size !== pageIds.length) {
    return { error: "Invalid page order." as const };
  }

  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .in("id", lessonIds);
  if ((lessonRows ?? []).length !== new Set(lessonIds).size) {
    return { error: "Invalid lesson." as const };
  }

  // Every page currently in an affected lesson must still be placed somewhere,
  // and every listed page must belong to this course.
  const { data: currentRows } = await supabase
    .from("pages")
    .select("id")
    .eq("course_id", courseId)
    .in("lesson_id", lessonIds);
  const placed = new Set(pageIds);
  if ((currentRows ?? []).some((r) => !placed.has(r.id))) {
    return { error: "Invalid page order." as const };
  }
  if (pageIds.length > 0) {
    const { count } = await supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .in("id", pageIds);
    if (count !== pageIds.length) {
      return { error: "Invalid page order." as const };
    }
  }

  for (const lesson of layout) {
    if (!(await writeLessonPageOrder(supabase, courseId, lesson.lessonId, lesson.pageIds))) {
      return { error: "Could not save page order." as const };
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

  const { data: row } = await supabase
    .from("pages")
    .select("id, lesson_id, title, content")
    .eq("id", pageId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!row) return { error: "Page not found." as const };

  const siblingIds = await orderedLessonPageIds(supabase, courseId, row.lesson_id);

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
  const snapshot: DeletedPageSnapshot = {
    id: row.id,
    lesson_id: row.lesson_id,
    title: row.title,
    content: row.content,
    position: Math.max(0, siblingIds.indexOf(row.id)),
  };
  return { ok: true as const, snapshot };
}

export async function restorePage(courseId: string, snapshot: DeletedPageSnapshot) {
  const { supabase } = await requireUser();
  if (!(await assertCourseAccess(supabase, courseId))) {
    return { error: "Course not found." as const };
  }
  if (!(await lessonBelongsToCourse(supabase, courseId, snapshot.lesson_id))) {
    return { error: "The lesson for this page no longer exists." as const };
  }

  const existingIds = await orderedLessonPageIds(
    supabase,
    courseId,
    snapshot.lesson_id,
  );
  const { error } = await supabase.from("pages").insert({
    id: snapshot.id,
    course_id: courseId,
    lesson_id: snapshot.lesson_id,
    title: snapshot.title,
    sort_order: existingIds.length,
    content: snapshot.content,
  });
  if (error) {
    console.error(error);
    return { error: "Could not restore page." as const };
  }

  const at = Math.min(Math.max(0, snapshot.position), existingIds.length);
  const ordered = [...existingIds.slice(0, at), snapshot.id, ...existingIds.slice(at)];
  await writeLessonPageOrder(supabase, courseId, snapshot.lesson_id, ordered);

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}
