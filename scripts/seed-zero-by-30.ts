/* eslint-disable no-console */
/**
 * Seed the "Zero by 30" sample course.
 *
 * - Owned by the master admin user (looked up by email).
 * - Marked as `is_featured = true` so it appears on the marketing site.
 * - Idempotent: existing "Zero by 30" course by this admin is deleted first.
 *
 * Run with:
 *   npx tsx scripts/seed-zero-by-30.ts
 *
 * Environment (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (required — bypasses RLS)
 *   MASTER_ADMIN_EMAIL=anant@abanyantree.com  (optional; falls back to the default)
 */

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { MASTER_ADMIN_SUBSCRIPTION_ID } from "@/lib/billing/master-admin-workspace";
import type { Database } from "@/lib/supabase/database.types";
import { COURSE_CONTENT, COURSE_META } from "./zero-by-30-content";

// Load .env.local (preferred) or .env
const envLocal = resolve(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocal) ? envLocal : resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = (
  process.env.MASTER_ADMIN_EMAIL ?? "anant@abanyantree.com"
).trim().toLowerCase();

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add both to .env.local before running this script.",
  );
  process.exit(1);
}

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAdminUserId(): Promise<string> {
  // Prefer admin.listUsers (avoid full scan by paging until we find the email).
  let page = 1;
  const perPage = 200;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.email?.trim().toLowerCase() === adminEmail,
    );
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  throw new Error(
    `Admin user "${adminEmail}" not found in Supabase auth.users. ` +
      "Sign in once at /login (or /signup) with that email before seeding.",
  );
}

async function deleteExistingCourse(userId: string, title: string) {
  const { data: existing, error } = await admin
    .from("courses")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title);
  if (error) throw error;
  for (const row of existing ?? []) {
    const { error: pagesErr } = await admin
      .from("pages")
      .delete()
      .eq("course_id", row.id);
    if (pagesErr) throw pagesErr;
    const { error: lessonsErr } = await admin
      .from("lessons")
      .delete()
      .eq("course_id", row.id);
    if (lessonsErr) throw lessonsErr;
    const { error: refsErr } = await admin
      .from("course_reference_materials")
      .delete()
      .eq("course_id", row.id);
    if (refsErr) throw refsErr;
    const { error: courseErr } = await admin
      .from("courses")
      .delete()
      .eq("id", row.id);
    if (courseErr) throw courseErr;
    console.log(`  ⤷ removed existing course ${row.id}`);
  }
}

async function main() {
  console.log(`Seeding "${COURSE_META.title}" as ${adminEmail}…`);
  const userId = await findAdminUserId();
  console.log(`  ⤷ admin user_id ${userId}`);

  await deleteExistingCourse(userId, COURSE_META.title);

  const { data: courseRow, error: courseError } = await admin
    .from("courses")
    .insert({
      user_id: userId,
      subscription_id: MASTER_ADMIN_SUBSCRIPTION_ID,
      title: COURSE_META.title,
      description: COURSE_META.description,
      manifest_description: COURSE_META.manifestDescription,
      locale: "en",
      status: "published",
      scorm_passing_score_percent: 70,
      estimated_duration_minutes: COURSE_META.estimatedDurationMinutes,
      navigation_flow: "open",
      attempts_limit: null,
      assessment_attempts_limit: null,
      is_featured: true,
    })
    .select("id")
    .single();

  if (courseError || !courseRow) {
    throw courseError ?? new Error("Could not create course row.");
  }
  const courseId = courseRow.id;
  console.log(`  ⤷ created course ${courseId}`);

  for (const [lessonIndex, lesson] of COURSE_CONTENT.entries()) {
    const { data: lessonRow, error: lessonError } = await admin
      .from("lessons")
      .insert({
        course_id: courseId,
        title: lesson.title,
        sort_order: (lessonIndex + 1) * 100,
      })
      .select("id")
      .single();
    if (lessonError || !lessonRow) {
      throw lessonError ?? new Error(`Could not insert lesson "${lesson.title}"`);
    }
    const lessonId = lessonRow.id;
    console.log(`  ⤷ lesson [${lessonIndex + 1}] ${lesson.title}`);

    for (const [pageIndex, page] of lesson.pages.entries()) {
      const { error: pageError } = await admin.from("pages").insert({
        course_id: courseId,
        lesson_id: lessonId,
        title: page.title,
        sort_order: (pageIndex + 1) * 100,
        content: page.content,
      });
      if (pageError) {
        throw pageError;
      }
      console.log(`    · page ${pageIndex + 1}: ${page.title}`);
    }
  }

  console.log("\nDone. Public share link:");
  const publicSite =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  console.log(`  ${publicSite}/demo/${courseId}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
