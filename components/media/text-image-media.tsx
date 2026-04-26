"use client";

import { useCallback, useEffect, useState } from "react";

import { buildAssetStoragePath } from "@/lib/assets/storage-path";
import type { PageContentV1 } from "@/lib/page-builder";
import { createClient } from "@/lib/supabase/client";

export type CourseAssetLite = {
  id: string;
  filename: string;
  mime_type: string | null;
  bytes: number | null;
};

export type TextImageImageValue = {
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
};

type TextImage = Extract<PageContentV1, { template: "text_image" }>;

type Props = {
  courseId: string;
  content: TextImage;
  onChange: (next: TextImage) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: () => void;
};

/** Image upload / URL / alt — used for Text + Image template and per block in multi-block layouts. */
export function TextImageImagePanel({
  courseId,
  value,
  onChange,
  courseAssets,
  onAssetsUpdated,
  idPrefix = "ti",
}: {
  courseId: string;
  value: TextImageImageValue;
  onChange: (next: TextImageImageValue) => void;
  courseAssets: CourseAssetLite[];
  onAssetsUpdated: () => void;
  /** Unique prefix for form ids when multiple panels on the page. */
  idPrefix?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const assetId = value.imageAssetId;
    if (!assetId) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("assets")
        .select("bucket, storage_path")
        .eq("id", assetId)
        .maybeSingle();
      if (!row || cancelled) return;
      const { data: signed } = await supabase.storage
        .from(row.bucket)
        .createSignedUrl(row.storage_path, 3600);
      if (!cancelled && signed?.signedUrl) setPreviewUrl(signed.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.imageAssetId]);

  const displaySrc =
    value.imageAssetId && previewUrl
      ? previewUrl
      : value.imageUrl.trim() || null;

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setUploadError("Please choose an image file.");
        return;
      }
      setUploadError(null);
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUploadError("You must be signed in to upload.");
          return;
        }

        const assetId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `a-${Date.now()}`;

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
          setUploadError(upErr.message);
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
          setUploadError(insErr.message);
          return;
        }

        onChange({
          ...value,
          imageAssetId: assetId,
          imageUrl: "",
        });
        onAssetsUpdated();
      } finally {
        setUploading(false);
      }
    },
    [courseId, onChange, onAssetsUpdated, value],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className={labelClass()}>Image</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Upload a file to store it in your course (stable in preview and SCORM),
          or paste an external URL below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {uploading ? "Uploading…" : "Upload image"}
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
        {value.imageAssetId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() =>
              onChange({
                ...value,
                imageAssetId: null,
              })
            }
          >
            Clear uploaded image
          </button>
        ) : null}
      </div>

      {uploadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}

      {courseAssets.length > 0 ? (
        <div>
          <p className={labelClass()}>Or pick from this course</p>
          <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
            {courseAssets.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`rounded-md px-2 py-1.5 text-left text-sm ${
                  value.imageAssetId === a.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onClick={() =>
                  onChange({
                    ...value,
                    imageAssetId: a.id,
                    imageUrl: "",
                  })
                }
              >
                <span className="block truncate">{a.filename}</span>
                {a.bytes != null ? (
                  <span className="text-xs opacity-70">
                    {(a.bytes / 1024).toFixed(1)} KB
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label className={labelClass()} htmlFor={`${idPrefix}-url`}>
          External image URL (optional)
        </label>
        <input
          id={`${idPrefix}-url`}
          type="url"
          className={fieldClass()}
          value={value.imageUrl}
          onChange={(e) =>
            onChange({
              ...value,
              imageUrl: e.target.value,
              imageAssetId: e.target.value.trim()
                ? null
                : value.imageAssetId,
            })
          }
          placeholder="https://"
        />
      </div>

      <div>
        <label className={labelClass()} htmlFor={`${idPrefix}-alt`}>
          Alt text
        </label>
        <input
          id={`${idPrefix}-alt`}
          type="text"
          className={fieldClass()}
          value={value.imageAlt}
          onChange={(e) =>
            onChange({ ...value, imageAlt: e.target.value })
          }
          placeholder="Describe the image for accessibility"
        />
      </div>

      {displaySrc ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className={labelClass()}>Preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={value.imageAlt || ""}
            className="mt-2 max-h-64 w-full object-contain"
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No image selected yet.</p>
      )}
    </div>
  );
}

export function TextImageMedia({
  courseId,
  content,
  onChange,
  courseAssets,
  onAssetsUpdated,
}: Props) {
  return (
    <TextImageImagePanel
      courseId={courseId}
      value={{
        imageAssetId: content.imageAssetId,
        imageUrl: content.imageUrl,
        imageAlt: content.imageAlt,
      }}
      onChange={(v) => onChange({ ...content, ...v })}
      courseAssets={courseAssets}
      onAssetsUpdated={onAssetsUpdated}
    />
  );
}

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
}

function labelClass() {
  return "text-xs font-medium text-zinc-600 dark:text-zinc-400";
}
