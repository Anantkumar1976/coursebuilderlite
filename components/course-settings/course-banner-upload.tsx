"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { setCourseBannerAsset } from "@/lib/actions/course-appearance";
import { buildAssetStoragePath } from "@/lib/assets/storage-path";
import { createClient } from "@/lib/supabase/client";

type Props = {
  courseId: string;
  currentBannerAssetId: string | null;
  previewUrl: string | null;
};

export function CourseBannerUpload({
  courseId,
  currentBannerAssetId,
  previewUrl,
}: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(previewUrl);

  useEffect(() => {
    setLocalPreview(previewUrl);
  }, [previewUrl]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Banner must be an image.");
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Sign in.");
          return;
        }

        const assetId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `b-${Date.now()}`;
        const storagePath = buildAssetStoragePath(
          user.id,
          courseId,
          assetId,
          file.name,
        );

        const { error: upErr } = await supabase.storage
          .from("assets")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) {
          setError(upErr.message);
          return;
        }

        const { error: insErr } = await supabase.from("assets").insert({
          id: assetId,
          user_id: user.id,
          course_id: courseId,
          bucket: "assets",
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || null,
          bytes: file.size,
        });

        if (insErr) {
          await supabase.storage.from("assets").remove([storagePath]);
          setError(insErr.message);
          return;
        }

        const res = await setCourseBannerAsset(courseId, assetId);
        if (res && "error" in res) {
          setError("Could not attach banner.");
          return;
        }
        setLocalPreview(URL.createObjectURL(file));
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [courseId, router],
  );

  async function clearBanner() {
    setUploading(true);
    setError(null);
    try {
      const res = await setCourseBannerAsset(courseId, null);
      if (res && "error" in res) {
        setError("Could not remove banner.");
        return;
      }
      setLocalPreview(null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Course banner image
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Wide image for the course launch screen. Use at least 1200×400px for best
        results.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {uploading ? "Uploading…" : "Upload banner"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void handleFile(f);
            }}
          />
        </label>
        {currentBannerAssetId ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => void clearBanner()}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Remove banner
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {localPreview ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPreview}
            alt=""
            className="h-40 w-full object-cover sm:h-48"
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No banner yet.</p>
      )}
    </div>
  );
}
