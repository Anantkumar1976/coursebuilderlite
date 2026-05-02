import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const SIGNED_URL_TTL_SEC = 60 * 60;

/** Signed GET URLs for preview (builder, player). RLS on `assets` limits rows to the current user. */
export async function getSignedUrlsForAssetIds(
  supabase: SupabaseClient<Database>,
  assetIds: string[],
): Promise<Record<string, string>> {
  if (assetIds.length === 0) return {};
  const { data, error } = await supabase
    .from("assets")
    .select("id, bucket, storage_path")
    .in("id", assetIds);
  if (error || !data?.length) return {};
  const out: Record<string, string> = {};
  for (const row of data) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(row.bucket)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);
    if (!signErr && signed?.signedUrl) {
      out[row.id] = signed.signedUrl;
    }
  }
  return out;
}
