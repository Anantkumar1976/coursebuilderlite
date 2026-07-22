import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function tableExists(table) {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
  if (!error) return true;
  const msg = error.message ?? "";
  if (msg.includes("does not exist") || error.code === "42P01") return false;
  // RLS or other errors still mean the table exists
  return true;
}

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  const msg = error.message ?? "";
  if (msg.includes("does not exist") || msg.includes("Could not find")) return false;
  return true;
}

async function rpcExists(fn) {
  const { error } = await supabase.rpc(fn);
  if (!error) return true;
  const msg = error.message ?? "";
  if (msg.includes("Could not find the function") || msg.includes("does not exist")) {
    return false;
  }
  return true;
}

async function policyExists(table, policyName) {
  const { data, error } = await supabase
    .from("pg_policies")
    .select("policyname")
    .eq("schemaname", "public")
    .eq("tablename", table)
    .eq("policyname", policyName)
    .maybeSingle();
  if (error) {
    // pg_policies not exposed via REST — fall back to indirect checks
    return null;
  }
  return Boolean(data);
}

const migrations = [
  {
    file: "20260403180000_courses_pages_assets.sql",
    probe: async () =>
      (await tableExists("courses")) &&
      (await tableExists("pages")) &&
      (await tableExists("assets")),
  },
  {
    file: "20260403190000_storage_assets_bucket.sql",
    probe: async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) return null;
      return data.some((b) => b.id === "assets" || b.name === "assets");
    },
  },
  {
    file: "20260403200000_course_settings.sql",
    probe: async () =>
      (await columnExists("courses", "locale")) &&
      (await columnExists("courses", "scorm_passing_score_percent")),
  },
  {
    file: "20260404120000_course_player_theme.sql",
    probe: async () =>
      (await columnExists("courses", "theme_colors")) &&
      (await tableExists("course_reference_materials")),
  },
  {
    file: "20260405120000_lessons_hierarchy.sql",
    probe: async () =>
      (await tableExists("lessons")) && (await columnExists("pages", "lesson_id")),
  },
  {
    file: "20260406120000_course_navigation_flow.sql",
    probe: async () => columnExists("courses", "navigation_flow"),
  },
  {
    file: "20260407120000_course_attempts.sql",
    probe: async () => columnExists("courses", "attempts_limit"),
  },
  {
    file: "20260422120000_assessment_attempts_limit.sql",
    probe: async () => columnExists("courses", "assessment_attempts_limit"),
  },
  {
    file: "20260426193000_course_custom_css.sql",
    probe: async () => columnExists("courses", "custom_css"),
  },
  {
    file: "20260426220000_repair_navigation_flow_check.sql",
    probe: async () => {
      // Applied if navigation_flow exists (depends on 061) — distinguish via allowed value probe
      const { data, error } = await supabase
        .from("courses")
        .select("navigation_flow")
        .limit(1);
      return !error;
    },
  },
  {
    file: "20260427221000_contact_inquiries.sql",
    probe: async () => tableExists("contact_inquiries"),
  },
  {
    file: "20260429140000_billing_limits_enforcement.sql",
    probe: async () =>
      (await tableExists("billing_subscription_memberships")) &&
      (await tableExists("billing_export_events")),
  },
  {
    file: "20260429143000_billing_subscription_member_visibility.sql",
    probe: async () => rpcExists("current_user_subscription_ids"),
  },
  {
    file: "20260429150000_billing_subscriptions.sql",
    probe: async () => tableExists("billing_subscriptions"),
  },
  {
    file: "20260430120000_billing_team_invites.sql",
    probe: async () => tableExists("billing_team_invites"),
  },
  {
    file: "20260525120000_course_workspace_subscription.sql",
    probe: async () => {
      const hasColumn = await columnExists("courses", "subscription_id");
      const hasFn = await rpcExists("user_can_access_course");
      const workspacePolicy = await policyExists("courses", "courses_select_workspace");
      if (workspacePolicy === null) {
        return hasColumn && hasFn;
      }
      return hasColumn && hasFn && workspacePolicy;
    },
  },
];

const results = [];
for (const m of migrations) {
  const applied = await m.probe();
  results.push({ file: m.file, applied });
}

const applied = results.filter((r) => r.applied === true);
const missing = results.filter((r) => r.applied === false);
const unknown = results.filter((r) => r.applied === null);

console.log("Migration status (probed against live Supabase project):\n");
for (const r of results) {
  const status =
    r.applied === true ? "APPLIED" : r.applied === false ? "NOT APPLIED" : "UNKNOWN";
  console.log(`  [${status}] ${r.file}`);
}

console.log(`\nSummary: ${applied.length} applied, ${missing.length} not applied, ${unknown.length} unknown`);

if (missing.length > 0) {
  console.log("\nNot applied:");
  for (const r of missing) console.log(`  - ${r.file}`);
}

if (unknown.length > 0) {
  console.log("\nCould not verify (check Supabase Dashboard → Database → Migrations):");
  for (const r of unknown) console.log(`  - ${r.file}`);
}
