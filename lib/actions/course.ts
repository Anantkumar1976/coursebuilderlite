"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
