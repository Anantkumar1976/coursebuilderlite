"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultPageContent, type PageContentV1 } from "@/lib/page-builder";
import type { TemplateId } from "@/lib/page-builder/types";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

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

async function assertCourseOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function createPage(courseId: string, template: TemplateId) {
  const { supabase, user } = await requireUser();
  if (!(await assertCourseOwner(supabase, courseId, user.id))) {
    return { error: "Course not found." as const };
  }

  const { data: last } = await supabase
    .from("pages")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;
  const content = defaultPageContent(template) as unknown as Json;

  const label = template.replace(/_/g, " ");
  const { data, error } = await supabase
    .from("pages")
    .insert({
      course_id: courseId,
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
  const { supabase, user } = await requireUser();
  if (!(await assertCourseOwner(supabase, courseId, user.id))) {
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

export async function reorderPages(courseId: string, orderedPageIds: string[]) {
  const { supabase, user } = await requireUser();
  if (!(await assertCourseOwner(supabase, courseId, user.id))) {
    return { error: "Course not found." as const };
  }

  const { data: rows } = await supabase
    .from("pages")
    .select("id")
    .eq("course_id", courseId);

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
      .eq("course_id", courseId);
    if (error) {
      console.error(error);
      return { error: "Could not reorder pages." as const };
    }
  }

  revalidatePath(`/courses/${courseId}/builder`);
  return { ok: true as const };
}

export async function deletePage(courseId: string, pageId: string) {
  const { supabase, user } = await requireUser();
  if (!(await assertCourseOwner(supabase, courseId, user.id))) {
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
